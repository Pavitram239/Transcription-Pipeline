import React, { useState } from 'react';
import { Activity, CheckCircle2, XCircle, Settings, History, Cpu, Radio } from 'lucide-react';
import { HealthResponse } from '../types';

interface HeaderProps {
  health: HealthResponse | null;
  healthError: boolean;
  checkingHealth: boolean;
  apiUrl: string;
  onUpdateApiUrl: (url: string) => void;
  onRefreshHealth: () => void;
  historyCount: number;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  healthError,
  checkingHealth,
  apiUrl,
  onUpdateApiUrl,
  onRefreshHealth,
  historyCount,
  onOpenHistory,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [inputUrl, setInputUrl] = useState(apiUrl);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateApiUrl(inputUrl);
    setShowConfig(false);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Title & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Transcription Pipeline
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Faster-Whisper • VAD Filtering • Segment & Word Timestamps
            </p>
          </div>
        </div>

        {/* Backend Status & Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Health status pill */}
          <div 
            onClick={() => setShowConfig(!showConfig)}
            title="Click to configure backend API endpoint"
            className={`cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all shadow-sm ${
              healthError 
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:border-rose-600'
                : health 
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:border-emerald-600'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {checkingHealth ? (
              <Activity className="w-3.5 h-3.5 animate-spin text-slate-400" />
            ) : healthError ? (
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            
            <span>
              {checkingHealth ? (
                'Connecting...'
              ) : healthError ? (
                'API Offline (Demo Ready)'
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">{health?.engine}</span>
                  <span className="text-slate-400">•</span>
                  <span>{health?.model}</span>
                  <span className="text-slate-400">({health?.device})</span>
                </span>
              )}
            </span>
            <Settings className="w-3.5 h-3.5 ml-1 opacity-70 hover:opacity-100" />
          </div>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
            title="View recent transcriptions"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* API Docs Link */}
          <a
            href={`${apiUrl.replace(/\/$/, '')}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all"
            title="Open FastAPI Swagger Documentation"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Swagger Docs</span>
          </a>
        </div>
      </div>

      {/* Backend API Configuration Popdown */}
      {showConfig && (
        <div className="max-w-7xl mx-auto mt-3 p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2">
          <form onSubmit={handleSaveUrl} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                FastAPI Backend URL:
              </label>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto pt-4 sm:pt-4">
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
              >
                Save & Connect
              </button>
              <button
                type="button"
                onClick={onRefreshHealth}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
              >
                Ping
              </button>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
          {health && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex flex-wrap gap-4">
              <div><strong className="text-slate-300">Supported Audio:</strong> {health.supported_formats.join(', ')}</div>
              <div><strong className="text-slate-300">Device:</strong> {health.device}</div>
              <div><strong className="text-slate-300">Engine:</strong> {health.engine}</div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
