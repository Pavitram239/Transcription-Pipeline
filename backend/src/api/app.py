"""FastAPI service for audio transcription with synchronous and asynchronous endpoints."""

import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from src.config import DEFAULT_CONFIG
from src.engines.mock_engine import MockTranscriptionEngine
from src.engines.whisper_engine import FasterWhisperEngine
from src.exporters import format_transcription
from src.job_manager import TranscriptionJobManager
from src.models.schemas import (
    HealthResponse,
    JobListResponse,
    JobStatus,
    TranscriptionJobDetails,
    TranscriptionJobSubmission,
    TranscriptionOptions,
    TranscriptionResult,
)
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
    description="Microservice for ingesting audio files and returning timestamped transcriptions synchronously or asynchronously via background jobs.",
    version="1.1.0",
)

# Store pipeline and background job manager in app state
app.state.pipeline = create_pipeline()
app.state.job_manager = TranscriptionJobManager(pipeline=app.state.pipeline)


def get_pipeline() -> TranscriptionPipeline:
    return app.state.pipeline


def get_job_manager() -> TranscriptionJobManager:
    return app.state.job_manager


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


# ============================================================================
# Synchronous Endpoints (Part 1 baseline)
# ============================================================================


@app.post(
    "/v1/transcribe",
    response_model=TranscriptionResult,
    tags=["Synchronous Transcription"],
    summary="Transcribe uploaded audio file synchronously",
)
async def transcribe_audio_file(
    file: UploadFile = File(..., description="Audio file to transcribe (WAV, MP3, M4A, etc.)"),
    language: Optional[str] = Form(None, description="Spoken language code (e.g. 'en') or auto-detect if omitted"),
    vad_filter: bool = Form(True, description="Enable voice activity detection filtering"),
    word_timestamps: bool = Form(False, description="Include word-level timestamps"),
    export_format: Optional[str] = Form(None, description="Optional format: 'json', 'srt', 'vtt', 'txt'"),
    p: TranscriptionPipeline = Depends(get_pipeline),
):
    """Accepts an audio file upload, transcribes it synchronously, and returns the result."""
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
    tags=["Synchronous Transcription"],
    summary="Transcribe audio file from existing local filesystem path synchronously",
)
def transcribe_local_path(
    path: str = Form(..., description="Absolute or relative path to the local audio file"),
    language: Optional[str] = Form(None),
    vad_filter: bool = Form(True),
    word_timestamps: bool = Form(False),
    p: TranscriptionPipeline = Depends(get_pipeline),
):
    """Transcribes an audio file already existing on the server's storage synchronously."""
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


# ============================================================================
# Asynchronous Background Jobs API (/v1/transcriptions)
# ============================================================================


@app.post(
    "/v1/transcriptions",
    response_model=TranscriptionJobSubmission,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Async Jobs"],
    summary="Submit an audio file for asynchronous background transcription",
)
async def submit_transcription_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Audio file to transcribe asynchronously"),
    language: Optional[str] = Form(None, description="Spoken language code (e.g. 'en')"),
    vad_filter: bool = Form(True, description="Enable voice activity detection filtering"),
    word_timestamps: bool = Form(False, description="Include word-level timestamps"),
    initial_prompt: Optional[str] = Form(None, description="Optional vocabulary prompt for Whisper"),
    webhook_url: Optional[str] = Form(None, description="Optional URL to POST result upon completion"),
    jm: TranscriptionJobManager = Depends(get_job_manager),
) -> TranscriptionJobSubmission:
    """Ingests an uploaded audio file and queues it for background execution."""
    filename = file.filename or "uploaded_audio"
    ext = Path(filename).suffix.lower()

    if ext not in DEFAULT_CONFIG.supported_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Allowed formats: {sorted(DEFAULT_CONFIG.supported_extensions)}",
        )

    temp_dir = tempfile.mkdtemp(prefix="async_tx_")
    temp_audio_path = Path(temp_dir) / filename

    try:
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to buffer uploaded file: {e}",
        )

    options = TranscriptionOptions(
        language=language,
        vad_filter=vad_filter,
        word_timestamps=word_timestamps,
        initial_prompt=initial_prompt,
    )

    submission = jm.submit_job(
        audio_path=temp_audio_path,
        options=options,
        filename=filename,
        webhook_url=webhook_url,
        temp_dir=Path(temp_dir),
    )

    # Dispatch to background task runner
    background_tasks.add_task(jm.execute_job, submission.job_id)

    return submission


