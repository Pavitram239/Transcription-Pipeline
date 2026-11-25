import { TranscriptionResult } from '../types';

export function formatTimestampSrt(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export function formatTimestampVtt(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const dec = Math.floor((seconds % 1) * 10);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${dec}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${dec}`;
}

export function exportAsSrt(result: TranscriptionResult): string {
  return result.segments
    .map((seg, idx) => {
      const start = formatTimestampSrt(seg.start);
      const end = formatTimestampSrt(seg.end);
      return `${idx + 1}\n${start} --> ${end}\n${seg.text.trim()}`;
    })
    .join('\n\n') + '\n';
}

export function exportAsVtt(result: TranscriptionResult): string {
  const lines = ['WEBVTT', ''];
  result.segments.forEach((seg, idx) => {
    lines.push(String(idx + 1));
    lines.push(`${formatTimestampVtt(seg.start)} --> ${formatTimestampVtt(seg.end)}`);
    lines.push(seg.text.trim());
    lines.push('');
  });
  return lines.join('\n');
}

export function exportAsTxt(result: TranscriptionResult): string {
  return result.text;
}

export function exportAsJson(result: TranscriptionResult): string {
  return JSON.stringify(result, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
