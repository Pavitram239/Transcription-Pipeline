# Audio Transcription Pipeline — Design & Implementation

A robust, production-ready speech-to-text pipeline that ingests diverse audio files (WAV, MP3, M4A, FLAC, OGG, etc.), transcribes spoken language into text with segment-level and word-level timestamps, and outputs structured data ready for downstream consumption.

---

## 1. Overall Approach

The primary objective was to build a clean, resilient, and extensible pipeline rather than simply wrapping a model in a script. To achieve this, the solution was designed around three foundational principles:

1. **Separation of Concerns:** The core business logic (audio validation, decoding, transcription, timestamp extraction) is strictly isolated from transport protocols. The transcription engine does not care whether it is triggered from a CLI command, a FastAPI endpoint, or an asynchronous task queue.
2. **Dependency Inversion (Pluggable Engines):** The pipeline depends on an abstract interface (`BaseTranscriptionEngine`). This allows swapping between high-performance local inference (`faster-whisper`), lightweight mock engines for deterministic CI/CD testing, or future cloud APIs (e.g., Deepgram, AssemblyAI) without refactoring downstream code.
3. **Structured Data Contracts:** Downstream systems (LLM summarizers, vector search embeddings, subtitle generators) require consistent, typed data. Using Pydantic v2 schemas guarantees that every audio input produces a strictly validated JSON structure with segment boundaries, word timestamps, and confidence metrics.

---

## 2. Key Design & Technical Decisions

### A. Engine Selection: `faster-whisper` (CTranslate2) over OpenAI Whisper
* **Why:** Standard OpenAI Whisper runs on vanilla PyTorch and requires external `ffmpeg` binary executables on the host OS. `faster-whisper` re-implements Whisper using `CTranslate2`, offering:
  * **Up to 4x faster execution** on CPU and GPU.
  * **~50% reduced memory footprint** through INT8 and FP16 quantization.
  * **Container-safe direct decoding** via bundled PyAV (libav C bindings), eliminating broken OS-level subprocess calls or missing `ffmpeg` paths.
  * **Silero Voice Activity Detection (VAD):** Integrated VAD filters silent pauses before passing audio to the attention layers, eliminating hallucinated repetitive tokens.

### B. Dual-Interface Delivery: CLI + REST Microservice
* **CLI (`src/cli.py`):** Provides a zero-overhead interface for local developers, shell scripts, and batch processing pipelines. Supports export to JSON, SRT, VTT, and plain text.
* **REST API (`src/api/app.py`):** Built with FastAPI for high-throughput asynchronous file uploads, native request validation, and automatic OpenAPI / Swagger documentation (`/docs`).

