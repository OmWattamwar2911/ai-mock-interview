"""
plugins/tts.py – Pluggable Text-to-Speech

PROFILE=cloud  → ElevenLabs (or OpenAI TTS if ElevenLabs key is absent)
PROFILE=local  → Piper (fully offline, free) – https://github.com/rhasspy/piper
"""

import os
import logging
from livekit.agents import tts as agents_tts

logger = logging.getLogger("plugins.tts")


def build_tts(profile: str) -> agents_tts.TTS:
    if profile == "local":
        return _build_piper_tts()
    return _build_cloud_tts()


def _build_cloud_tts() -> agents_tts.TTS:
    elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if elevenlabs_key:
        from livekit.plugins import elevenlabs

        voice_id = os.getenv("ELEVENLABS_VOICE_ID", "Rachel")
        logger.info(f"TTS: ElevenLabs voice={voice_id} (cloud)")
        return elevenlabs.TTS(api_key=elevenlabs_key, voice_id=voice_id)

    # Fallback to OpenAI TTS when no ElevenLabs key
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if openai_key:
        from livekit.plugins import openai as lk_openai

        logger.info("TTS: OpenAI TTS alloy (cloud fallback)")
        return lk_openai.TTS(api_key=openai_key, voice="alloy")

    logger.warning("No cloud TTS key found – falling back to Piper (local)")
    return _build_piper_tts()


def _build_piper_tts() -> agents_tts.TTS:
    """
    Piper TTS – runs 100% offline on Windows/Linux/Mac.

    Setup on Windows:
      1. Download piper release: https://github.com/rhasspy/piper/releases
      2. Extract and add to PATH, or set PIPER_EXECUTABLE to the full path
      3. Download a voice model (.onnx + .onnx.json) from:
         https://github.com/rhasspy/piper/blob/master/VOICES.md
      4. Set PIPER_VOICE_MODEL to the path of the .onnx file

    This uses a subprocess adapter because livekit-agents does not ship
    a native Piper plugin. We stream raw PCM from piper's stdout.
    """
    try:
        from plugins._piper_tts import PiperTTS

        executable = os.getenv("PIPER_EXECUTABLE", "piper")
        voice_model = os.getenv("PIPER_VOICE_MODEL", "en_US-lessac-medium.onnx")
        logger.info(f"TTS: Piper ({voice_model}) – local/offline")
        return PiperTTS(executable=executable, voice_model=voice_model)
    except ImportError:
        logger.error("PiperTTS adapter not found. Please set PROFILE=cloud or install Piper.")
        raise
