"""Tests for FastAPI REST endpoints."""

import io
from pathlib import Path
from fastapi.testclient import TestClient

from src.api.app import app
from src.engines.mock_engine import MockTranscriptionEngine
from src.job_manager import TranscriptionJobManager
from src.pipeline import TranscriptionPipeline

# Use mock engine for testing
app.state.pipeline = TranscriptionPipeline(engine=MockTranscriptionEngine())
app.state.job_manager = TranscriptionJobManager(pipeline=app.state.pipeline)

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


def test_async_transcription_job_lifecycle():
    fake_audio = io.BytesIO(b"RIFF" + b"\x00" * 200)
    files = {"file": ("async_test.wav", fake_audio, "audio/wav")}

    # 1. Submit async job (HTTP 202 Accepted)
    response = client.post("/v1/transcriptions", files=files)
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["job_id"].startswith("tx_")
    assert data["status_url"] == f"/v1/transcriptions/{data['job_id']}"
    job_id = data["job_id"]

    # 2. Poll job status (completed by TestClient background runner)
    poll_resp = client.get(f"/v1/transcriptions/{job_id}")
    assert poll_resp.status_code == 200
    job_data = poll_resp.json()
    assert job_data["job_id"] == job_id
    assert job_data["status"] == "COMPLETED"
    assert job_data["progress_percent"] == 100
    assert job_data["result"] is not None
    assert len(job_data["result"]["segments"]) > 0

    # 3. Export formats
    export_srt = client.get(f"/v1/transcriptions/{job_id}/export?format=srt")
    assert export_srt.status_code == 200
    assert "-->" in export_srt.text

    export_json = client.get(f"/v1/transcriptions/{job_id}/export?format=json")
    assert export_json.status_code == 200
    assert "text" in export_json.json()

    # 4. List jobs
    list_resp = client.get("/v1/transcriptions")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    # 5. Delete job
    del_resp = client.delete(f"/v1/transcriptions/{job_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True

    # 6. Verify 404 after deletion
    after_resp = client.get(f"/v1/transcriptions/{job_id}")
    assert after_resp.status_code == 404


def test_async_transcription_path_job(tmp_path: Path):
    audio_file = tmp_path / "async_path_sample.wav"
    audio_file.write_bytes(b"RIFF" + b"\x00" * 150)

    response = client.post("/v1/transcriptions/path", data={"path": str(audio_file)})
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    poll_resp = client.get(f"/v1/transcriptions/{job_id}")
    assert poll_resp.status_code == 200
    assert poll_resp.json()["status"] == "COMPLETED"


def test_async_job_not_found():
    response = client.get("/v1/transcriptions/tx_nonexistent999")
    assert response.status_code == 404

