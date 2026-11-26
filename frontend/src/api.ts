import {
  HealthResponse,
  JobListResponse,
  TranscriptionJobDetails,
  TranscriptionJobSubmission,
  TranscriptionOptions,
  TranscriptionResult,
} from './types';

export const DEFAULT_API_URL = 'http://localhost:8000';

export async function checkHealth(baseUrl: string = DEFAULT_API_URL): Promise<HealthResponse> {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/health`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}

export async function transcribeAudio(
  file: File | Blob,
  fileName: string,
  options: TranscriptionOptions,
  baseUrl: string = DEFAULT_API_URL
): Promise<TranscriptionResult> {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/transcribe`;
  const formData = new FormData();
  formData.append('file', file, fileName);

  if (options.language && options.language !== 'auto') {
    formData.append('language', options.language);
  }
  formData.append('vad_filter', String(options.vad_filter));
  formData.append('word_timestamps', String(options.word_timestamps));

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `Server responded with ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  const result: TranscriptionResult = await response.json();
  result.fileName = fileName;
  return result;
}

export function getFigmaSampleResult(): TranscriptionResult {
  return {
    fileName: 'Product discovery.wav',
    duration_seconds: 84, // 01:24
    processing_time_seconds: 1.84,
    model_name: 'faster-whisper (base, int8)',
    language: 'English',
    language_probability: 0.99,
    created_at: new Date().toISOString(),
    text: "Thanks for joining today. I'd like to start with a simple question: what makes a transcript genuinely useful after a meeting? For me, it's being able to find the moment I need without listening to the whole recording again. Timestamps make a big difference. Exactly. The goal isn't just to turn audio into text. It's to make the next step easier, whether that's sharing a quote or writing a summary. We should keep the first experience simple: upload a recording, choose a language if you need to, and let the transcript do the rest. And once it's ready, people should be able to listen alongside the text. Clicking a timestamp should take them straight to that moment. For exports, let's support plain text for notes, JSON for integrations, and subtitle formats for anyone working with video. That gives us a focused starting point. We can learn from how people use it before adding accounts, history, or more advanced workflows. Agreed. Let's make the core experience clear, accessible, and just as comfortable on a phone as it is on a desktop.",
    segments: [
      {
        id: 1,
        start: 0,
        end: 10,
        text: "Thanks for joining today. I'd like to start with a simple question: what makes a transcript genuinely useful after a meeting?",
      },
      {
        id: 2,
        start: 10,
        end: 21,
        text: "For me, it's being able to find the moment I need without listening to the whole recording again. Timestamps make a big difference.",
      },
      {
        id: 3,
        start: 21,
        end: 32,
        text: "Exactly. The goal isn't just to turn audio into text. It's to make the next step easier, whether that's sharing a quote or writing a summary.",
      },
      {
        id: 4,
        start: 32,
        end: 43,
        text: "We should keep the first experience simple: upload a recording, choose a language if you need to, and let the transcript do the rest.",
      },
      {
        id: 5,
        start: 43,
        end: 54,
        text: "And once it's ready, people should be able to listen alongside the text. Clicking a timestamp should take them straight to that moment.",
      },
      {
        id: 6,
        start: 54,
        end: 65,
        text: "For exports, let's support plain text for notes, JSON for integrations, and subtitle formats for anyone working with video.",
      },
      {
        id: 7,
        start: 65,
        end: 75,
        text: "That gives us a focused starting point. We can learn from how people use it before adding accounts, history, or more advanced workflows.",
      },
      {
        id: 8,
        start: 75,
        end: 84,
        text: "Agreed. Let's make the core experience clear, accessible, and just as comfortable on a phone as it is on a desktop.",
      },
    ],
  };
}

/**
 * Creates a synthetic demo WAV file for in-browser playback when no local audio is uploaded
 */
export function createSyntheticDemoWav(durationSeconds: number = 84): Blob {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Harmonic soft pulse mimicking voice cadence
    const envelope = Math.sin((t % 2.5) * Math.PI / 2.5);
    const sample = envelope * (
      0.15 * Math.sin(2 * Math.PI * 220 * t) +
      0.1 * Math.sin(2 * Math.PI * 440 * t)
    );
    const intSample = Math.max(-1, Math.min(1, sample)) * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

export async function submitAsyncJob(
  file: File | Blob,
  fileName: string,
  options: TranscriptionOptions,
  baseUrl: string = DEFAULT_API_URL
): Promise<TranscriptionJobSubmission> {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/transcriptions`;
  const formData = new FormData();
  formData.append('file', file, fileName);

  if (options.language && options.language !== 'auto') {
    formData.append('language', options.language);
  }
  formData.append('vad_filter', String(options.vad_filter));
  formData.append('word_timestamps', String(options.word_timestamps));

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `Job submission failed: ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export async function getJobDetails(
  jobId: string,
  baseUrl: string = DEFAULT_API_URL
): Promise<TranscriptionJobDetails> {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/transcriptions/${jobId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch job status: ${response.status}`);
  }

  return response.json();
}

export async function listJobs(
  limit: number = 50,
  baseUrl: string = DEFAULT_API_URL
): Promise<JobListResponse> {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/transcriptions?limit=${limit}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to list jobs: ${response.status}`);
  }

  return response.json();
}

