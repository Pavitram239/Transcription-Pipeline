"""Thread-safe background job manager for asynchronous audio transcription tasks."""

import logging
import shutil
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import httpx

from src.models.schemas import (
    JobListResponse,
    JobStatus,
    TranscriptionJobDetails,
    TranscriptionJobSubmission,
    TranscriptionOptions,
    TranscriptionResult,
)
from src.pipeline import TranscriptionPipeline

logger = logging.getLogger(__name__)


class JobRecord:
    """Internal representation of a background transcription task."""

    def __init__(
        self,
        job_id: str,
        audio_path: Path,
        options: TranscriptionOptions,
        filename: Optional[str] = None,
        webhook_url: Optional[str] = None,
        temp_dir: Optional[Path] = None,
    ):
        self.job_id = job_id
        self.audio_path = audio_path
        self.options = options
        self.filename = filename or audio_path.name
        self.webhook_url = webhook_url
        self.temp_dir = temp_dir

        self.status = JobStatus.QUEUED
        self.created_at = datetime.now(timezone.utc)
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.progress_percent: int = 0
        self.duration_seconds: Optional[float] = None
        self.processing_time_seconds: Optional[float] = None
        self.error_message: Optional[str] = None
        self.result: Optional[TranscriptionResult] = None

    def to_details(self) -> TranscriptionJobDetails:
        return TranscriptionJobDetails(
            job_id=self.job_id,
            status=self.status,
            created_at=self.created_at,
            started_at=self.started_at,
            completed_at=self.completed_at,
            progress_percent=self.progress_percent,
            duration_seconds=self.duration_seconds,
            processing_time_seconds=self.processing_time_seconds,
            error_message=self.error_message,
            filename=self.filename,
            result=self.result,
        )


class TranscriptionJobManager:
    """Manages the lifecycle, execution, and retrieval of async transcription jobs."""

    def __init__(self, pipeline: TranscriptionPipeline):
        self._pipeline = pipeline
        self._jobs: Dict[str, JobRecord] = {}
        self._lock = threading.Lock()

    def submit_job(
        self,
        audio_path: Path,
        options: TranscriptionOptions,
        filename: Optional[str] = None,
        webhook_url: Optional[str] = None,
        temp_dir: Optional[Path] = None,
    ) -> TranscriptionJobSubmission:
        """Register a new job in the queue and return its submission ticket."""
        job_id = f"tx_{uuid.uuid4().hex[:12]}"
        record = JobRecord(
            job_id=job_id,
            audio_path=audio_path,
            options=options,
            filename=filename,
            webhook_url=webhook_url,
            temp_dir=temp_dir,
        )

        with self._lock:
            self._jobs[job_id] = record

        return TranscriptionJobSubmission(
            job_id=job_id,
            status=JobStatus.QUEUED,
            created_at=record.created_at,
            status_url=f"/v1/transcriptions/{job_id}",
            filename=record.filename,
        )

    def execute_job(self, job_id: str) -> None:
        """Worker execution function intended to run in a background thread."""
        with self._lock:
            record = self._jobs.get(job_id)
            if not record:
                logger.error(f"Job {job_id} not found for execution")
                return
            if record.status == JobStatus.CANCELLED:
                logger.info(f"Job {job_id} was cancelled before execution started")
                return
            record.status = JobStatus.PROCESSING
            record.started_at = datetime.now(timezone.utc)
            record.progress_percent = 20

        start_time = time.perf_counter()
        try:
            # Run the transcription pipeline
            with self._lock:
                record.progress_percent = 50

            result = self._pipeline.process(record.audio_path, options=record.options)

            elapsed = round(time.perf_counter() - start_time, 3)
            with self._lock:
                record.status = JobStatus.COMPLETED
                record.completed_at = datetime.now(timezone.utc)
                record.result = result
                record.duration_seconds = result.duration_seconds
                record.processing_time_seconds = elapsed
                record.progress_percent = 100

        except Exception as exc:
            elapsed = round(time.perf_counter() - start_time, 3)
            logger.exception(f"Job {job_id} failed during transcription: {exc}")
            with self._lock:
                record.status = JobStatus.FAILED
                record.completed_at = datetime.now(timezone.utc)
                record.error_message = str(exc)
                record.processing_time_seconds = elapsed

        finally:
            # Clean up temporary directory if created specifically for this job
            if record.temp_dir and record.temp_dir.exists():
                try:
                    shutil.rmtree(record.temp_dir, ignore_errors=True)
                except Exception as clean_err:
                    logger.warning(f"Failed to clean temp dir for job {job_id}: {clean_err}")

            # Send webhook notification if configured
            if record.webhook_url:
                self._dispatch_webhook(record)

    def _dispatch_webhook(self, record: JobRecord) -> None:
        """Send HTTP POST payload to the requested webhook URL."""
        if not record.webhook_url:
            return
        payload = record.to_details().model_dump(mode="json")
        try:
            with httpx.Client(timeout=5.0) as client:
                client.post(record.webhook_url, json=payload)
        except Exception as e:
            logger.warning(f"Webhook dispatch failed for job {record.job_id} to {record.webhook_url}: {e}")

    def get_job(self, job_id: str) -> Optional[TranscriptionJobDetails]:
        """Fetch status and result of a specific job."""
        with self._lock:
            record = self._jobs.get(job_id)
            if not record:
                return None
            return record.to_details()

    def list_jobs(self, limit: int = 50) -> JobListResponse:
        """List recent jobs ordered from newest to oldest."""
        with self._lock:
            records = list(self._jobs.values())
        records.sort(key=lambda r: r.created_at, reverse=True)
        jobs_slice = [r.to_details() for r in records[:limit]]
        return JobListResponse(total=len(records), jobs=jobs_slice)

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending job if it has not yet completed."""
        with self._lock:
            record = self._jobs.get(job_id)
            if not record:
                return False
            if record.status in (JobStatus.COMPLETED, JobStatus.FAILED):
                return False
            record.status = JobStatus.CANCELLED
            record.completed_at = datetime.now(timezone.utc)
            return True

    def delete_job(self, job_id: str) -> bool:
        """Remove a job from history and free memory."""
        with self._lock:
            if job_id in self._jobs:
                del self._jobs[job_id]
                return True
            return False
