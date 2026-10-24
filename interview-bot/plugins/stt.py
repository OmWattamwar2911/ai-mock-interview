"""
plugins/stt.py – Pluggable Speech-to-Text with Multilingual & Cloud/Local Provider Selection

PROFILE=cloud / STT_PROVIDER=cloud  → Deepgram Nova-2 / OpenAI Whisper (with faster-whisper fallback)
PROFILE=local / STT_PROVIDER=local  → faster-whisper (runs fully offline, beam_size=5, vad_filter=True)
"""

import os
import logging
from typing import Optional
from livekit.agents import stt as agents_stt

logger = logging.getLogger("plugins.stt")


def build_stt(profile: str, language: str = "en", preloaded_model: Optional[object] = None) -> agents_stt.STT:
    stt_provider = os.getenv("STT_PROVIDER", "").strip().lower()
    if stt_provider == "cloud" or profile == "cloud":
        return _build_cloud_stt(language=language, preloaded_model=preloaded_model)
    return _build_local_stt(language=language, preloaded_model=preloaded_model)


def _build_cloud_stt(language: str = "en", preloaded_model: Optional[object] = None) -> agents_stt.STT:
    """Cloud STT: Deepgram Nova-3 / Nova-2, Groq whisper-large-v3-turbo, or OpenAI Whisper."""
    # 1. Deepgram (streaming)
    deepgram_key = os.environ.get("DEEPGRAM_API_KEY", "").strip()
    if deepgram_key:
        try:
            from livekit.plugins import deepgram
            dg_model = "nova-3-general" if language == "en" else "nova-2-general"
            logger.info(f"STT Provider Chosen: Deepgram {dg_model} (streaming cloud, language={language})")
            return deepgram.STT(api_key=deepgram_key, model=dg_model, language=language)
        except Exception as e:
            logger.warning(f"Failed to initialize Deepgram STT: {e}")

    # 2. Groq Whisper (cloud non-streaming, ultra-fast TTFT ~0.35s)
    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    if groq_key:
        try:
            import livekit.plugins.groq as lk_groq
            logger.info(
                f"STT Provider Chosen: Groq whisper-large-v3-turbo (cloud non-streaming, language={language})."
            )
            return lk_groq.STT(model="whisper-large-v3-turbo", api_key=groq_key, language=language)
        except Exception as e:
            logger.warning(f"Failed to initialize Groq STT: {e}")

    # Fall back to faster-whisper (local, free, zero API cost)
    logger.info("Cloud STT unavailable or keys missing; using local faster-whisper STT")
    return _build_local_stt(language=language, preloaded_model=preloaded_model)


def _build_local_stt(language: str = "en", preloaded_model: Optional[object] = None) -> agents_stt.STT:
    """faster-whisper via async worker thread adapter."""
    try:
        from plugins._faster_whisper_stt import FasterWhisperSTT

        model_size = os.getenv("WHISPER_MODEL", "base")
        logger.info(f"STT: faster-whisper ({model_size}, language={language}) – local/offline")
        return FasterWhisperSTT(
            model=preloaded_model,
            model_size=model_size,
            device="cpu",
            compute_type="int8",
            language=language,
        )
    except Exception as e:
        logger.warning(f"Could not load faster-whisper: {e}. Attempting cloud fallback.")
        return _build_cloud_stt(language=language)
