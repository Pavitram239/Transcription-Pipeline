"""Utility script to generate sample WAV audio files for testing and validation."""

import math
import struct
import wave
from pathlib import Path


def generate_sine_wave(
    filepath: Path,
    duration_seconds: float = 3.0,
    frequency_hz: float = 440.0,
    sample_rate: int = 16000,
    volume: float = 0.5,
) -> Path:
    """Generate a clean synthetic WAV file with a sine wave tone at 16kHz (standard Whisper rate)."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    num_samples = int(duration_seconds * sample_rate)

    with wave.open(str(filepath), "w") as wav_file:
        # Mono, 2 bytes (16-bit PCM), 16000 Hz
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        for i in range(num_samples):
            # Generate modulated sine wave tone
            t = float(i) / sample_rate
            # Add subtle harmonic variation
            value = (
                math.sin(2.0 * math.pi * frequency_hz * t) * 0.7
                + math.sin(2.0 * math.pi * (frequency_hz * 1.5) * t) * 0.3
            ) * volume
            # Clamp and pack into signed 16-bit integer
            sample = int(max(-1.0, min(1.0, value)) * 32767.0)
            data = struct.pack("<h", sample)
            wav_file.writeframesraw(data)

    return filepath


if __name__ == "__main__":
    out = Path(__file__).parent / "test_audio.wav"
    generate_sine_wave(out, duration_seconds=3.0)
    print(f"Generated sample audio file at: {out.resolve()}")
