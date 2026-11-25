export interface Word {
  word: string;
  start: number;
  end: number;
  probability: number;
}

export interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: Word[] | null;
  avg_logprob?: number | null;
  no_speech_prob?: number | null;
}

export interface TranscriptionResult {
  text: string;
  segments: Segment[];
  language?: string | null;
  language_probability?: number | null;
  duration_seconds: number;
  processing_time_seconds: number;
  model_name: string;
  created_at?: string;
  fileName?: string;
}

export interface TranscriptionOptions {
  language?: string;
  vad_filter: boolean;
  word_timestamps: boolean;
  export_format?: 'json' | 'srt' | 'vtt' | 'txt';
}

export interface HealthResponse {
  status: string;
  engine: string;
  model: string;
  device: string;
  supported_formats: string[];
  timestamp: string;
}

export type ViewStatus = 'empty' | 'transcribing' | 'completed' | 'error_size' | 'error_general';

export interface SavedTranscription {
  id: string;
  timestamp: number;
  fileName: string;
  fileSize?: number;
  duration: number;
  result: TranscriptionResult;
}
