# Audio Transcription Pipeline

A modular, production-ready speech-to-text pipeline designed to ingest audio files (WAV, MP3, M4A, FLAC, OGG, etc.), transcribe spoken language into text with segment-level and word-level timestamps, and format the output for downstream processing.

---

## 🏗️ Architecture & Engineering Decisions

### 1. Engine Selection: `faster-whisper` (CTranslate2)
- **Why not standard OpenAI Whisper or HuggingFace Transformers?**
  - **Speed & Latency**: `faster-whisper` is up to **4x faster** than OpenAI's standard implementation for the same accuracy.
  - **Efficiency & Memory Footprint**: Uses `CTranslate2`'s custom INT8 and FP16 quantization on both CPU and GPU, using ~50% less RAM/VRAM.
  - **No Host `ffmpeg` Binary Fragility**: Decodes audio streams directly via `PyAV` (libav bindings), avoiding host path dependencies or failed subprocess calls on Windows/Docker containers.
  - **Built-in VAD (Voice Activity Detection)**: Integrates Silero VAD to eliminate silence hallucinations and reduce hallucinated tokens during pauses.

### 2. Pluggable Architecture & Dependency Inversion
- Abstracted via `BaseTranscriptionEngine`:
  - `FasterWhisperEngine`: Concrete engine for local CPU/GPU speech-to-text.
  - `MockTranscriptionEngine`: Fast, deterministic engine for zero-download CI/CD pipelines, unit tests, and simulating long audio transcripts.
  - *Future cloud engines* (Deepgram, AssemblyAI, OpenAI Whisper API) can be slotted in with zero changes to the pipeline or API layer.

### 3. Strong Data Contracts (Pydantic v2)
- Returns structured `TranscriptionResult`:
  - `text`: Concatenated full-text transcription.
  - `segments`: List of `Segment` models, each containing `id`, `start`, `end`, `text`, token probability `avg_logprob`, and `no_speech_prob`.
  - `words`: Optional word-level timestamps (`word`, `start`, `end`, `probability`).
  - Metadata: `language`, `language_probability`, `duration_seconds`, `processing_time_seconds`, `model_name`.

### 4. Dual Delivery: CLI + REST Microservice
- **CLI (`python -m src.cli`)**: For batch processing, terminal pipelines, and offline workflows.
- **REST API (`FastAPI`)**: Production-ready microservice with automatic OpenAPI / Swagger documentation (`/docs`), health checks (`/v1/health`), and streaming audio upload support (`/v1/transcribe`).

### 5. Multi-Format Exporters for Downstream Use
- `JSON`: Complete structured payload with segment and word timestamps.
- `SRT`: SubRip subtitles with precise millisecond timestamps (`00:00:01,234 --> 00:00:03,456`).
- `VTT`: WebVTT format for HTML5 `<track>` video players.
- `TXT`: Clean plaintext for immediate NLP/LLM downstream tasks (summarization, sentiment, RAG embeddings).

### 6. Pipeline Hook System (Downstream Readiness)
- `TranscriptionPipeline.register_post_processor(hook)` allows attaching custom downstream transformations (e.g., PII redaction, entity extraction, text normalization) directly into the execution flow.

---

## 📁 Project Structure

```
Transcription Pipeline/
├── src/
│   ├── api/
│   │   ├── __init__.py
│   │   └── app.py              # FastAPI microservice
│   ├── engines/
│   │   ├── __init__.py
│   │   ├── base.py             # Engine abstract base class
│   │   ├── whisper_engine.py   # faster-whisper CTranslate2 engine
│   │   └── mock_engine.py      # Deterministic mock engine for tests
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py          # Pydantic schemas (Segment, Word, TranscriptionResult)
│   ├── config.py               # Runtime pipeline settings
│   ├── exporters.py            # JSON, SRT, VTT, TXT exporters
│   ├── pipeline.py             # Core pipeline orchestrator & audio validator
│   └── cli.py                  # Command-line interface
├── tests/
│   ├── test_schemas.py         # Schema validation tests
│   ├── test_exporters.py       # Exporter and timestamp formatting tests
│   ├── test_pipeline.py        # Audio validation & pipeline orchestration tests
│   ├── test_api.py             # REST API endpoint tests
│   └── test_engines.py         # Engine unit and integration tests
├── samples/
│   ├── generate_samples.py     # Synthetic test audio generator
│   └── spoken_sample.wav       # Generated speech sample for end-to-end verification
├── requirements.txt
└── README.md
```

---

## 🚀 Quick Start

### 1. Installation

Activate your virtual environment and install dependencies:
```bash
pip install -r requirements.txt
```

### 2. Using the CLI

Transcribe an audio file (`.wav`, `.mp3`, etc.):
```bash
python -m src.cli samples/spoken_sample.wav --model tiny --format json -o output.json
```

