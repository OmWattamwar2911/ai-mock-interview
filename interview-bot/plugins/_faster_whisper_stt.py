"""
_faster_whisper_stt.py – Local STT using faster-whisper.

Runs 100% offline without any API keys.
Requires:
    pip install faster-whisper
"""

import io
import wave
import logging
from typing import Optional
from livekit.agents import stt
from livekit.agents.utils import AudioBuffer

logger = logging.getLogger("plugins.faster_whisper")


class FasterWhisperSTT(stt.STT):
    def __init__(
        self,
        *,
        model_size: str = "base",
        device: str = "auto",
        compute_type: str = "default",
        language: Optional[str] = "en",
    ):
        super().__init__(
            capabilities=stt.STTCapabilities(streaming=False, interim_results=False)
        )
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type
        self._language = language
        self._model = None

    def _ensure_model(self):
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
                logger.info(f"Loading faster-whisper model: {self._model_size} ({self._device})")
                self._model = WhisperModel(
                    self._model_size,
                    device=self._device,
                    compute_type=self._compute_type,
                )
            except ImportError:
                raise ImportError(
                    "faster-whisper is not installed. Run: pip install faster-whisper\n"
                    "Or set PROFILE=cloud in .env to use Deepgram."
                )

    async def _recognize_impl(
        self,
        buffer: AudioBuffer,
        *,
        language: Optional[str] = None,
        conn_options: Optional[stt.APIConnectOptions] = None,
    ) -> stt.SpeechEvent:
        self._ensure_model()

        # Convert AudioBuffer to WAV in memory
        wav_io = io.BytesIO()
        with wave.open(wav_io, "wb") as wav_file:
            wav_file.setnchannels(buffer.num_channels)
            wav_file.setsampwidth(2)  # 16-bit PCM
            wav_file.setframerate(buffer.sample_rate)
            wav_file.writeframes(buffer.data)
        wav_io.seek(0)

        segments, info = self._model.transcribe(
            wav_io,
            language=language or self._language,
            beam_size=5,
        )

        full_text = " ".join(seg.text.strip() for seg in segments).strip()

        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[
                stt.SpeechData(
                    text=full_text,
                    language=info.language if info else "en",
                )
            ],
        )
