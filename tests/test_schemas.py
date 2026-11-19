"""Tests for Pydantic data models."""

from src.models.schemas import Segment, TranscriptionOptions, TranscriptionResult, Word


def test_word_model():
    word = Word(word="hello", start=0.0, end=0.5, probability=0.98)
    assert word.word == "hello"
    assert word.start == 0.0
    assert word.end == 0.5
    assert word.probability == 0.98


def test_segment_model():
    segment = Segment(
        id=1,
        start=0.0,
        end=2.5,
        text="Hello world",
        avg_logprob=-0.2,
        no_speech_prob=0.01,
    )
    assert segment.id == 1
    assert segment.text == "Hello world"
    assert segment.words is None


def test_transcription_result():
    seg1 = Segment(id=1, start=0.0, end=1.5, text="First segment")
    seg2 = Segment(id=2, start=1.5, end=3.0, text="Second segment")
    result = TranscriptionResult(
        text="First segment Second segment",
        segments=[seg1, seg2],
        language="en",
        language_probability=0.99,
        duration_seconds=3.0,
        processing_time_seconds=0.25,
        model_name="test-model",
    )

    assert len(result.segments) == 2
    assert result.duration_seconds == 3.0
    data = result.model_dump()
    assert data["language"] == "en"
    assert "created_at" in data
