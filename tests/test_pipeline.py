"""Tests for the transcription pipeline orchestrator and audio file validation."""

import pytest
from pathlib import Path

from src.config import PipelineConfig
from src.engines.mock_engine import MockTranscriptionEngine
from src.pipeline import TranscriptionPipeline
from src.models.schemas import TranscriptionOptions


@pytest.fixture
def mock_pipeline():
    engine = MockTranscriptionEngine()
    return TranscriptionPipeline(engine=engine)


@pytest.fixture
def dummy_wav(tmp_path: Path):
    audio_file = tmp_path / "valid.wav"
    audio_file.write_bytes(b"RIFF" + b"\x00" * 100)
    return audio_file


def test_pipeline_validation_missing_file(mock_pipeline):
    with pytest.raises(FileNotFoundError):
        mock_pipeline.validate_audio_file("non_existent_file_12345.wav")


def test_pipeline_validation_unsupported_format(mock_pipeline, tmp_path: Path):
    bad_file = tmp_path / "test.txt"
    bad_file.write_text("not audio")
    with pytest.raises(ValueError, match="Unsupported audio format"):
        mock_pipeline.validate_audio_file(bad_file)


def test_pipeline_validation_empty_file(mock_pipeline, tmp_path: Path):
    empty_file = tmp_path / "empty.wav"
    empty_file.write_bytes(b"")
    with pytest.raises(ValueError, match="Audio file is empty"):
        mock_pipeline.validate_audio_file(empty_file)


def test_pipeline_process_success(mock_pipeline, dummy_wav):
    result = mock_pipeline.process(dummy_wav)
    assert result is not None
    assert len(result.segments) > 0
    assert result.duration_seconds > 0
    assert result.segments[0].start < result.segments[0].end


def test_pipeline_process_with_word_timestamps(mock_pipeline, dummy_wav):
    options = TranscriptionOptions(word_timestamps=True)
    result = mock_pipeline.process(dummy_wav, options=options)
    assert result.segments[0].words is not None
    assert len(result.segments[0].words) > 0


def test_pipeline_post_processor_hook(mock_pipeline, dummy_wav):
    def uppercase_hook(res):
        res.text = res.text.upper()
        return res

    mock_pipeline.register_post_processor(uppercase_hook)
    result = mock_pipeline.process(dummy_wav)
    assert result.text.isupper()


def test_pipeline_process_and_save(mock_pipeline, dummy_wav, tmp_path: Path):
    out_file = tmp_path / "output.json"
    result = mock_pipeline.process_and_save(dummy_wav, out_file, fmt="json")
    assert out_file.exists()
    assert out_file.stat().st_size > 0
