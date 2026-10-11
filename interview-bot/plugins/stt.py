"""
plugins/stt.py – Pluggable Speech-to-Text

PROFILE=cloud  → Deepgram Nova-2
PROFILE=local  → faster-whisper (runs fully offline, no API key needed)
"""

import os
import logging
from livekit.agents import stt as agents_stt

logger = logging.getLogger("plugins.stt")


def build_stt(profile: str) -> agents_stt.STT:
    if profile == "local":
        return _build_local_stt()
    return _build_cloud_stt()


def _build_cloud_stt() -> agents_stt.STT:
    """Deepgram Nova-2 via the official livekit-plugins-deepgram package."""
    from livekit.plugins import deepgram

    api_key = os.environ.get("DEEPGRAM_API_KEY", "")
    if not api_key:
        logger.warning("DEEPGRAM_API_KEY not set – falling back to local STT")
        return _build_local_stt()

    logger.info("STT: Deepgram Nova-2 (cloud)")
    return deepgram.STT(api_key=api_key, model="nova-2-general")


def _build_local_stt() -> agents_stt.STT:
    """
    faster-whisper via a lightweight LiveKit-compatible adapter.

    Install:  pip install faster-whisper
    Model sizes: tiny, base, small, medium, large-v2  (trade-off: speed vs accuracy)
    """
    try:
        from livekit.plugins import silero  # VAD already imported; whisper is separate
        # livekit-plugins-openai ships a WhisperSTT that can point to a local Whisper endpoint
        # For true offline we use a thin adapter around faster-whisper
        from plugins._faster_whisper_stt import FasterWhisperSTT

        model_size = os.getenv("WHISPER_MODEL", "base")
        logger.info(f"STT: faster-whisper ({model_size}) – local/offline")
        return FasterWhisperSTT(model_size=model_size)
    except ImportError:
        logger.warning("faster-whisper not installed. Using deepgram as fallback.")
        return _build_cloud_stt()
