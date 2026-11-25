import React, { useRef, useState, useEffect } from 'react';
import { Upload, Mic, Square, Sparkles, FileAudio, X, Music, AlertCircle } from 'lucide-react';
import { formatFileSize, formatSeconds } from '../utils/formatters';

interface AudioUploadZoneProps {
  selectedFile: File | Blob | null;
  fileName: string;
  onFileSelect: (file: File | Blob, name: string) => void;
  onClearFile: () => void;
  onLoadSample: () => void;
  audioUrl: string | null;
}

export const AudioUploadZone: React.FC<AudioUploadZoneProps> = ({
  selectedFile,
  fileName,
  onFileSelect,
  onClearFile,
  onLoadSample,
  audioUrl,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  const allowedFormats = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac', '.wma'];

  // Handle Drag & Drop
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
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFormats.includes(ext)) {
      alert(`Invalid format "${ext}". Please upload one of: ${allowedFormats.join(', ')}`);
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      alert("File exceeds maximum allowed size of 100 MB.");
      return;
    }
    onFileSelect(file, file.name);
  };

  // Microphone recording
  const startRecording = async () => {
    setRecordError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const name = `mic_recording_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.wav`;
        onFileSelect(audioBlob, name);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setRecordError(err.message || 'Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm transition-all shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <FileAudio className="w-4 h-4 text-emerald-400" />
          <span>Audio Ingestion</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadSample}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition"
            title="Load the pre-recorded spoken sample"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Sample</span>
          </button>
        </div>
      </div>

      {/* Selected file view */}
      {selectedFile ? (
        <div className="p-4 bg-slate-950/70 border border-emerald-500/30 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Music className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="truncate">
                <p className="text-sm font-semibold text-white truncate">{fileName}</p>
                <p className="text-xs text-slate-400">
                  {selectedFile instanceof File ? formatFileSize(selectedFile.size) : 'Recorded Blob'} • Ready for transcription
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClearFile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Remove audio file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Simple audio player preview */}
          {audioUrl && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <audio controls src={audioUrl} className="w-full h-8 outline-none filter invert contrast-125 brightness-90 rounded-lg" />
            </div>
          )}
        </div>
      ) : isRecording ? (
        /* Recording state */
        <div className="p-8 border-2 border-dashed border-rose-500/60 bg-rose-950/20 rounded-xl flex flex-col items-center justify-center text-center animate-pulse">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
            <Mic className="w-8 h-8 text-rose-500 animate-bounce" />
          </div>
          <p className="text-base font-semibold text-rose-200">Recording live microphone audio...</p>
          <p className="text-2xl font-mono font-bold text-white mt-1">
            {formatSeconds(recordingSeconds)}
          </p>
          <div className="flex items-center gap-1.5 my-3 h-8">
            {[40, 70, 30, 90, 60, 100, 50, 80, 45, 95].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-rose-400 rounded-full wave-bar"
                style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 transition"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>Stop & Use Recording</span>
          </button>
        </div>
      ) : (
        /* Dropzone / Upload state */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/10 scale-[0.99]'
              : 'border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-800/40 bg-slate-950/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.m4a,.flac,.ogg,.aac,.wma"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6 text-emerald-400" />
          </div>

          <p className="text-sm font-semibold text-slate-200">
            Drag & drop your audio file here, or <span className="text-emerald-400 underline decoration-emerald-500/50 underline-offset-2">browse</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports WAV, MP3, M4A, FLAC, OGG, AAC (Max 100 MB)
          </p>

          <div className="flex items-center gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs text-slate-600">or</span>
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition"
            >
              <Mic className="w-3.5 h-3.5 text-rose-400" />
              <span>Record with Mic</span>
            </button>
          </div>
        </div>
      )}

      {recordError && (
        <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{recordError}</span>
        </div>
      )}
    </div>
  );
};
