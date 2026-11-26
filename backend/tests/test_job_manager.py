"""Unit tests for the TranscriptionJobManager."""

from pathlib import Path

from src.engines.mock_engine import MockTranscriptionEngine
from src.job_manager import TranscriptionJobManager
from src.models.schemas import JobStatus, TranscriptionOptions
from src.pipeline import TranscriptionPipeline


def test_job_manager_lifecycle(tmp_path: Path):
    audio_file = tmp_path / "test_sample.wav"
    audio_file.write_bytes(b"RIFF" + b"\x00" * 100)

    pipeline = TranscriptionPipeline(engine=MockTranscriptionEngine())
    manager = TranscriptionJobManager(pipeline=pipeline)

    options = TranscriptionOptions(language="en", word_timestamps=True)
    submission = manager.submit_job(
        audio_path=audio_file,
        options=options,
        filename="test_sample.wav",
    )

    assert submission.job_id.startswith("tx_")
    assert submission.status == JobStatus.QUEUED

    # Execute the job synchronously
    manager.execute_job(submission.job_id)

    details = manager.get_job(submission.job_id)
    assert details is not None
    assert details.status == JobStatus.COMPLETED
    assert details.progress_percent == 100
    assert details.result is not None
    assert details.duration_seconds is not None
    assert details.processing_time_seconds is not None


def test_job_manager_cancellation(tmp_path: Path):
    audio_file = tmp_path / "test_sample.wav"
    audio_file.write_bytes(b"RIFF" + b"\x00" * 100)

    pipeline = TranscriptionPipeline(engine=MockTranscriptionEngine())
    manager = TranscriptionJobManager(pipeline=pipeline)

    submission = manager.submit_job(
        audio_path=audio_file,
        options=TranscriptionOptions(),
    )

    cancelled = manager.cancel_job(submission.job_id)
    assert cancelled is True

    details = manager.get_job(submission.job_id)
    assert details is not None
    assert details.status == JobStatus.CANCELLED

    # Executing a cancelled job should do nothing
    manager.execute_job(submission.job_id)
    details_after = manager.get_job(submission.job_id)
    assert details_after.status == JobStatus.CANCELLED


def test_job_manager_failure_handling(tmp_path: Path):
    # Non-existent file to trigger failure
    missing_path = tmp_path / "missing.wav"

    pipeline = TranscriptionPipeline(engine=MockTranscriptionEngine())
    manager = TranscriptionJobManager(pipeline=pipeline)

    submission = manager.submit_job(
        audio_path=missing_path,
        options=TranscriptionOptions(),
    )

    manager.execute_job(submission.job_id)

    details = manager.get_job(submission.job_id)
    assert details is not None
    assert details.status == JobStatus.FAILED
    assert details.error_message is not None
    assert "does not exist" in details.error_message


def test_job_manager_list_and_delete(tmp_path: Path):
    audio_file = tmp_path / "test_sample.wav"
    audio_file.write_bytes(b"RIFF" + b"\x00" * 100)

    pipeline = TranscriptionPipeline(engine=MockTranscriptionEngine())
    manager = TranscriptionJobManager(pipeline=pipeline)

    sub1 = manager.submit_job(audio_path=audio_file, options=TranscriptionOptions())
    sub2 = manager.submit_job(audio_path=audio_file, options=TranscriptionOptions())

    job_list = manager.list_jobs(limit=10)
    assert job_list.total == 2
    assert len(job_list.jobs) == 2

    # Delete job 1
    deleted = manager.delete_job(sub1.job_id)
    assert deleted is True
    assert manager.get_job(sub1.job_id) is None
    assert manager.get_job(sub2.job_id) is not None
