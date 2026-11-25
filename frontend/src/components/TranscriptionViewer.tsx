import React, { useState, useEffect, useRef } from 'react';
import {
  List,
  FileText,
  Activity,
  Code2,
  Subtitles,
  Search,
  Play,
  Copy,
  Check,
} from 'lucide-react';
import { TranscriptionResult, Word } from '../types';
import { formatSeconds } from '../utils/formatters';

interface TranscriptionViewerProps {
  result: TranscriptionResult;
  currentTime: number;
  onSeek: (time: number) => void;
  onPlay: () => void;
}

type TabType = 'segments' | 'text' | 'heatmap' | 'subtitles' | 'json';

export const TranscriptionViewer: React.FC<TranscriptionViewerProps> = ({
  result,
  currentTime,
  onSeek,
  onPlay,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('segments');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active segment into view smoothly if playing
  useEffect(() => {
    if (activeSegmentRef.current && activeTab === 'segments') {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTime, activeTab]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find current active segment and word
  const currentSegment = result.segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  const getWordColor = (prob: number) => {
    if (prob >= 0.9) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (prob >= 0.75) return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    if (prob >= 0.6) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  };

  // Filtered segments for search
  const filteredSegments = searchQuery.trim()
    ? result.segments.filter((s) =>
        s.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : result.segments;

  const totalWords = result.segments.reduce((acc, seg) => {
    return acc + (seg.words ? seg.words.length : seg.text.trim().split(/\s+/).length);
  }, 0);

  const wordsPerMinute =
    result.duration_seconds > 0
      ? Math.round((totalWords / result.duration_seconds) * 60)
      : 0;

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl flex flex-col">
      {/* Top Bar: Tabs & Search */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab('segments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'segments'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Segments ({result.segments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'text'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Full Text</span>
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'heatmap'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Confidence Heatmap</span>
          </button>

          <button
            onClick={() => setActiveTab('subtitles')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'subtitles'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Subtitles className="w-3.5 h-3.5" />
            <span>Subtitle Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'json'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>

        {/* Search in transcript */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="pl-8 pr-3 py-1.5 w-44 sm:w-60 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-xs text-slate-500 hover:text-slate-300"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="p-5 overflow-y-auto max-h-[560px] min-h-[300px]">
        {/* 1. SEGMENTS TAB */}
        {activeTab === 'segments' && (
          <div className="space-y-3">
            {filteredSegments.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-12">
                No matching segments found for "{searchQuery}".
              </p>
            ) : (
              filteredSegments.map((seg) => {
                const isActive =
                  currentTime >= seg.start && currentTime <= seg.end;
                return (
                  <div
                    key={seg.id}
                    ref={isActive ? activeSegmentRef : null}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-emerald-950/20 border-emerald-500/60 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* Play segment button */}
                        <button
                          type="button"
                          onClick={() => {
                            onSeek(seg.start);
                            onPlay();
                          }}
                          className={`p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-mono font-medium transition ${
                            isActive
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300'
                          }`}
                          title="Seek audio to this segment start"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{formatSeconds(seg.start)}</span>
                        </button>

                        <span className="text-xs text-slate-500">→</span>

                        <span className="text-xs font-mono text-slate-400">
                          {formatSeconds(seg.end)}
                        </span>

                        <span className="text-[10px] text-slate-500 ml-1">
                          ({(seg.end - seg.start).toFixed(2)}s)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {seg.avg_logprob !== undefined && seg.avg_logprob !== null && (
                          <span
                            title="Average log probability of segment tokens"
                            className="bg-slate-800/60 px-2 py-0.5 rounded border border-slate-800"
                          >
                            logprob: {seg.avg_logprob.toFixed(2)}
                          </span>
                        )}
                        <span className="bg-slate-800/60 px-2 py-0.5 rounded border border-slate-800 font-mono">
                          #{seg.id}
                        </span>
                      </div>
                    </div>

                    {/* Render words if available or segment text */}
                    {seg.words && seg.words.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {seg.words.map((w: Word, widx: number) => {
                          const isWordActive =
                            currentTime >= w.start && currentTime <= w.end;
                          return (
                            <button
                              key={widx}
                              type="button"
                              onClick={() => {
                                onSeek(w.start);
                                onPlay();
                              }}
                              className={`px-2 py-1 rounded-md text-xs font-medium border transition-all ${
                                isWordActive
                                  ? 'bg-emerald-400 text-slate-950 font-bold scale-105 shadow-md shadow-emerald-400/30'
                                  : getWordColor(w.probability)
                              }`}
                              title={`${w.word} • ${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s • Confidence: ${(w.probability * 100).toFixed(1)}%`}
                            >
                              {w.word}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-200 leading-relaxed pt-1">
                        {seg.text}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 2. FULL TEXT TAB */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
              <div className="flex items-center gap-4 text-slate-400">
                <div>
                  <strong className="text-white">{totalWords}</strong> words
                </div>
                <div>
                  <strong className="text-white">{result.text.length}</strong> characters
                </div>
                <div>
                  <strong className="text-emerald-400">{wordsPerMinute}</strong> WPM rate
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(result.text)}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>

            <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-800/60 text-slate-200 text-sm leading-relaxed tracking-wide font-normal whitespace-pre-wrap select-text">
              {result.text}
            </div>
          </div>
        )}

        {/* 3. CONFIDENCE HEATMAP */}
        {activeTab === 'heatmap' && (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
              <span className="font-semibold text-slate-300">Confidence Scale:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="text-slate-400">High (≥ 90%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                <span className="text-slate-400">Good (75–89%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="text-slate-400">Moderate (60–74%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="text-slate-400">Low (&lt; 60%)</span>
              </div>
            </div>

            <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-800/60 flex flex-wrap gap-2 leading-loose">
              {result.segments.flatMap((s) => s.words || []).length > 0 ? (
                result.segments.flatMap((s) => s.words || []).map((w, idx) => (
                  <span
                    key={idx}
                    onClick={() => {
                      onSeek(w.start);
                      onPlay();
                    }}
                    className={`cursor-pointer px-2.5 py-1 rounded-lg border text-xs font-medium transition hover:scale-105 ${getWordColor(
                      w.probability
                    )}`}
                    title={`Word: "${w.word.trim()}" | Confidence: ${(w.probability * 100).toFixed(1)}% | At: ${w.start.toFixed(2)}s`}
                  >
                    {w.word}
                    <sub className="ml-1 opacity-70 text-[10px]">
                      {(w.probability * 100).toFixed(0)}%
                    </sub>
                  </span>
                ))
              ) : (
                <div className="text-center w-full py-8 text-xs text-slate-500">
                  Word-level timestamps were not enabled for this transcription run.
                  Enable "Word Timestamps" in Pipeline Parameters and re-run.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. SUBTITLE PREVIEW */}
        {activeTab === 'subtitles' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Live preview of subtitles rendered during audio playback.
            </p>

            <div className="w-full h-64 bg-slate-950 rounded-2xl border border-slate-800 relative flex flex-col items-center justify-end p-6 overflow-hidden shadow-inner">
              {/* Simulated video background */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-950/30 flex items-center justify-center">
                <Subtitles className="w-20 h-20 text-slate-800/40" />
              </div>

              {/* Subtitle text container */}
              <div className="z-10 text-center max-w-xl transition-all">
                {currentSegment ? (
                  <div className="bg-black/80 backdrop-blur-md px-5 py-2.5 rounded-xl border border-slate-700/60 text-white font-medium text-base shadow-2xl animate-in fade-in">
                    {currentSegment.text}
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 font-mono italic">
                    [Playing audio: Subtitles appear when speech is detected]
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. RAW JSON TAB */}
        {activeTab === 'json' && (
          <div className="relative">
            <button
              onClick={() => handleCopy(JSON.stringify(result, null, 2))}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition z-10"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
