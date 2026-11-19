"""Formatters and exporters for transcription results (JSON, SRT, VTT, TXT)."""

from typing import Literal
from src.models.schemas import TranscriptionResult


def format_timestamp_srt(seconds: float) -> str:
    """Format seconds into SRT timestamp format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def format_timestamp_vtt(seconds: float) -> str:
    """Format seconds into WebVTT timestamp format: HH:MM:SS.mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def export_as_srt(result: TranscriptionResult) -> str:
    """Convert transcription segments into SubRip (.srt) subtitle string."""
    blocks: list[str] = []
    for idx, seg in enumerate(result.segments, start=1):
        start_str = format_timestamp_srt(seg.start)
        end_str = format_timestamp_srt(seg.end)
        blocks.append(f"{idx}\n{start_str} --> {end_str}\n{seg.text}")
    return "\n\n".join(blocks) + "\n"


def export_as_vtt(result: TranscriptionResult) -> str:
    """Convert transcription segments into WebVTT (.vtt) format string."""
    lines: list[str] = ["WEBVTT", ""]
    for idx, seg in enumerate(result.segments, start=1):
        start_str = format_timestamp_vtt(seg.start)
        end_str = format_timestamp_vtt(seg.end)
        lines.append(f"{idx}")
        lines.append(f"{start_str} --> {end_str}")
        lines.append(f"{seg.text}")
        lines.append("")
    return "\n".join(lines)


def export_as_txt(result: TranscriptionResult) -> str:
    """Export clean plain text of the entire transcription."""
    return result.text


def export_as_json(result: TranscriptionResult, indent: int = 2) -> str:
    """Export structured JSON with all metadata and segments."""
    return result.model_dump_json(indent=indent)


ExportFormat = Literal["json", "srt", "vtt", "txt"]


def format_transcription(result: TranscriptionResult, fmt: ExportFormat) -> str:
    """Format the transcription result according to the requested format."""
    match fmt.lower():
        case "json":
            return export_as_json(result)
        case "srt":
            return export_as_srt(result)
        case "vtt":
            return export_as_vtt(result)
        case "txt":
            return export_as_txt(result)
        case _:
            raise ValueError(f"Unsupported format '{fmt}'. Choose from 'json', 'srt', 'vtt', 'txt'.")