### C. Defensive Boundary Validation (Fail-Fast)
* Incoming audio files are inspected before allocating model compute:
  * Verifies file existence and rejects 0-byte (empty/corrupted) files.
  * Enforces an allowed format whitelist (`.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, `.aac`).
  * Caps file sizes (default: 100 MB) to prevent out-of-memory denial of service.

### D. Pluggable Post-Processor Hook System
* Real-world transcription pipelines feed into downstream tasks (summarization, entity extraction, PII redaction). 
* The `TranscriptionPipeline` class includes an extensible hook registration system (`pipeline.register_post_processor(hook)`), allowing developers to chain post-processing transformations directly into the execution flow.

---

## 3. Code Structure & Implementation Overview

```
Transcription Pipeline/
├── backend/                    # Python Backend (all python code & virtualenv)
│   ├── .venv/                  # Python virtual environment
│   ├── src/                    # Core source code
│   │   ├── models/             # Pydantic schemas (Segment, Word, TranscriptionResult)
│   │   ├── engines/            # BaseTranscriptionEngine, faster-whisper, mock engine
│   │   ├── config.py           # Centralized configuration & environment overrides
│   │   ├── pipeline.py         # Audio validation, decoding & hook manager
│   │   ├── exporters.py        # Subtitle and text formatters (JSON, SRT, VTT, TXT)
│   │   ├── cli.py              # CLI entry point
│   │   └── api/                # FastAPI service (/v1/transcribe, /v1/health)
│   ├── tests/                  # Unit and integration tests
│   ├── samples/                # Real and synthetic audio samples
│   ├── scripts/                # Helper Python scripts
│   ├── requirements.txt        # Production dependencies
│   └── README.md               # Backend documentation
├── frontend/                   # React + Vite Web Studio (Figma implementation)
│   ├── src/
│   │   ├── components/         # Navbar, Sidebar, TranscriptCard
│   │   ├── utils/              # Export formatters & timestamp math
│   │   ├── types.ts            # TypeScript definitions matching Pydantic models
│   │   ├── api.ts              # Fetch client & Figma mock data
│   │   └── App.tsx             # Interactive application state
│   ├── public/                 # Static assets & sample audio
│   ├── package.json            # Node dependencies
│   ├── vite.config.ts          # Vite build & proxy config
│   └── README.md               # Frontend documentation
├── .gitignore
└── README.md                   # System documentation
```

### Core Implementation Flow:
1. **Audio Ingestion:** File path or uploaded file is received by CLI or FastAPI.
2. **Validation:** `pipeline.validate_audio_file()` asserts existence, format, and size.
3. **Decoding & VAD:** `PyAV` decodes audio stream to 16kHz mono float32; Silero VAD detects speech segments.
4. **Transcription:** `FasterWhisperEngine.transcribe()` runs quantized inference, extracting segment start/end times and token probabilities.
5. **Data Assembly:** Result is mapped into `TranscriptionResult` containing a list of `Segment` objects.
6. **Export / Output:** Results are emitted as JSON, SRT subtitles, or plain text.

---

## 4. Assumptions, Considerations & Trade-Offs

| Decision | Trade-Off Made | Rationale & Mitigation |
| :--- | :--- | :--- |
| **Local Model vs. Cloud API** | Selected local `faster-whisper` over third-party APIs (e.g. OpenAI / Deepgram). | Prioritized privacy, offline operation, zero API key cost, and reproducible latency. Mitigated compute overhead by using INT8 quantization and tiny/base model variants. |
| **Single-Node Sync vs. Distributed Queue** | The current implementation processes requests synchronously per worker. | Appropriate for Part 1 scope. For high-concurrency production scaling, the design decouples ingestion so the pipeline can be dropped into a Celery/Redis background worker queue without rewriting core logic. |
| **Model Size Default (`base`)** | Chose `base` as default over `large-v3`. | `base` executes in under 1 second on modern CPUs with high accuracy on clear speech. Users requiring specialized jargon or noisy environments can switch to `small` or `large-v3` via the `--model` flag. |
| **Audio Slicing Strategy** | Used VAD silence boundaries instead of static time windows (e.g. cutting every 30s). | Static 30-second cuts risk slicing words in half, leading to hallucinated text or dropped syllables at boundaries. |
| **In-Memory Audio Resampling** | Normalizes all incoming sample rates to 16kHz in memory. | Avoids temporary disk I/O and garbage collection bottlenecks associated with intermediate converted `.wav` files. |

---

## 5. Quick Start & Execution

### Installation
```bash
pip install -r requirements.txt
```

### A. Run via CLI
```bash
python -m src.cli samples/spoken_sample.wav --model tiny --format json -o output.json
```

**Output:**
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

### A. Run CLI from backend
```bash
cd backend
python src/cli.py --input samples/spoken_sample.wav --format srt --output transcript.srt
```

### B. Run the REST API Service
```bash
cd backend
uvicorn src.api.app:app --host 127.0.0.1 --port 8000 --reload
```
* **Interactive Docs:** Visit `http://127.0.0.1:8000/docs`
* **Health Check:** `GET /v1/health`
* **Transcribe:** `POST /v1/transcribe` (accepts file upload)

### C. Run the Test Suite
```bash
cd backend
pytest -v tests/
```
```
============================= 24 passed in 2.62s ==============================
```

### Running the Web Studio Frontend (React + Vite)

The project includes an interactive web interface built with React, Vite, TypeScript, and Tailwind CSS.

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` to access:
* Drag-and-drop audio file upload and microphone recording
* Audio player synchronized with segment & word timestamps
* Real-time search and confidence score heatmaps
* Live subtitle player preview (SRT/VTT)
* One-click download/export to SRT, WebVTT, TXT, and JSON
* Local session history of transcriptions

---

## 6. Sample Output Schema

```json
{
  "text": "Hello, this is a test of the speech transcription pipeline.",
  "segments": [
    {
      "id": 1,
      "start": 0.000,
      "end": 3.520,
      "text": "Hello, this is a test of the speech transcription pipeline.",
      "words": [
        {"word": " Hello,", "start": 0.000, "end": 0.460, "probability": 0.8234},
        {"word": " this", "start": 0.920, "end": 1.140, "probability": 0.9407},
        {"word": " is", "start": 1.140, "end": 1.380, "probability": 0.9977},
        {"word": " a", "start": 1.380, "end": 1.460, "probability": 0.9336},
        {"word": " test", "start": 1.460, "end": 1.700, "probability": 0.9440},
        {"word": " of", "start": 1.700, "end": 1.900, "probability": 0.9931},
        {"word": " the", "start": 1.900, "end": 2.040, "probability": 0.8258},
        {"word": " speech", "start": 2.040, "end": 2.280, "probability": 0.8123},
        {"word": " transcription", "start": 2.280, "end": 2.980, "probability": 0.9765},
        {"word": " pipeline.", "start": 2.980, "end": 3.520, "probability": 0.9926}
      ],
      "avg_logprob": -0.3130,
      "no_speech_prob": 0.0121
    }
  ],
  "language": "en",
  "language_probability": 0.9932,
  "duration_seconds": 4.409,
  "processing_time_seconds": 0.802,
  "model_name": "faster-whisper-tiny"
}
```
