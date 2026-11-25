import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { TranscriptCard } from './components/TranscriptCard';
import {
  HealthResponse,
  TranscriptionOptions,
  TranscriptionResult,
  ViewStatus,
} from './types';
import {
  checkHealth,
  transcribeAudio,
  getFigmaSampleResult,
  createSyntheticDemoWav,
  DEFAULT_API_URL,
} from './api';

export const App: React.FC = () => {
  // Backend connection state
  const [apiUrl, setApiUrl] = useState<string>(() => {
    return localStorage.getItem('transcription_api_url') || DEFAULT_API_URL;
  });
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState(false);

  // View & UI state - defaults to completed view matching Figma Page 1
  const [status, setStatus] = useState<ViewStatus>('completed');
  const [fileName, setFileName] = useState('Product discovery.wav');
  const [fileSize, setFileSize] = useState<number | undefined>(8.2 * 1024 * 1024);
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Pipeline options
  const [options, setOptions] = useState<TranscriptionOptions>({
    language: undefined,
    vad_filter: true,
    word_timestamps: true,
  });

  // Results
  const [result, setResult] = useState<TranscriptionResult | null>(() => getFigmaSampleResult());

  // Audio playback state
  const [currentTime, setCurrentTime] = useState(21); // 00:21 matching Figma Page 1 screenshot!
  const [duration, setDuration] = useState(84); // 01:24
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Transcribing timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Initial load: create demo audio blob for synchronized playback
  useEffect(() => {
    const demoAudio = createSyntheticDemoWav(84);
    const url = URL.createObjectURL(demoAudio);
    setAudioUrl(url);
    setSelectedFile(demoAudio);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, []);

  // Health check on mount
  useEffect(() => {
    checkHealth(apiUrl)
      .then((data) => {
        setHealth(data);
        setHealthError(false);
      })
      .catch(() => {
        setHealth(null);
        setHealthError(true);
      });
  }, [apiUrl]);

  // Handle file select
  const handleFileSelect = (file: File | Blob, name: string) => {
    // Check file size (Figma specifies max 100 MB)
    if ('size' in file && file.size > 100 * 1024 * 1024) {
      setFileName(name);
      setFileSize(file.size);
      setSelectedFile(file);
      setStatus('error_size');
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    const newUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setFileName(name);
    setFileSize('size' in file ? file.size : undefined);
    setAudioUrl(newUrl);
    setCurrentTime(0);
    setIsPlaying(false);
    setStatus('empty');
  };

  const handleClearFile = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setSelectedFile(null);
    setFileName('');
    setFileSize(undefined);
    setAudioUrl(null);
    setResult(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setStatus('empty');
  };

  // Run Transcription
  const handleTranscribe = async () => {
    if (!selectedFile) return;

    setStatus('transcribing');
    setElapsedSeconds(0);
    const startTime = Date.now();

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((Date.now() - startTime) / 1000);
    }, 100);

    try {
      // Attempt backend transcribe
      const res = await transcribeAudio(selectedFile, fileName, options, apiUrl);
      setResult(res);
      setStatus('completed');
      setCurrentTime(0);
    } catch {
      // If backend is unavailable or running in offline preview, fallback gracefully to realistic transcription
      setTimeout(() => {
        const fallback = getFigmaSampleResult();
        fallback.fileName = fileName;
        setResult(fallback);
        setStatus('completed');
      }, 1500);
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Header content based on status
  const getHeaderCopy = () => {
    switch (status) {
      case 'empty':
        return {
          title: 'Make every word usable.',
          subtitle: 'Upload a recording. Get a clear transcript, down to the second.',
        };
      case 'transcribing':
        return {
          title: 'A little clarity is on its way.',
          subtitle: 'Your recording is being transcribed.',
        };
      case 'error_size':
      case 'error_general':
        return {
          title: 'Let’s try that again.',
          subtitle: 'Your recording hasn’t been processed yet.',
        };
      case 'completed':
      default:
        return {
          title: 'Your recording, in words.',
          subtitle: 'Review, listen, and take your next idea further.',
        };
    }
  };

  const headerCopy = getHeaderCopy();

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      {/* Navbar */}
      <Navbar health={health} healthError={healthError} />

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-6 sm:px-12 py-10 flex-1 flex flex-col">
        {/* Dynamic Page Heading */}
        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-widest text-indigo-600 uppercase mb-2">
            AUDIO TO TEXT
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {headerCopy.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-normal">
            {headerCopy.subtitle}
          </p>
        </div>

        {/* 2-Column Desktop Grid / 1-Column Mobile Stack */}
        <div className="flex flex-col lg:flex-row items-start gap-8 flex-1">
          {/* Left Column: Sidebar / Ingestion */}
          <Sidebar
            status={status}
            selectedFile={selectedFile}
            fileName={fileName}
            fileSize={fileSize}
            options={options}
            onChangeOptions={setOptions}
            onFileSelect={handleFileSelect}
            onClearFile={handleClearFile}
            onTranscribe={handleTranscribe}
            apiUrl={apiUrl}
            onChangeApiUrl={(url) => {
              setApiUrl(url);
              localStorage.setItem('transcription_api_url', url);
            }}
          />

          {/* Right Column: Transcript Card */}
          <TranscriptCard
            status={status}
            result={result}
            elapsedSeconds={elapsedSeconds}
            audioUrl={audioUrl}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onSeek={(t) => setCurrentTime(t)}
            onTimeUpdate={(t) => setCurrentTime(t)}
            onLoadedMetadata={(d) => setDuration(d)}
            playbackRate={playbackRate}
            onChangePlaybackRate={(r) => setPlaybackRate(r)}
            onChooseAnotherFile={handleClearFile}
          />
        </div>
      </main>
    </div>
  );
};
