import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  RotateCw,
  AlertTriangle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Download,
  ChevronDown,
} from 'lucide-react';
import { TranscriptionResult, ViewStatus } from '../types';
import {
  formatSeconds,
  exportAsJson,
  exportAsSrt,
  exportAsTxt,
  exportAsVtt,
  downloadFile,
} from '../utils/formatters';

interface TranscriptCardProps {
  status: ViewStatus;
  result: TranscriptionResult | null;
  elapsedSeconds: number;
  audioUrl: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onTimeUpdate: (seconds: number) => void;
  onLoadedMetadata: (duration: number) => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  onChooseAnotherFile: () => void;
}

export const TranscriptCard: React.FC<TranscriptCardProps> = ({
  status,
  result,
  elapsedSeconds,
  audioUrl,
  currentTime,
  duration,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onTimeUpdate,
  onLoadedMetadata,
  playbackRate,
  onChangePlaybackRate,
  onChooseAnotherFile,
}) => {
  const [activeTab, setActiveTab] = useState<'timestamped' | 'plain'>('timestamped');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  // Sync audio element
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (Math.abs(audioRef.current.currentTime - currentTime) > 0.4) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Auto-scroll active segment into view
  useEffect(() => {
    if (activeSegmentRef.current && isPlaying && activeTab === 'timestamped') {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTime, isPlaying, activeTab]);

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'txt' | 'srt' | 'vtt' | 'json') => {
    if (!result) return;
    const baseName = (result.fileName || 'transcript').replace(/\.[^/.]+$/, '');
    if (format === 'txt') downloadFile(exportAsTxt(result), `${baseName}.txt`, 'text/plain');
    if (format === 'srt') downloadFile(exportAsSrt(result), `${baseName}.srt`, 'text/plain');
    if (format === 'vtt') downloadFile(exportAsVtt(result), `${baseName}.vtt`, 'text/vtt');
    if (format === 'json') downloadFile(exportAsJson(result), `${baseName}.json`, 'application/json');
    setShowDownloadMenu(false);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSeek(val);
  };

  return (
    <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between min-h-[580px]">
      {/* Hidden audio element for synchronized playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={() => {
            if (audioRef.current) onTimeUpdate(audioRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) onLoadedMetadata(audioRef.current.duration);
          }}
          onEnded={onPause}
        />
      )}

      {/* Top Header of Card */}
      <div>
        {status === 'completed' && result ? (
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Transcript
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {result.language || 'English'} · {result.segments.length} segments ·{' '}
                {formatSeconds(result.duration_seconds || duration).replace(/\.\d+$/, '')}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                </button>

                {showDownloadMenu && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in zoom-in-95 text-xs">
                    <button
                      onClick={() => handleDownload('txt')}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium"
                    >
                      Plain Text (.txt)
                    </button>
                    <button
                      onClick={() => handleDownload('srt')}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium"
                    >
                      SubRip Subtitle (.srt)
                    </button>
                    <button
                      onClick={() => handleDownload('vtt')}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium"
                    >
                      WebVTT Subtitle (.vtt)
                    </button>
                    <button
                      onClick={() => handleDownload('json')}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium"
                    >
                      Full JSON (.json)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="pb-4">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Transcript
            </h2>
          </div>
        )}

        {/* ----------------- STATE A: EMPTY ----------------- */}
        {status === 'empty' && (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center mb-6 text-indigo-600">
              <FileText className="w-7 h-7 stroke-[1.5]" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
              A blank page, full of possibility.
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-8">
              Your transcript will appear here. Upload a recording to get started.
            </p>

            <div className="flex items-center gap-2 mb-4">
              {['TXT', 'JSON', 'SRT', 'VTT'].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {fmt}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-400">
              One recording. Four ways to take it further.
            </p>
          </div>
        )}

        {/* ----------------- STATE B: TRANSCRIBING ----------------- */}
        {status === 'transcribing' && (
          <div className="flex flex-col items-center justify-center text-center py-14 px-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center mb-6 text-indigo-600">
              <RotateCw className="w-7 h-7 stroke-[1.75] animate-spin" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Turning sound into text
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-8">
              This can take a moment, depending on your recording and the model in use.
            </p>

            {/* Progress Container */}
            <div className="w-full max-w-sm bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">
                  TRANSCRIBING
                </span>
                <span className="font-mono text-slate-600">
                  Elapsed time {formatSeconds(elapsedSeconds).replace(/\.\d+$/, '')}
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(95, Math.max(15, (elapsedSeconds / 10) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Keep this page open until your transcript is ready.
            </p>
          </div>
        )}

        {/* ----------------- STATE C: ERROR TOO LARGE ----------------- */}
        {status === 'error_size' && (
          <div className="flex flex-col items-center justify-center text-center py-14 px-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6 text-rose-600">
              <AlertTriangle className="w-7 h-7 stroke-[1.75]" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
              This recording is too large
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
              Choose a recording under 100 MB, or compress your audio and try again.
            </p>

            <button
              type="button"
              onClick={onChooseAnotherFile}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition mb-4"
            >
              Choose another recording
            </button>

            <p className="text-xs text-slate-400">
              No transcript was generated.
            </p>
          </div>
        )}

        {/* ----------------- STATE D: COMPLETED ----------------- */}
        {status === 'completed' && result && (
          <div className="space-y-6 pt-5">
            {/* Synchronized Audio Player Bar */}
            <div className="flex items-center gap-4 py-2">
              {/* Play / Pause Circular Button */}
              <button
                type="button"
                onClick={isPlaying ? onPause : onPlay}
                className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm transition active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              {/* Current Time */}
              <span className="text-xs font-mono font-medium text-slate-800 w-11">
                {formatSeconds(currentTime).replace(/\.\d+$/, '')}
              </span>

              {/* Interactive Scrubber Bar */}
              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || result.duration_seconds || 84}
                  step="0.1"
                  value={currentTime}
                  onChange={handleScrubberChange}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                />
              </div>

              {/* Total Duration */}
              <span className="text-xs font-mono font-medium text-slate-400 w-11">
                {formatSeconds(duration || result.duration_seconds || 84).replace(/\.\d+$/, '')}
              </span>

              {/* Playback speed selector */}
              <button
                type="button"
                onClick={() => {
                  const rates = [1, 1.25, 1.5, 2];
                  const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                  onChangePlaybackRate(next);
                }}
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                title="Change speed"
              >
                {playbackRate}×
              </button>

              {/* Volume / Mute */}
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-400 hover:text-slate-600 transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* View Mode Toggle: Timestamped vs Plain text */}
            <div className="bg-slate-100/90 p-1 rounded-xl inline-flex text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('timestamped')}
                className={`px-4 py-1.5 rounded-lg transition ${
                  activeTab === 'timestamped'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Timestamped
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('plain')}
                className={`px-4 py-1.5 rounded-lg transition ${
                  activeTab === 'plain'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Plain text
              </button>
            </div>

            {/* Transcript Rows: Timestamped */}
            {activeTab === 'timestamped' && (
              <div className="space-y-4 pt-2">
                {result.segments.map((seg) => {
                  const isActive =
                    currentTime >= seg.start && currentTime < seg.end;

                  return (
                    <div
                      key={seg.id}
                      ref={isActive ? activeSegmentRef : null}
                      className={`flex items-start gap-4 p-3 sm:p-4 rounded-xl transition-all ${
                        isActive
                          ? 'bg-indigo-50/70 border-l-2 border-indigo-600 text-slate-900 shadow-xs'
                          : 'hover:bg-slate-50/70 text-slate-700'
                      }`}
                    >
                      {/* Timestamp button */}
                      <button
                        type="button"
                        onClick={() => {
                          onSeek(seg.start);
                          onPlay();
                        }}
                        className={`text-xs font-mono font-semibold shrink-0 pt-0.5 transition ${
                          isActive
                            ? 'text-indigo-600 underline font-bold'
                            : 'text-indigo-600/80 hover:text-indigo-600 hover:underline'
                        }`}
                        title="Seek to this timestamp"
                      >
                        {formatSeconds(seg.start).replace(/\.\d+$/, '')}
                      </button>

                      {/* Text */}
                      <p className="text-sm leading-relaxed flex-1">
                        {seg.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Transcript Rows: Plain text */}
            {activeTab === 'plain' && (
              <div className="p-6 bg-slate-50/70 border border-slate-200/60 rounded-2xl text-slate-800 text-sm leading-relaxed whitespace-pre-wrap select-text">
                {result.text}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Microcopy */}
      <div className="pt-8 text-center text-xs text-slate-400">
        {status === 'completed'
          ? 'Generated with faster-whisper · Review for accuracy'
          : 'Audio to text, without the extra steps.'}
      </div>
    </div>
  );
};
