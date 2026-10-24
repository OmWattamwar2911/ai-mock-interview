"""
plugins/tts.py – Pluggable Text-to-Speech

Priority order (first available wins):
  PROFILE=local:
    1. Piper      – fully offline binary (if found on PATH)
    2. Edge TTS   – free, no API key, Microsoft Edge neural voices (always works)

  PROFILE=cloud:
    1. ElevenLabs – if ELEVENLABS_API_KEY is set
    2. OpenAI TTS – if OPENAI_API_KEY is set (paid)
    3. Edge TTS   – free fallback

NOTE: PROFILE=local intentionally skips paid cloud TTS providers (OpenAI/ElevenLabs)
      even if their keys are present. This prevents quota errors from blocking the bot.
      Edge TTS requires an internet connection but no API key.
"""

import os
import shutil
import logging
from livekit.agents import tts as agents_tts

logger = logging.getLogger("plugins.tts")


def build_tts(profile: str, language: str = "en") -> agents_tts.TTS:
    if profile == "local":
        executable = os.getenv("PIPER_EXECUTABLE", "piper")
        has_piper = shutil.which(executable) is not None or os.path.exists(executable)

        if has_piper:
            return _build_piper_tts(language=language)

        # PROFILE=local + no Piper → go directly to free EdgeTTS.
        # Do NOT fall through to paid providers; quota errors cause the FFI to hang/panic.
        logger.warning(
            f"Piper binary '{executable}' not found. "
            "Using Edge TTS (free, no API key required)."
        )
        return _build_edge_tts(language=language)

    return _build_best_tts(language=language)


def _build_best_tts(language: str = "en") -> agents_tts.TTS:
    """Try providers in order: Deepgram Aura / Groq / ElevenLabs → OpenAI → EdgeTTS (free)."""

    # 1. Deepgram Aura-2 (ultra-low latency streaming for English)
    deepgram_key = os.environ.get("DEEPGRAM_API_KEY", "").strip()
    if deepgram_key and language == "en":
        try:
            from livekit.plugins import deepgram
            logger.info("TTS Provider Chosen: Deepgram Aura-2 aura-asteria-en (cloud streaming, language=en)")
            return deepgram.TTS(api_key=deepgram_key, model="aura-asteria-en")
        except Exception as e:
            logger.warning(f"Failed to initialize Deepgram TTS: {e}")

    # 2. ElevenLabs
    elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if elevenlabs_key:
        try:
            from livekit.plugins import elevenlabs

            voice_id = os.getenv("ELEVENLABS_VOICE_ID", "Rachel")
            model = "eleven_multilingual_v2" if language != "en" else "eleven_turbo_v2"
            logger.info(
                f"TTS Provider Chosen: ElevenLabs voice={voice_id} model={model} (cloud, language={language})"
            )
            return elevenlabs.TTS(api_key=elevenlabs_key, voice_id=voice_id, model=model)
        except Exception as e:
            logger.warning(f"Failed to initialize ElevenLabs TTS: {e}")
        except Exception as e:
            logger.warning(f"Failed to initialize ElevenLabs TTS: {e}")

    # 2. Edge TTS – free, ultra-reliable, zero OpenAI quota dependency
    return _build_edge_tts(language=language)

    # 3. OpenAI TTS (disabled: quota credit_balance_exhausted)
    # openai_key = os.environ.get("OPENAI_API_KEY", "")
    # if openai_key:
    #     try:
    #         from livekit.plugins import openai as lk_openai
    #         return lk_openai.TTS(api_key=openai_key, voice="alloy")
    #     except Exception as e:
    #         logger.warning(f"Failed to initialize OpenAI TTS: {e}")


def _build_edge_tts(language: str = "en") -> agents_tts.TTS:
    try:
        from plugins._edge_tts import EdgeTTS

        logger.info(f"TTS Provider Chosen: Microsoft Edge TTS (free, language={language})")
        return EdgeTTS(language=language)
    except Exception as e:
        logger.error(
            f"Edge TTS failed to initialize: {e}. "
            "No TTS provider available – install edge-tts (`pip install edge-tts`) or "
            "set ELEVENLABS_API_KEY / OPENAI_API_KEY."
        )
        raise RuntimeError("No TTS provider is available") from e


def _build_piper_tts(language: str = "en") -> agents_tts.TTS:
    try:
        from plugins._piper_tts import PiperTTS

        executable = os.getenv("PIPER_EXECUTABLE", "piper")
        voice_model = os.getenv("PIPER_VOICE_MODEL", "en_US-lessac-medium.onnx")
        logger.info(f"TTS Provider Chosen: Piper ({voice_model}) – local/offline")
        return PiperTTS(executable=executable, voice_model=voice_model)
    except Exception as e:
        logger.warning(f"Could not initialize PiperTTS: {e}. Falling back to best available TTS.")
        return _build_best_tts(language=language)
