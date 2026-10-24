"""
_faster_whisper_stt.py – High-Quality Local STT using faster-whisper with raw numpy audio buffer.

Runs 100% offline without API keys.
Features:
- Configurable model size (small / base) with automatic fallback
- beam_size=5, vad_filter=True, condition_on_previous_text=False, no_speech_threshold=0.6
- Per-segment probability confidence calculation
- Hallucination and filler drop filter (e.g. "thanks for watching", "subtitles by", repeated loops)
- Raw PCM numpy conversion avoiding PyAV dependencies
"""

import asyncio
import logging
import math
import os
import re
from typing import Optional, Tuple
import numpy as np

from livekit.agents import stt
from livekit.agents.types import APIConnectOptions
from livekit.agents.utils import AudioBuffer

logger = logging.getLogger("plugins.faster_whisper")

WHISPER_HALLUCINATIONS = [
    r"thanks\s+for\s+watching",
    r"thank\s+you\s+for\s+watching",
    r"subtitles\s+by",
    r"translated\s+by",
    r"subscribe\s+to\s+my\s+channel",
    r"please\s+subscribe",
    r"watching\s+and\s+listening",
    r"see\s+you\s+in\s+the\s+next\s+video",
    r"like\s+and\s+subscribe",
]

COMMON_SOLITARY_FILLERS = {"um", "uh", "hmm", "ah", "er", "huh"}


class FasterWhisperSTT(stt.STT):
    def __init__(
        self,
        *,
        model: Optional[object] = None,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
        language: Optional[str] = "en",
    ):
        super().__init__(
            capabilities=stt.STTCapabilities(streaming=False, interim_results=False)
        )
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type
        self._language = language
        self._model = model
        self.last_turn_info = {
            "text": "",
            "language": language or "en",
            "confidence": 1.0,
            "is_hallucination": False,
        }

    def _ensure_model(self):
        if self._model is not None:
            return
        from faster_whisper import WhisperModel
        # Prefer configured model size (e.g. small), fallback to base if needed
        sizes_to_try = [self._model_size]
        if self._model_size != "base":
            sizes_to_try.append("base")

        last_err = None
        for sz in sizes_to_try:
            try:
                logger.info(f"Loading faster-whisper model: {sz} ({self._device}, {self._compute_type})")
                self._model = WhisperModel(
                    sz,
                    device=self._device,
                    compute_type=self._compute_type,
                )
                self._model_size = sz
                return
            except Exception as e:
                last_err = e
                logger.warning(f"Could not load faster-whisper '{sz}': {e}")

        raise RuntimeError(f"Failed to load any faster-whisper model: {last_err}")

    def _is_hallucination_or_filler(self, text: str) -> bool:
        clean = text.strip()
        lower = clean.lower()

        if not clean:
            return True

        # Solitary filler word
        if lower in COMMON_SOLITARY_FILLERS:
            return True

        # Known Whisper subtitle / YouTube hallucinations
        for pattern in WHISPER_HALLUCINATIONS:
            if re.search(pattern, lower):
                return True

        # Repetition loop check: e.g. "Thank you. Thank you. Thank you."
        words = lower.split()
        if len(words) >= 6:
            half = len(words) // 2
            first_half = " ".join(words[:half])
            second_half = " ".join(words[half: half * 2])
            if first_half == second_half:
                return True

        return False

    async def _recognize_impl(
        self,
        buffer: AudioBuffer,
        *,
        language: Optional[str] = None,
        conn_options: Optional[APIConnectOptions] = None,
    ) -> stt.SpeechEvent:
        await asyncio.to_thread(self._ensure_model)

        try:
            arr = np.frombuffer(buffer.data, dtype=np.int16).astype(np.float32) / 32768.0
        except Exception as e:
            logger.warning(f"Failed to convert audio buffer to numpy: {e}")
            arr = np.zeros(16000, dtype=np.float32)

        def _do_transcribe() -> Tuple[str, str, float]:
            target_lang = language or self._language
            try:
                segments, info = self._model.transcribe(
                    arr,
                    language=target_lang,
                    beam_size=5,
                    vad_filter=True,
                    condition_on_previous_text=False,
                    no_speech_threshold=0.6,
                )

                seg_list = list(segments)
                detected_lang = info.language if info else (target_lang or "en")

                if not seg_list:
                    return "", detected_lang, 0.0

                text_parts = []
                confidences = []

                for seg in seg_list:
                    t = seg.text.strip()
                    if t:
                        text_parts.append(t)
                        # Confidence estimate from avg_logprob and no_speech_prob
                        conf = math.exp(max(-5.0, seg.avg_logprob)) * (1.0 - getattr(seg, "no_speech_prob", 0.0))
                        confidences.append(max(0.0, min(1.0, conf)))

                full_text = " ".join(text_parts).strip()
                avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
                return full_text, detected_lang, round(avg_conf, 3)
            except Exception as exc:
                logger.warning(f"faster-whisper transcription error: {exc}")
                return "", target_lang or "en", 0.0

        full_text, detected_lang, confidence = await asyncio.to_thread(_do_transcribe)

        # Check for hallucinations or solitary filler
        is_bad = self._is_hallucination_or_filler(full_text)
        if is_bad:
            logger.info(f"[STT Filter] Dropped hallucination/filler: '{full_text}'")
            full_text = ""
            confidence = 0.0

        self.last_turn_info = {
            "text": full_text,
            "language": detected_lang,
            "confidence": confidence,
            "is_hallucination": is_bad,
        }

        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[
                stt.SpeechData(
                    text=full_text,
                    language=detected_lang,
                    confidence=confidence,
                )
            ],
        )
