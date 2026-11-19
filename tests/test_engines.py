"""Tests for engine implementations."""

from pathlib import Path
import pytest

from src.engines.mock_engine import MockTranscriptionEngine
from src.engines.whisper_engine import FasterWhisperEngine
from src.models.schemas import TranscriptionOptions


def test_mock_engine(tmp_path: Path):
    sample = tmp_path / "test.wav"
    sample.write_bytes(b"RIFF" + b"\x00" * 100)

    engine = MockTranscriptionEngine()
    result = engine.transcribe(sample)

    assert result.model_name == "mock-engine"
    assert len(result.segments) == len(MockTranscriptionEngine.DEFAULT_MOCK_SEGMENTS)
    assert result.segments[0].start == 0.0
    assert result.segments[-1].end == 11.20
    assert "pipeline" in result.text


def test_whisper_engine_with_sample():
    sample_wav = Path("samples/spoken_sample.wav")
    if not sample_wav.exists():
        pytest.skip("Sample audio file samples/spoken_sample.wav not present")

    engine = FasterWhisperEngine(model_size="tiny", device="cpu", compute_type="int8")
    opts = TranscriptionOptions(word_timestamps=True)
    result = engine.transcribe(sample_wav, options=opts)

    assert result.language == "en"
    assert len(result.segments) > 0
    seg = result.segments[0]
    assert seg.start >= 0.0
    assert seg.end > seg.start
    assert "pipeline" in result.text.lower() or "speech" in result.text.lower()
    assert seg.words is not None and len(seg.words) > 0
