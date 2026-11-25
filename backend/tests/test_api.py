"""Tests for FastAPI REST endpoints."""

import io
from pathlib import Path
from fastapi.testclient import TestClient

from src.api.app import app
from src.engines.mock_engine import MockTranscriptionEngine
from src.pipeline import TranscriptionPipeline

# Use mock engine for testing
app.state.pipeline = TranscriptionPipeline(engine=MockTranscriptionEngine())

client = TestClient(app)


def test_health_check_endpoint():
    response = client.get("/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "MockTranscriptionEngine" in data["engine"]
    assert ".wav" in data["supported_formats"]


def test_transcribe_file_endpoint():
    fake_audio = io.BytesIO(b"RIFF" + b"\x00" * 200)
    files = {"file": ("test.wav", fake_audio, "audio/wav")}
    response = client.post("/v1/transcribe", files=files)

    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "segments" in data
    assert len(data["segments"]) > 0
    assert "start" in data["segments"][0]
    assert "end" in data["segments"][0]


def test_transcribe_unsupported_file_format():
    fake_doc = io.BytesIO(b"Hello world")
    files = {"file": ("document.pdf", fake_doc, "application/pdf")}
    response = client.post("/v1/transcribe", files=files)
    assert response.status_code == 400
    assert "Unsupported format" in response.json()["detail"]


def test_transcribe_with_srt_export():
    fake_audio = io.BytesIO(b"RIFF" + b"\x00" * 200)
    files = {"file": ("test.wav", fake_audio, "audio/wav")}
    data = {"export_format": "srt"}
    response = client.post("/v1/transcribe", files=files, data=data)

    assert response.status_code == 200
    assert "-->" in response.text
    assert "00:00:00" in response.text


def test_transcribe_local_path_endpoint(tmp_path: Path):
    audio_file = tmp_path / "sample.mp3"
    audio_file.write_bytes(b"ID3" + b"\x00" * 100)

    response = client.post("/v1/transcribe/path", data={"path": str(audio_file)})
    assert response.status_code == 200
    data = response.json()
    assert len(data["segments"]) > 0


def test_transcribe_local_path_not_found():
    response = client.post("/v1/transcribe/path", data={"path": "non_existent_audio_file.wav"})
    assert response.status_code == 404
