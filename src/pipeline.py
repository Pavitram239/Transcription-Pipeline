"""Transcription Pipeline orchestrator."""

from pathlib import Path
from typing import Callable, List, Optional
import logging

from src.config import DEFAULT_CONFIG, PipelineConfig
from src.engines.base import BaseTranscriptionEngine
from src.engines.whisper_engine import FasterWhisperEngine
from src.models.schemas import TranscriptionOptions, TranscriptionResult
from src.exporters import ExportFormat, format_transcription

logger = logging.getLogger(__name__)


# Type alias for downstream post-processors
PostProcessorHook = Callable[[TranscriptionResult], TranscriptionResult]


class TranscriptionPipeline:
    """The core pipeline coordinating audio ingestion, validation, transcription,

    and downstream processing hooks.
    """

    def __init__(
        self,
        engine: Optional[BaseTranscriptionEngine] = None,
        config: Optional[PipelineConfig] = None,
    ):
        self.config = config or DEFAULT_CONFIG
        self.engine = engine or FasterWhisperEngine(
            model_size=self.config.model_size,
            device=self.config.device,
            compute_type=self.config.compute_type,
        )
        self._post_processors: List[PostProcessorHook] = []

    def register_post_processor(self, hook: PostProcessorHook) -> None:
        """Register a downstream hook/processor (e.g., punctuation fixing, redaction, summarizer)."""
        self._post_processors.append(hook)

    def validate_audio_file(self, audio_path: str | Path) -> Path:
        """Validate that the input audio file exists, is non-empty, and has a supported format."""
        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file does not exist: {path.resolve()}")

        if not path.is_file():
            raise ValueError(f"Path is not a regular file: {path.resolve()}")

        ext = path.suffix.lower()
        if ext not in self.config.supported_extensions:
            raise ValueError(
                f"Unsupported audio format '{ext}'. Supported formats: {sorted(self.config.supported_extensions)}"
            )

        file_size = path.stat().st_size
        if file_size == 0:
            raise ValueError(f"Audio file is empty (0 bytes): {path.resolve()}")

        max_bytes = self.config.max_file_size_mb * 1024 * 1024
        if file_size > max_bytes:
            raise ValueError(
                f"File size ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed size ({self.config.max_file_size_mb} MB)."
            )

        return path

    def process(
        self,
        audio_path: str | Path,
        options: Optional[TranscriptionOptions] = None,
    ) -> TranscriptionResult:
        """Ingest, validate, and transcribe an audio file into timestamped segments.

        Args:
            audio_path: Path to the audio file.
            options: Optional transcription overrides.

        Returns:
            TranscriptionResult with segment-level timestamps.
        """
        valid_path = self.validate_audio_file(audio_path)

        opts = options or TranscriptionOptions(
            language=self.config.language,
            vad_filter=self.config.vad_filter,
            word_timestamps=self.config.word_timestamps,
        )

        logger.info(f"Processing audio '{valid_path.name}' with engine '{self.engine.name}'...")
        result = self.engine.transcribe(valid_path, options=opts)

        # Execute registered downstream hooks
        for hook in self._post_processors:
            result = hook(result)

        return result

    def process_and_save(
        self,
        audio_path: str | Path,
        output_path: str | Path,
        fmt: ExportFormat = "json",
        options: Optional[TranscriptionOptions] = None,
    ) -> TranscriptionResult:
        """Process audio and write the formatted result to an output file."""
        result = self.process(audio_path, options=options)
        formatted_content = format_transcription(result, fmt)

        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(formatted_content, encoding="utf-8")
        logger.info(f"Saved transcription ({fmt}) to {out.resolve()}")
        return result

