"""Base transcription engine interface."""

from abc import ABC, abstractmethod
from pathlib import Path
from src.models.schemas import TranscriptionOptions, TranscriptionResult


class BaseTranscriptionEngine(ABC):
    """Abstract base class for all speech-to-text engines."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the engine."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Name or version of the underlying model."""
        pass

    @property
    @abstractmethod
    def device(self) -> str:
        """Device running the model ('cpu', 'cuda', etc.)."""
        pass

    @abstractmethod
    def transcribe(
        self,
        audio_path: str | Path,
        options: TranscriptionOptions | None = None,
    ) -> TranscriptionResult:
        """Transcribe an audio file into timestamped text segments.

        Args:
            audio_path: Path to the audio file on disk.
            options: Optional transcription parameters (language, vad, etc.).

        Returns:
            TranscriptionResult containing full text and timestamped segments.
        """
        pass

