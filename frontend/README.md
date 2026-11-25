# Audio Transcription Pipeline — Frontend Web Studio

A modern, responsive, high-performance web interface for the **Speech-to-Text Transcription Pipeline**, built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**.

---

## 🌟 Key Features

1. **Audio Ingestion & Recording:**
   - Drag & Drop file upload supporting `.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, `.aac`, `.wma` (up to 100 MB).
   - In-browser microphone audio recording with live waveform animation.
   - Built-in "Load Demo Sample" button with instant synchronized playback test.

2. **Pipeline Parameters:**
   - Language selector (Auto-detect or ISO language codes: English, Spanish, French, German, Mandarin, Japanese, Hindi, etc.).
   - Silero Voice Activity Detection (VAD) toggle.
   - Word-level timestamps toggle.

3. **Interactive Player & Synchronized Transcript:**
   - Real-time synchronized audio scrubber (play, pause, seek, playback speed 0.75x–2.0x, volume control).
   - Interactive segment timeline with clickable words that seek audio to exact millisecond timestamps.
   - Live karaoke / segment highlighting as the audio plays.
   - In-transcript search with instant keyword filtering.

4. **Multiple Transcript Views:**
   - **Segments Timeline:** Timestamps, average log probabilities, duration, and word pills.
   - **Full Text:** Clean readable prose with copy button, word count, character count, and WPM rate.
   - **Confidence Heatmap:** Color-coded visualization of word-by-word transcription probabilities (Green ≥ 90%, Blue 75–89%, Amber 60–74%, Rose < 60%).
   - **Subtitle Preview:** Live simulated caption player displaying subtitles synchronized with audio.
   - **Raw JSON:** Formatted Pydantic model response.

5. **Multi-Format Exporters:**
   - One-click copy & file download for:
     - SubRip (`.srt`)
     - WebVTT (`.vtt`)
     - Plain Text (`.txt`)
     - Complete JSON (`.json`)

6. **History & Session Persistence:**
   - Saves recent transcriptions in `localStorage` for instant review and reload.

7. **Backend Telemetry & Diagnostics:**
   - Real-time connection indicator pinging `GET /v1/health` with engine, device (`CPU`/`CUDA`), model size, and supported formats.

---

## 🚀 Quick Start

### 1. Start the FastAPI Backend
From the `backend/` directory:
```bash
cd backend
# Optional: Set mock engine for quick testing without heavy model download
# set TRANSCRIPTION_USE_MOCK=true

uvicorn src.api.app:app --reload --host 127.0.0.1 --port 8000
```
Backend API will be live at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

### 2. Start the Vite Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Production Build
```bash
cd frontend
npm run build
npm run preview
```
The compiled static assets will be output to `frontend/dist/`.
