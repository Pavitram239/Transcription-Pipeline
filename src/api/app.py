"""FastAPI service for audio transcription."""

import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from src.config import DEFAULT_CONFIG
from src.engines.mock_engine import MockTranscriptionEngine
from src.engines.whisper_engine import FasterWhisperEngine
from src.exporters import format_transcription
from src.models.schemas import HealthResponse, TranscriptionOptions, TranscriptionResult
from src.pipeline import TranscriptionPipeline

# Environment flag to toggle between mock and real whisper engine in API
USE_MOCK = os.getenv("TRANSCRIPTION_USE_MOCK", "false").lower() in ("true", "1", "yes")


def create_pipeline(mock: bool = USE_MOCK) -> TranscriptionPipeline:
    if mock:
        engine = MockTranscriptionEngine()
    else:
        engine = FasterWhisperEngine(
            model_size=DEFAULT_CONFIG.model_size,
            device=DEFAULT_CONFIG.device,
            compute_type=DEFAULT_CONFIG.compute_type,
        )
    return TranscriptionPipeline(engine=engine, config=DEFAULT_CONFIG)


app = FastAPI(
    title="Audio Transcription Pipeline Service",
    description="Microservice for ingesting audio files and returning timestamped transcriptions.",
    version="1.0.0",
)

# Store pipeline in app state
app.state.pipeline = create_pipeline()


def get_pipeline() -> TranscriptionPipeline:
    return app.state.pipeline


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/v1/health", response_model=HealthResponse, tags=["Health"])
def health_check(p: TranscriptionPipeline = Depends(get_pipeline)) -> HealthResponse:
    """Return service status, active engine, model name, and supported audio formats."""
    return HealthResponse(
        status="ok",
        engine=p.engine.name,
        model=p.engine.model_name,
        device=p.engine.device,
        supported_formats=sorted(DEFAULT_CONFIG.supported_extensions),
    )


@app.post(
    "/v1/transcribe",
    response_model=TranscriptionResult,
    tags=["Transcription"],
    summary="Transcribe uploaded audio file",
)
async def transcribe_audio_file(
    file: UploadFile = File(..., description="Audio file to transcribe (WAV, MP3, M4A, etc.)"),
    language: Optional[str] = Form(None, description="Spoken language code (e.g. 'en') or auto-detect if omitted"),
    vad_filter: bool = Form(True, description="Enable voice activity detection filtering"),
    word_timestamps: bool = Form(False, description="Include word-level timestamps"),
    export_format: Optional[str] = Form(None, description="Optional format: 'json', 'srt', 'vtt', 'txt'"),
    p: TranscriptionPipeline = Depends(get_pipeline),
):
    """Accepts an audio file upload, transcribes it, and returns the result with timestamps per segment."""
    filename = file.filename or "uploaded_audio"
    ext = Path(filename).suffix.lower()

    if ext not in DEFAULT_CONFIG.supported_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Allowed formats: {sorted(DEFAULT_CONFIG.supported_extensions)}",
        )

    temp_dir = tempfile.mkdtemp(prefix="transcription_")
    temp_audio_path = Path(temp_dir) / filename

    try:
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        options = TranscriptionOptions(
            language=language,
            vad_filter=vad_filter,
            word_timestamps=word_timestamps,
        )

        result = p.process(temp_audio_path, options=options)

        if export_format and export_format.lower() in ["srt", "vtt", "txt"]:
            formatted = format_transcription(result, export_format.lower())  # type: ignore
            media_type = "text/plain" if export_format.lower() == "txt" else "text/vtt"
            return PlainTextResponse(content=formatted, media_type=media_type)

        return result

    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}",
        )
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.post(
    "/v1/transcribe/path",
    response_model=TranscriptionResult,
    tags=["Transcription"],
    summary="Transcribe audio file from existing local filesystem path",
)
def transcribe_local_path(
    path: str = Form(..., description="Absolute or relative path to the local audio file"),
    language: Optional[str] = Form(None),
    vad_filter: bool = Form(True),
    word_timestamps: bool = Form(False),
    p: TranscriptionPipeline = Depends(get_pipeline),
):
    """Transcribes an audio file already existing on the server's storage."""
    try:
        options = TranscriptionOptions(
            language=language,
            vad_filter=vad_filter,
            word_timestamps=word_timestamps,
        )
        return p.process(path, options=options)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}",
        )