@app.post(
    "/v1/transcriptions/path",
    response_model=TranscriptionJobSubmission,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Async Jobs"],
    summary="Submit an existing server file path for background transcription",
)
def submit_transcription_path_job(
    background_tasks: BackgroundTasks,
    path: str = Form(..., description="Absolute or relative server filesystem path"),
    language: Optional[str] = Form(None),
    vad_filter: bool = Form(True),
    word_timestamps: bool = Form(False),
    initial_prompt: Optional[str] = Form(None),
    webhook_url: Optional[str] = Form(None),
    jm: TranscriptionJobManager = Depends(get_job_manager),
    p: TranscriptionPipeline = Depends(get_pipeline),
) -> TranscriptionJobSubmission:
    """Enqueues an existing server file for background transcription."""
    try:
        verified_path = p.validate_audio_file(path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    options = TranscriptionOptions(
        language=language,
        vad_filter=vad_filter,
        word_timestamps=word_timestamps,
        initial_prompt=initial_prompt,
    )

    submission = jm.submit_job(
        audio_path=verified_path,
        options=options,
        filename=verified_path.name,
        webhook_url=webhook_url,
        temp_dir=None,
    )

    background_tasks.add_task(jm.execute_job, submission.job_id)

    return submission


@app.get(
    "/v1/transcriptions/{job_id}",
    response_model=TranscriptionJobDetails,
    tags=["Async Jobs"],
    summary="Poll job status, progress, and results",
)
def get_job_status(
    job_id: str,
    jm: TranscriptionJobManager = Depends(get_job_manager),
) -> TranscriptionJobDetails:
    """Returns the current execution state, progress percentage, or completed transcription."""
    details = jm.get_job(job_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )
    return details


@app.get(
    "/v1/transcriptions/{job_id}/export",
    tags=["Async Jobs"],
    summary="Export completed transcription into SRT, VTT, TXT, or JSON format",
)
def export_job_result(
    job_id: str,
    format: str = Query("srt", description="Target export format ('srt', 'vtt', 'txt', 'json')"),
    jm: TranscriptionJobManager = Depends(get_job_manager),
):
    """Formats and returns the completed job's transcript."""
    details = jm.get_job(job_id)
    if not details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")

    if details.status != JobStatus.COMPLETED or not details.result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job is not completed yet (current status: {details.status}).",
        )

    fmt = format.lower()
    if fmt not in ["srt", "vtt", "txt", "json"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{format}'. Allowed: srt, vtt, txt, json",
        )

    if fmt == "json":
        return details.result

    formatted_content = format_transcription(details.result, fmt)  # type: ignore
    media_type = "text/plain" if fmt == "txt" else "text/vtt"
    return PlainTextResponse(content=formatted_content, media_type=media_type)


@app.get(
    "/v1/transcriptions",
    response_model=JobListResponse,
    tags=["Async Jobs"],
    summary="List recent transcription jobs",
)
def list_transcription_jobs(
    limit: int = Query(50, ge=1, le=200, description="Max jobs to return"),
    jm: TranscriptionJobManager = Depends(get_job_manager),
) -> JobListResponse:
    """Lists recent queued, processing, and completed background jobs."""
    return jm.list_jobs(limit=limit)


@app.delete(
    "/v1/transcriptions/{job_id}",
    tags=["Async Jobs"],
    summary="Cancel or delete a transcription job",
)
def delete_transcription_job(
    job_id: str,
    jm: TranscriptionJobManager = Depends(get_job_manager),
):
    """Cancels a pending job or removes a completed job record from memory."""
    details = jm.get_job(job_id)
    if not details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")

    # Try cancelling if still pending
    if details.status == JobStatus.QUEUED:
        jm.cancel_job(job_id)

    deleted = jm.delete_job(job_id)
    return {"job_id": job_id, "deleted": deleted, "status": details.status}
