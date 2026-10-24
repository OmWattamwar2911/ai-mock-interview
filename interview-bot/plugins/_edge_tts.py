"""
plugins/_edge_tts.py – Free, offline-capable TTS using Microsoft Edge TTS (edge-tts).

No API key required. Voices are served from Microsoft's edge-tts CDN but the
package handles everything transparently with aiohttp.

Install:  pip install edge-tts
Docs:     https://github.com/rany2/edge-tts
"""

from __future__ import annotations

import asyncio
import io
import uuid

from livekit.agents import tts
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions

import edge_tts  # type: ignore[import]

# edge-tts produces MP3 at 24 kHz mono
SAMPLE_RATE = 24000
NUM_CHANNELS = 1

# Language → edge-tts voice mapping (natural-sounding options)
_VOICE_MAP: dict[str, str] = {
    "en": "en-US-JennyNeural",
    "es": "es-ES-ElviraNeural",
    "fr": "fr-FR-DeniseNeural",
    "de": "de-DE-KatjaNeural",
    "hi": "hi-IN-SwaraNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "ja": "ja-JP-NanamiNeural",
    "pt": "pt-BR-FranciscaNeural",
}


def _pick_voice(language: str) -> str:
    return _VOICE_MAP.get(language, "en-US-JennyNeural")


class EdgeTTS(tts.TTS):
    """Wrapper around `edge-tts` that conforms to the LiveKit TTS plugin interface."""

    def __init__(self, *, language: str = "en", voice: str | None = None) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
        )
        self._voice = voice or _pick_voice(language)
        self._language = language

    @property
    def model(self) -> str:  # type: ignore[override]
        return "edge-tts"

    @property
    def provider(self) -> str:  # type: ignore[override]
        return "microsoft-edge"

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> "_ChunkedStream":
        return _ChunkedStream(tts=self, input_text=text, conn_options=conn_options)


class _ChunkedStream(tts.ChunkedStream):
    def __init__(
        self,
        *,
        tts: EdgeTTS,
        input_text: str,
        conn_options: APIConnectOptions,
    ) -> None:
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._tts: EdgeTTS = tts

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        communicate = edge_tts.Communicate(self.input_text, self._tts._voice)
        request_id = uuid.uuid4().hex

        output_emitter.initialize(
            request_id=request_id,
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
            mime_type="audio/mpeg",  # edge-tts produces MP3
        )

        has_audio = False
        async for chunk in communicate.stream():
            if chunk["type"] == "audio" and chunk.get("data"):
                output_emitter.push(chunk["data"])
                has_audio = True

        if not has_audio:
            raise RuntimeError("edge-tts returned no audio bytes")

        output_emitter.end_input()
