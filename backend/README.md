# Audio Transcription Pipeline — Backend Service

A robust speech-to-text backend powered by **Faster-Whisper (CTranslate2)** and **FastAPI**, featuring Silero VAD filtering, segment and word timestamps, and multi-format export capabilities.

---

## 📁 Directory Structure

```
backend/
├── .venv/                      # Python virtual environment
├── src/
│   ├── api/
│   │   ├── __init__.py
│   │   └── app.py              # FastAPI microservice with /v1/transcribe & /v1/health
│   ├── engines/
│   │   ├── base.py             # Abstract BaseTranscriptionEngine
│   │   ├── whisper_engine.py   # faster-whisper CTranslate2 implementation
│   │   └── mock_engine.py      # Deterministic mock engine for tests
│   ├── models/
│   │   └── schemas.py          # Pydantic data schemas (Segment, Word, TranscriptionResult)
│   ├── config.py               # Pipeline configuration
│   ├── pipeline.py             # Validation, decoding & execution orchestrator
│   ├── exporters.py            # SRT, VTT, TXT, JSON formatters
│   └── cli.py                  # CLI entry point
├── tests/                      # Unit & integration test suites
├── samples/                    # Sample audio files & test outputs
├── scripts/                    # Helper & PDF generation scripts
└── requirements.txt            # Python dependencies
```

---

## 🚀 Setup & Execution

### 1. Activate the Virtual Environment
From inside `backend/`:

**Windows (PowerShell):**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
cd backend
.venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
cd backend
source .venv/bin/activate
```

*(Or to recreate a new environment: `python -m venv .venv` followed by `pip install -r requirements.txt`)*

---

### 2. Run the FastAPI REST API Server
```bash
# Optional: Set mock engine for instant dry runs without heavy model downloads
# set TRANSCRIPTION_USE_MOCK=true

uvicorn src.api.app:app --reload --host 127.0.0.1 --port 8000
```
- Interactive Swagger API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/v1/health`
- Transcribe audio: `POST http://localhost:8000/v1/transcribe`

---

### 3. Run the CLI
```bash
python src/cli.py --input samples/spoken_sample.wav --format srt --output transcript.srt
```

---

### 4. Run Unit Tests
```bash
python -m pytest tests/
```
