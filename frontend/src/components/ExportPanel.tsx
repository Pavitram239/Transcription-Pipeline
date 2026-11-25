import React, { useState } from 'react';
import { Download, Copy, Check, FileCode, FileText, Subtitles, Zap, Gauge, Globe2 } from 'lucide-react';
import { TranscriptionResult } from '../types';
import {
  exportAsJson,
  exportAsSrt,
  exportAsTxt,
  exportAsVtt,
  downloadFile,
  formatSeconds,
} from '../utils/formatters';

interface ExportPanelProps {
  result: TranscriptionResult;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ result }) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const baseFileName = (result.fileName || 'transcription').replace(/\.[^/.]+$/, '');

  const handleCopy = (format: 'srt' | 'vtt' | 'txt' | 'json') => {
    let text = '';
    if (format === 'srt') text = exportAsSrt(result);
    else if (format === 'vtt') text = exportAsVtt(result);
    else if (format === 'txt') text = exportAsTxt(result);
    else if (format === 'json') text = exportAsJson(result);

    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownload = (format: 'srt' | 'vtt' | 'txt' | 'json') => {
    if (format === 'srt') {
      downloadFile(exportAsSrt(result), `${baseFileName}.srt`, 'text/plain');
    } else if (format === 'vtt') {
      downloadFile(exportAsVtt(result), `${baseFileName}.vtt`, 'text/vtt');
    } else if (format === 'txt') {
      downloadFile(exportAsTxt(result), `${baseFileName}.txt`, 'text/plain');
    } else if (format === 'json') {
      downloadFile(exportAsJson(result), `${baseFileName}.json`, 'application/json');
    }
  };

  // Real-time factor (RTF) calculation: Duration / Processing Time
  const speedFactor =
    result.processing_time_seconds > 0
      ? (result.duration_seconds / result.processing_time_seconds).toFixed(1)
      : '1.0';

  return (
    <div className="w-full space-y-4">
      {/* 1. Metrics & Performance Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm shadow-xl">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <span>Execution Telemetry</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <p className="text-slate-400">Audio Duration</p>
            <p className="text-sm font-bold text-white font-mono mt-0.5">
              {formatSeconds(result.duration_seconds)}
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <p className="text-slate-400">Inference Latency</p>
            <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
              {result.processing_time_seconds.toFixed(2)}s
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <p className="text-slate-400 flex items-center gap-1">
              <span>Speed Factor</span>
              <Zap className="w-3 h-3 text-amber-400 inline" />
            </p>
            <p className="text-sm font-bold text-amber-300 font-mono mt-0.5">
              {speedFactor}x real-time
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <p className="text-slate-400 flex items-center gap-1">
              <span>Detected Lang</span>
              <Globe2 className="w-3 h-3 text-teal-400 inline" />
            </p>
            <p className="text-sm font-bold text-white mt-0.5 uppercase">
              {result.language || 'N/A'}{' '}
              {result.language_probability && (
                <span className="text-[10px] text-slate-400 font-normal">
                  ({(result.language_probability * 100).toFixed(0)}%)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Export Formats Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm shadow-xl">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export Transcriptions</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* SRT Card */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Subtitles className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-semibold text-white">SubRip (.srt)</h4>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Standard subtitle format for Premiere, YouTube & VLC.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload('srt')}
                className="flex-1 py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <Download className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button
                onClick={() => handleCopy('srt')}
                className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                title="Copy SRT to clipboard"
              >
                {copiedFormat === 'srt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* VTT Card */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Subtitles className="w-4 h-4 text-teal-400" />
                <h4 className="text-xs font-semibold text-white">WebVTT (.vtt)</h4>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                HTML5 web video subtitle track standard.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload('vtt')}
                className="flex-1 py-1.5 px-2 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <Download className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button
                onClick={() => handleCopy('vtt')}
                className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                title="Copy VTT to clipboard"
              >
                {copiedFormat === 'vtt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Plain Text Card */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-semibold text-white">Plain Text (.txt)</h4>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Raw transcript text without timestamps for LLM prompts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload('txt')}
                className="flex-1 py-1.5 px-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <Download className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button
                onClick={() => handleCopy('txt')}
                className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                title="Copy TXT to clipboard"
              >
                {copiedFormat === 'txt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* JSON Card */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-semibold text-white">Full JSON (.json)</h4>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Complete typed structure with segment & word timestamps.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload('json')}
                className="flex-1 py-1.5 px-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <Download className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button
                onClick={() => handleCopy('json')}
                className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                title="Copy JSON to clipboard"
              >
                {copiedFormat === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
