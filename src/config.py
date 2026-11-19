"""Configuration settings for the Transcription Pipeline."""

import os
from pathlib import Path
from pydantic import BaseModel, Field


class PipelineConfig(BaseModel):
    """Runtime configuration for transcription engines and pipeline."""

    model_size: str = Field(
        default=os.getenv("TRANSCRIPTION_MODEL_SIZE", "base"),
        description="Whisper model size: tiny, base, small, medium, large-v3",
    )
    device: str = Field(
        default=os.getenv("TRANSCRIPTION_DEVICE", "cpu"),
        description="Inference device: cpu or cuda",
    )
    compute_type: str = Field(
        default=os.getenv("TRANSCRIPTION_COMPUTE_TYPE", "int8"),
        description="Quantization / compute type: int8, float16, float32, etc.",
    )
    language: str | None = Field(
        default=os.getenv("TRANSCRIPTION_DEFAULT_LANGUAGE", None),
        description="Language code (e.g. 'en', 'es', 'fr') or None for auto-detection",
    )
    vad_filter: bool = Field(
        default=True,
        description="Use Silero VAD to filter out non-speech segments",
    )
    word_timestamps: bool = Field(
        default=True,
        description="Compute word-level timestamps in addition to segment timestamps",
    )
    supported_extensions: set[str] = {
        ".wav",
        ".mp3",
        ".m4a",
        ".flac",
        ".ogg",
        ".wma",
        ".aac",
    }
    max_file_size_mb: int = 100


DEFAULT_CONFIG = PipelineConfig()
