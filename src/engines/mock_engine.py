"""Mock transcription engine for fast deterministic testing, CI/CD, and simulation."""

from pathlib import Path
import time
from typing import Optional, List

from src.engines.base import BaseTranscriptionEngine
from src.models.schemas import Segment, TranscriptionOptions, TranscriptionResult, Word


class MockTranscriptionEngine(BaseTranscriptionEngine):
    """A deterministic mock speech-to-text engine.

    Ideal for:
    - High-speed unit & integration testing without model downloads
    - Continuous Integration (CI) test runners without GPUs or large RAM
    - Testing downstream processing workflows with reproducible segment boundaries
    """

    DEFAULT_MOCK_SEGMENTS = [
        (0.0, 2.45, "Welcome to the transcription pipeline demo."),
        (2.60, 5.10, "In this first step, audio is ingested and decoded."),
        (5.25, 8.40, "Speech segments are extracted along with start and end timestamps."),
        (8.55, 11.20, "This structured output can now be used for downstream analysis."),
    ]

    def __init__(
        self,
        canned_segments: Optional[List[tuple[float, float, str]]] = None,
        language: str = "en",
        language_probability: float = 0.985,
        simulated_delay: float = 0.05,
    ):
        self._canned_segments = canned_segments or self.DEFAULT_MOCK_SEGMENTS
        self._language = language
        self._language_prob = language_probability
        self._simulated_delay = simulated_delay

    @property
    def name(self) -> str:
        return "MockTranscriptionEngine"

    @property
    def model_name(self) -> str:
        return "mock-v1"

    @property
    def device(self) -> str:
        return "cpu"

    def transcribe(
        self,
        audio_path: str | Path,
        options: Optional[TranscriptionOptions] = None,
    ) -> TranscriptionResult:
        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        options = options or TranscriptionOptions()
        start_time = time.perf_counter()

        if self._simulated_delay > 0:
            time.sleep(self._simulated_delay)

        segments: list[Segment] = []
        full_text_pieces: list[str] = []

        for idx, (seg_start, seg_end, text) in enumerate(self._canned_segments):
            words: list[Word] | None = None
            if options.word_timestamps:
                # Synthesize word timestamps evenly within segment
                tokens = text.split()
                if tokens:
                    step = (seg_end - seg_start) / len(tokens)
                    words = [
                        Word(
                            word=token,
                            start=round(seg_start + i * step, 3),
                            end=round(seg_start + (i + 1) * step, 3),
                            probability=0.99,
                        )
                        for i, token in enumerate(tokens)
                    ]

            segments.append(
                Segment(
                    id=idx,
                    start=round(seg_start, 3),
                    end=round(seg_end, 3),
                    text=text,
                    words=words,
                    avg_logprob=-0.15,
                    no_speech_prob=0.01,
                )
            )
            full_text_pieces.append(text)

        elapsed = time.perf_counter() - start_time
        total_duration = self._canned_segments[-1][1] if self._canned_segments else 0.0

        return TranscriptionResult(
            text=" ".join(full_text_pieces),
            segments=segments,
            language=options.language or self._language,
            language_probability=self._language_prob,
            duration_seconds=round(total_duration, 3),
            processing_time_seconds=round(elapsed, 4),
            model_name="mock-engine",
        )
