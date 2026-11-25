"""Faster-Whisper engine implementation using CTranslate2."""

import logging
import os
import time
from pathlib import Path
from typing import Optional

# Suppress Hugging Face Windows symlink warning
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

# Compatibility patch for PyAV v14+ / v19+ where `metadata_errors` was deprecated/removed
import av
_orig_av_open = av.open

def _compatible_av_open(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _orig_av_open(*args, **kwargs)

av.open = _compatible_av_open

from faster_whisper import WhisperModel
from src.engines.base import BaseTranscriptionEngine
from src.models.schemas import Segment, TranscriptionOptions, TranscriptionResult, Word

logger = logging.getLogger(__name__)


class FasterWhisperEngine(BaseTranscriptionEngine):
    """Production speech-to-text engine powered by faster-whisper (CTranslate2).

    Benefits:
    - 4x faster execution than vanilla OpenAI-Whisper
    - Low memory footprint with INT8/FP16 quantization
    - Uses PyAV directly, eliminating strict system-level ffmpeg CLI dependencies
    - Native support for Silero VAD (Voice Activity Detection)
    """

    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
        download_root: Optional[str] = None,
    ):
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type
        self._download_root = download_root
        self._model: Optional[WhisperModel] = None

    @property
    def name(self) -> str:
        return "FasterWhisper"

    @property
    def model_name(self) -> str:
        return self._model_size

    @property
    def device(self) -> str:
        return self._device

    def _get_model(self) -> WhisperModel:
        """Lazily initialize the WhisperModel on first invocation."""
        if self._model is None:
            logger.info(
                f"Loading faster-whisper model '{self._model_size}' on device='{self._device}' "
                f"with compute_type='{self._compute_type}'..."
            )
            self._model = WhisperModel(
                model_size_or_path=self._model_size,
                device=self._device,
                compute_type=self._compute_type,
                download_root=self._download_root,
            )
            logger.info("Model loaded successfully.")
        return self._model

    def transcribe(
        self,
        audio_path: str | Path,
        options: Optional[TranscriptionOptions] = None,
    ) -> TranscriptionResult:
        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        options = options or TranscriptionOptions()
        model = self._get_model()

        start_time = time.perf_counter()

        # Run transcription with generator of segments
        segments_generator, info = model.transcribe(
            str(audio_path),
            language=options.language,
            vad_filter=options.vad_filter,
            word_timestamps=options.word_timestamps,
            initial_prompt=options.initial_prompt,
        )

        segments_list: list[Segment] = []
        full_text_pieces: list[str] = []

        for seg in segments_generator:
            words_list: list[Word] | None = None
            if options.word_timestamps and getattr(seg, "words", None):
                words_list = [
                    Word(
                        word=w.word,
                        start=round(w.start, 3),
                        end=round(w.end, 3),
                        probability=round(w.probability, 4),
                    )
                    for w in seg.words
                ]

            segment_clean_text = seg.text.strip()
            if segment_clean_text:
                full_text_pieces.append(segment_clean_text)

            segments_list.append(
                Segment(
                    id=seg.id,
                    start=round(seg.start, 3),
                    end=round(seg.end, 3),
                    text=segment_clean_text,
                    words=words_list,
                    avg_logprob=round(seg.avg_logprob, 4) if getattr(seg, "avg_logprob", None) is not None else None,
                    no_speech_prob=round(seg.no_speech_prob, 4) if getattr(seg, "no_speech_prob", None) is not None else None,
                )
            )

        duration = getattr(info, "duration", 0.0)
        if not duration and segments_list:
            duration = segments_list[-1].end

        elapsed_time = time.perf_counter() - start_time

        return TranscriptionResult(
            text=" ".join(full_text_pieces),
            segments=segments_list,
            language=getattr(info, "language", None),
            language_probability=round(getattr(info, "language_probability", 1.0), 4) if getattr(info, "language_probability", None) else None,
            duration_seconds=round(duration, 3),
            processing_time_seconds=round(elapsed_time, 3),
            model_name=f"faster-whisper-{self._model_size}",
        )
