import React from 'react';
import { Sliders, Globe, Activity, Clock, PlayCircle, Loader2 } from 'lucide-react';
import { TranscriptionOptions } from '../types';

interface TranscriptionConfigProps {
  options: TranscriptionOptions;
  onChangeOptions: (opts: TranscriptionOptions) => void;
  onTranscribe: () => void;
  isLoading: boolean;
  canTranscribe: boolean;
  elapsedTime?: number;
}

const COMMON_LANGUAGES = [
  { code: 'auto', label: 'Auto Detect Language' },
  { code: 'en', label: 'English (en)' },
  { code: 'es', label: 'Spanish (es)' },
  { code: 'fr', label: 'French (fr)' },
  { code: 'de', label: 'German (de)' },
  { code: 'zh', label: 'Chinese (zh)' },
  { code: 'ja', label: 'Japanese (ja)' },
  { code: 'hi', label: 'Hindi (hi)' },
  { code: 'it', label: 'Italian (it)' },
  { code: 'pt', label: 'Portuguese (pt)' },
  { code: 'ru', label: 'Russian (ru)' },
  { code: 'ar', label: 'Arabic (ar)' },
];

export const TranscriptionConfig: React.FC<TranscriptionConfigProps> = ({
  options,
  onChangeOptions,
  onTranscribe,
  isLoading,
  canTranscribe,
  elapsedTime = 0,
}) => {
  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Pipeline Parameters</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Language Selection */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Spoken Language</span>
          </label>
          <select
            value={options.language || 'auto'}
            onChange={(e) =>
              onChangeOptions({
                ...options,
                language: e.target.value === 'auto' ? undefined : e.target.value,
              })
            }
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium transition"
          >
            {COMMON_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Silero VAD Filter */}
        <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Silero VAD Filter</span>
            </span>
            <input
              type="checkbox"
              id="vad_filter"
              checked={options.vad_filter}
              onChange={(e) =>
                onChangeOptions({ ...options, vad_filter: e.target.checked })
              }
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 accent-emerald-500 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Suppresses background silence to eliminate repetitive hallucinated tokens.
          </p>
        </div>

        {/* Word Timestamps */}
        <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>Word Timestamps</span>
            </span>
            <input
              type="checkbox"
              id="word_timestamps"
              checked={options.word_timestamps}
              onChange={(e) =>
                onChangeOptions({ ...options, word_timestamps: e.target.checked })
              }
              className="w-4 h-4 rounded text-teal-500 focus:ring-teal-500 focus:ring-offset-slate-900 accent-teal-500 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Extracts exact millisecond timestamps and confidence for every spoken word.
          </p>
        </div>
      </div>

      {/* Main Action Button */}
      <button
        type="button"
        disabled={!canTranscribe || isLoading}
        onClick={onTranscribe}
        className={`w-full py-3 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
          !canTranscribe || isLoading
            ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-800'
            : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-950/40 hover:shadow-emerald-500/20 active:scale-[0.99]'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span>Transcribing Audio Pipeline... ({elapsedTime.toFixed(1)}s)</span>
          </>
        ) : (
          <>
            <PlayCircle className="w-5 h-5" />
            <span>Run Transcription Pipeline</span>
          </>
        )}
      </button>
    </div>
  );
};
