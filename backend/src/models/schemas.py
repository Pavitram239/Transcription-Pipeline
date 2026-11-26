"""Pydantic schemas for audio transcription inputs, segments, and outputs."""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """Execution status for asynchronous background transcription jobs."""

    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Word(BaseModel):
    """Word-level timestamp details."""

    word: str = Field(..., description="Transcribed word")
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    probability: float = Field(..., description="Word transcription confidence score (0.0 to 1.0)")


class Segment(BaseModel):
    """Segment-level transcription with timestamps."""

    id: int = Field(..., description="Sequential segment ID")
    start: float = Field(..., description="Segment start timestamp in seconds")
    end: float = Field(..., description="Segment end timestamp in seconds")
    text: str = Field(..., description="Transcribed text for this audio segment")
    words: Optional[List[Word]] = Field(
        default=None,
        description="Optional word-level timestamps within this segment",
    )
    avg_logprob: Optional[float] = Field(
        default=None,
        description="Average log probability of the generated tokens",
    )
    no_speech_prob: Optional[float] = Field(
        default=None,
        description="Probability that this segment contains no speech",
    )


class TranscriptionResult(BaseModel):
    """Complete transcription response for downstream processing."""

    text: str = Field(..., description="Full transcribed text concatenated across all segments")
    segments: List[Segment] = Field(
        default_factory=list,
        description="Timestamped audio segments",
    )
    language: Optional[str] = Field(
        default=None,
        description="Detected or specified spoken language code (e.g. 'en')",
    )
    language_probability: Optional[float] = Field(
        default=None,
        description="Confidence probability of language detection",
    )
    duration_seconds: float = Field(
        ...,
        description="Total duration of the audio input in seconds",
    )
    processing_time_seconds: float = Field(
        ...,
        description="Time taken to process and transcribe the audio in seconds",
    )
    model_name: str = Field(
        ...,
        description="Name of the model or engine used for transcription",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of when the transcription was performed",
    )


class TranscriptionOptions(BaseModel):
    """Options that can be passed to customize transcription behavior."""

    language: Optional[str] = Field(
        default=None,
        description="Target spoken language ISO code (e.g. 'en', 'es'). Auto-detects if None.",
    )
    vad_filter: bool = Field(
        default=True,
        description="Filter out non-speech using voice activity detection",
    )
    word_timestamps: bool = Field(
        default=False,
        description="Whether to include word-level timestamps",
    )
    initial_prompt: Optional[str] = Field(
        default=None,
        description="Optional prompt / context passed to Whisper to guide vocabulary/spelling",
    )


class HealthResponse(BaseModel):
    """System and engine health check response."""

    status: str = "ok"
    engine: str
    model: str
    device: str
    supported_formats: List[str]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TranscriptionJobSubmission(BaseModel):
    """Initial lightweight response returned when a background job is enqueued."""

    job_id: str = Field(..., description="Unique job identifier (e.g. tx_01a2b3c4)")
    status: JobStatus = Field(default=JobStatus.QUEUED, description="Current job status")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status_url: str = Field(..., description="API path to poll for job progress and status")
    filename: Optional[str] = Field(default=None, description="Original name of the ingested audio file")


class TranscriptionJobDetails(BaseModel):
    """Full detail and progress status of an asynchronous transcription job."""

    job_id: str
    status: JobStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress_percent: int = Field(default=0, ge=0, le=100)
    duration_seconds: Optional[float] = None
    processing_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    filename: Optional[str] = None
    result: Optional[TranscriptionResult] = None


class JobListResponse(BaseModel):
    """Paginated or listed array of background jobs."""

    total: int
    jobs: List[TranscriptionJobDetails]

