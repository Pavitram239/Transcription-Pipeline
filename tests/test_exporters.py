"""Tests for exporters (JSON, SRT, VTT, TXT)."""

import json
from src.exporters import (
    export_as_json,
    export_as_srt,
    export_as_txt,
    export_as_vtt,
    format_timestamp_srt,
    format_timestamp_vtt,
    format_transcription,
)
from src.models.schemas import Segment, TranscriptionResult


def _create_sample_result() -> TranscriptionResult:
    return TranscriptionResult(
        text="Hello world. Welcome to the transcription test.",
        segments=[
            Segment(id=1, start=1.234, end=3.456, text="Hello world."),
            Segment(id=2, start=3.5, end=6.8, text="Welcome to the transcription test."),
        ],
        language="en",
        language_probability=0.99,
        duration_seconds=6.8,
        processing_time_seconds=0.15,
        model_name="test-model",
    )


def test_timestamp_formatting():
    assert format_timestamp_srt(0.0) == "00:00:00,000"
    assert format_timestamp_srt(65.123) == "00:01:05,123"
    assert format_timestamp_srt(3661.050) == "01:01:01,050"

    assert format_timestamp_vtt(0.0) == "00:00:00.000"
    assert format_timestamp_vtt(65.123) == "00:01:05.123"


def test_export_as_srt():
    res = _create_sample_result()
    srt = export_as_srt(res)
    assert "1\n00:00:01,234 --> 00:00:03,456\nHello world." in srt
    assert "2\n00:00:03,500 --> 00:00:06,800\nWelcome to the transcription test." in srt


def test_export_as_vtt():
    res = _create_sample_result()
    vtt = export_as_vtt(res)
    assert vtt.startswith("WEBVTT\n")
    assert "00:00:01.234 --> 00:00:03.456" in vtt


def test_export_as_txt():
    res = _create_sample_result()
    txt = export_as_txt(res)
    assert txt == "Hello world. Welcome to the transcription test."


def test_export_as_json():
    res = _create_sample_result()
    json_str = export_as_json(res)
    parsed = json.loads(json_str)
    assert parsed["language"] == "en"
    assert len(parsed["segments"]) == 2


def test_format_transcription_dispatcher():
    res = _create_sample_result()
    assert format_transcription(res, "txt") == res.text
    assert "WEBVTT" in format_transcription(res, "vtt")
    assert "-->" in format_transcription(res, "srt")

