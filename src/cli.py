"""Command-line interface for the transcription pipeline."""

import argparse
import sys
from pathlib import Path

from src.config import DEFAULT_CONFIG, PipelineConfig
from src.engines.mock_engine import MockTranscriptionEngine
from src.engines.whisper_engine import FasterWhisperEngine
from src.models.schemas import TranscriptionOptions
from src.pipeline import TranscriptionPipeline
from src.exporters import format_transcription


def parse_args(args=None):
    parser = argparse.ArgumentParser(
        prog="transcribe",
        description="Audio Transcription Pipeline - Convert audio into timestamped text segments.",
    )
    parser.add_argument(
        "audio_path",
        type=str,
        help="Path to the input audio file (WAV, MP3, M4A, FLAC, OGG, etc.)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=DEFAULT_CONFIG.model_size,
        choices=["tiny", "base", "small", "medium", "large-v3"],
        help=f"Whisper model size (default: {DEFAULT_CONFIG.model_size})",
    )
    parser.add_argument(
        "--device",
        type=str,
        default=DEFAULT_CONFIG.device,
        choices=["cpu", "cuda"],
        help="Compute device for inference (default: cpu)",
    )
    parser.add_argument(
        "--compute-type",
        type=str,
        default=DEFAULT_CONFIG.compute_type,
        help="Quantization type (default: int8)",
    )
    parser.add_argument(
        "--language",
        type=str,
        default=None,
        help="Language code (e.g., 'en', 'es', 'fr') or auto-detect if omitted",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default=None,
        help="Optional path to save output file (e.g. output.json or output.srt)",
    )
    parser.add_argument(
        "--format",
        "-f",
        type=str,
        default="json",
        choices=["json", "srt", "vtt", "txt"],
        help="Output export format (default: json)",
    )
    parser.add_argument(
        "--word-timestamps",
        action="store_true",
        help="Enable word-level timestamp generation",
    )
    parser.add_argument(
        "--no-vad",
        action="store_true",
        help="Disable Voice Activity Detection filtering",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use deterministic mock engine (useful for quick smoke tests & debugging without model download)",
    )
    return parser.parse_args(args)


def main():
    args = parse_args()
    audio_path = Path(args.audio_path)

    if not audio_path.exists():
        print(f"Error: Audio file not found at '{audio_path}'", file=sys.stderr)
        sys.exit(1)

    config = PipelineConfig(
        model_size=args.model,
        device=args.device,
        compute_type=args.compute_type,
    )

    if args.mock:
        engine = MockTranscriptionEngine()
    else:
        engine = FasterWhisperEngine(
            model_size=config.model_size,
            device=config.device,
            compute_type=config.compute_type,
        )

    pipeline = TranscriptionPipeline(engine=engine, config=config)

    options = TranscriptionOptions(
        language=args.language,
        vad_filter=not args.no_vad,
        word_timestamps=args.word_timestamps,
    )

    print(f"\n🎧 Ingesting and processing audio: {audio_path.name}")
    print(f"⚡ Engine: {engine.name} | Model: {engine.model_name} | Device: {engine.device}")
    print("-" * 60)

    try:
        result = pipeline.process(audio_path, options=options)
    except Exception as e:
        print(f"Error during transcription: {e}", file=sys.stderr)
        sys.exit(1)

    print("\n✅ Transcription Complete!")
    print(f"⏱  Audio Duration: {result.duration_seconds:.2f}s | Processing Time: {result.processing_time_seconds:.2f}s")
    if result.language:
        prob_str = f" ({result.language_probability * 100:.1f}%)" if result.language_probability else ""
        print(f"🌐 Detected Language: {result.language}{prob_str}")

    print("\n" + "=" * 60)
    print("📜 TIMESTAMPED SEGMENTS:")
    print("=" * 60)
    for seg in result.segments:
        print(f"[{seg.start:06.2f}s -> {seg.end:06.2f}s] {seg.text}")

    print("\n" + "=" * 60)
    print("📝 FULL TEXT:")
    print("=" * 60)
    print(result.text)

    if args.output:
        formatted = format_transcription(result, args.format)
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(formatted, encoding="utf-8")
        print(f"\n💾 Saved output ({args.format.upper()}) to: {out_path.resolve()}")


if __name__ == "__main__":
    main()