Output:
```
🎧 Ingesting and processing audio: spoken_sample.wav
⚡ Engine: FasterWhisper | Model: tiny | Device: cpu
------------------------------------------------------------
✅ Transcription Complete!
⏱  Audio Duration: 4.41s | Processing Time: 0.80s
🌐 Detected Language: en (99.3%)

============================================================
📜 TIMESTAMPED SEGMENTS:
============================================================
[000.00s -> 003.52s] Hello, this is a test of the speech transcription pipeline.

============================================================
📝 FULL TEXT:
============================================================
Hello, this is a test of the speech transcription pipeline.
```

#### Additional CLI Options:
- `--model`: `tiny`, `base`, `small`, `medium`, `large-v3` (default: `base`)
- `--format`: `json`, `srt`, `vtt`, `txt`
- `--word-timestamps`: Include word-level timestamps in the output
- `--language`: Force specific language code (e.g. `en`, `es`, `fr`) or auto-detect
- `--mock`: Run instantly using the deterministic mock engine

Export subtitles (`.srt`):
```bash
python -m src.cli samples/spoken_sample.wav --model tiny --format srt -o captions.srt
```

---

### 3. Running the REST API Service

Start the FastAPI microservice:
```bash
uvicorn src.api.app:app --host 0.0.0.0 --port 8000 --reload
```

Visit the interactive Swagger UI at **http://localhost:8000/docs**.

#### Example API Request (cURL):
```bash
curl -X POST "http://localhost:8000/v1/transcribe" \
  -F "file=@samples/spoken_sample.wav" \
  -F "word_timestamps=true"
```

#### Example JSON Response:
```json
{
  "text": "Hello, this is a test of the speech transcription pipeline.",
  "segments": [
    {
      "id": 1,
      "start": 0.0,
      "end": 3.52,
      "text": "Hello, this is a test of the speech transcription pipeline.",
      "words": [
        {"word": " Hello,", "start": 0.0, "end": 0.46, "probability": 0.8234},
        {"word": " this", "start": 0.92, "end": 1.14, "probability": 0.9407},
        {"word": " is", "start": 1.14, "end": 1.38, "probability": 0.9977},
        {"word": " a", "start": 1.38, "end": 1.46, "probability": 0.9336},
        {"word": " test", "start": 1.46, "end": 1.7, "probability": 0.944},
        {"word": " of", "start": 1.7, "end": 1.9, "probability": 0.9931},
        {"word": " the", "start": 1.9, "end": 2.04, "probability": 0.8258},
        {"word": " speech", "start": 2.04, "end": 2.28, "probability": 0.8123},
        {"word": " transcription", "start": 2.28, "end": 2.98, "probability": 0.9765},
        {"word": " pipeline.", "start": 2.98, "end": 3.52, "probability": 0.9926}
      ],
      "avg_logprob": -0.313,
      "no_speech_prob": 0.0121
    }
  ],
  "language": "en",
  "language_probability": 0.9932,
  "duration_seconds": 4.409,
  "processing_time_seconds": 0.802,
  "model_name": "faster-whisper-tiny",
  "created_at": "2026-11-19T15:47:51.414132Z"
}
```

---

### 4. Running the Test Suite

Run all unit, integration, and API tests:
```bash
pytest -v tests/
```

Results:
```
tests/test_api.py::test_health_check_endpoint PASSED
tests/test_api.py::test_transcribe_file_endpoint PASSED
tests/test_api.py::test_transcribe_unsupported_file_format PASSED
tests/test_api.py::test_transcribe_with_srt_export PASSED
tests/test_api.py::test_transcribe_local_path_endpoint PASSED
tests/test_api.py::test_transcribe_local_path_not_found PASSED
tests/test_engines.py::test_mock_engine PASSED
tests/test_engines.py::test_whisper_engine_with_sample PASSED
tests/test_exporters.py::test_timestamp_formatting PASSED
tests/test_exporters.py::test_export_as_srt PASSED
tests/test_exporters.py::test_export_as_vtt PASSED
tests/test_exporters.py::test_export_as_txt PASSED
tests/test_exporters.py::test_export_as_json PASSED
tests/test_exporters.py::test_format_transcription_dispatcher PASSED
tests/test_pipeline.py::test_pipeline_validation_missing_file PASSED
tests/test_pipeline.py::test_pipeline_validation_unsupported_format PASSED
tests/test_pipeline.py::test_pipeline_validation_empty_file PASSED
tests/test_pipeline.py::test_pipeline_process_success PASSED
tests/test_pipeline.py::test_pipeline_process_with_word_timestamps PASSED
tests/test_pipeline.py::test_pipeline_post_processor_hook PASSED
tests/test_pipeline.py::test_pipeline_process_and_save PASSED
tests/test_schemas.py::test_word_model PASSED
tests/test_schemas.py::test_segment_model PASSED
tests/test_schemas.py::test_transcription_result PASSED

24 passed in 2.62s
```
