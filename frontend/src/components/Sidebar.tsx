import React, { useRef, useState } from 'react';
import { Upload, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { TranscriptionOptions, ViewStatus } from '../types';
import { formatFileSize } from '../utils/formatters';

interface SidebarProps {
  status: ViewStatus;
  selectedFile: File | Blob | null;
  fileName: string;
  fileSize?: number;
  options: TranscriptionOptions;
  onChangeOptions: (opts: TranscriptionOptions) => void;
  onFileSelect: (file: File | Blob, name: string) => void;
  onClearFile: () => void;
  onTranscribe: () => void;
  apiUrl: string;
  onChangeApiUrl: (url: string) => void;
}

const LANGUAGES = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  status,
  selectedFile,
  fileName,
  fileSize,
  options,
  onChangeOptions,
  onFileSelect,
  onClearFile,
  onTranscribe,
  apiUrl,
  onChangeApiUrl,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelect(file, file.name);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelect(file, file.name);
    }
  };

  // Determine file extension
  const ext = fileName ? fileName.split('.').pop()?.toUpperCase() : 'WAV';

  return (
    <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
      {/* 1. "Your recording" Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Your recording
          </h2>
          <span className="text-xs font-mono font-medium text-slate-400">
            01
          </span>
        </div>

        {/* State A: No file chosen -> Dropzone */}
        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.m4a,.flac,.ogg,.wma,.aac"
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-600">
                <Upload className="w-6 h-6 stroke-[1.75]" />
              </div>
            </div>

            <p className="text-sm font-semibold text-slate-800">
              Drop audio here
            </p>
            <p className="text-xs text-slate-400 mb-4 mt-0.5">
              or choose a recording
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
            >
              Browse device
            </button>
          </div>
        ) : (
          /* State B: File selected */
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Waveform graphic */}
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center gap-[3px] shrink-0 text-indigo-600">
                <span className="w-0.5 h-3 bg-indigo-600 rounded-full" />
                <span className="w-0.5 h-5 bg-indigo-600 rounded-full" />
                <span className="w-0.5 h-4 bg-indigo-600 rounded-full" />
                <span className="w-0.5 h-2 bg-indigo-600 rounded-full" />
              </div>

              <div className="truncate">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {fileName}
                </p>
                <p className="text-xs text-slate-400">
                  {ext} · {fileSize ? formatFileSize(fileSize) : '8.2 MB'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClearFile}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition shrink-0"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload Limits Note (visible when empty) */}
        {!selectedFile && (
          <div className="mt-4 text-[11px] text-slate-400 space-y-1">
            <p>WAV, MP3, M4A, FLAC, OGG, WMA, AAC</p>
            <p>Maximum recording size: 100 MB</p>
          </div>
        )}

        {/* Transcription Complete Banner */}
        {status === 'completed' && selectedFile && (
          <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>Transcription complete</span>
          </div>
        )}

        {/* Language Selector */}
        <div className="mt-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Language
          </label>
          <div className="relative">
            <select
              value={options.language || 'auto'}
              onChange={(e) =>
                onChangeOptions({
                  ...options,
                  language: e.target.value === 'auto' ? undefined : e.target.value,
                })
              }
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 appearance-none focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Advanced Options Accordion */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-xs font-medium text-slate-600 hover:text-slate-900 transition py-1"
          >
            <span>Advanced options</span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-2.5 pt-1 text-xs text-slate-600">
              <label className="flex items-center justify-between cursor-pointer">
                <span>Silero VAD Filter</span>
                <input
                  type="checkbox"
                  checked={options.vad_filter}
                  onChange={(e) =>
                    onChangeOptions({ ...options, vad_filter: e.target.checked })
                  }
                  className="rounded text-indigo-600 accent-indigo-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Word Timestamps</span>
                <input
                  type="checkbox"
                  checked={options.word_timestamps}
                  onChange={(e) =>
                    onChangeOptions({
                      ...options,
                      word_timestamps: e.target.checked,
                    })
                  }
                  className="rounded text-indigo-600 accent-indigo-600 focus:ring-0"
                />
              </label>

              <div className="pt-2 border-t border-slate-100">
                <span className="block text-[11px] text-slate-400 mb-1">
                  API Endpoint:
                </span>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => onChangeApiUrl(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="mt-6">
          {status === 'transcribing' ? (
            <button
              disabled
              className="w-full py-3 px-4 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-wait"
            >
              <span>Transcribing…</span>
            </button>
          ) : status === 'completed' ? (
            <button
              type="button"
              onClick={onTranscribe}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-[0.99]"
            >
              Transcribe again
            </button>
          ) : (
            <button
              type="button"
              disabled={!selectedFile}
              onClick={onTranscribe}
              className={`w-full py-3 px-4 rounded-xl text-xs font-semibold shadow-sm transition ${
                !selectedFile
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.99]'
              }`}
            >
              Transcribe audio
            </button>
          )}
        </div>
      </div>

      {/* 2. "A clearer workflow" Helper Card */}
      <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-6 text-xs text-slate-600 space-y-3">
        <h3 className="font-bold text-indigo-600 text-sm">
          A clearer workflow
        </h3>
        <ol className="space-y-2 text-slate-600">
          <li>1. Upload your audio</li>
          <li>2. Review the transcript</li>
          <li>3. Export in the format you need</li>
        </ol>
        <p className="text-[11px] text-slate-400 pt-1">
          Powered by faster-whisper
        </p>
      </div>
    </div>
  );
};
