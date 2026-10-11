"""
plugins/llm.py – Pluggable LLM

PROFILE=cloud  → OpenAI gpt-4o-mini
PROFILE=local  → Ollama (llama3.1 by default, zero paid APIs)
"""

import os
import logging
from livekit.agents import llm as agents_llm

logger = logging.getLogger("plugins.llm")


def build_llm(profile: str) -> agents_llm.LLM:
    if profile == "local":
        return _build_ollama_llm()
    return _build_openai_llm()


def _build_openai_llm() -> agents_llm.LLM:
    from livekit.plugins import openai as lk_openai

    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set – falling back to Ollama (local)")
        return _build_ollama_llm()

    logger.info("LLM: OpenAI gpt-4o-mini (cloud)")
    return lk_openai.LLM(model="gpt-4o-mini", api_key=api_key)


def _build_ollama_llm() -> agents_llm.LLM:
    """
    Ollama exposes an OpenAI-compatible API, so we can reuse livekit-plugins-openai
    with a custom base_url pointing at the local Ollama server.

    Install Ollama on Windows: https://ollama.com/download
    Pull the model:  ollama pull llama3.1
    """
    from livekit.plugins import openai as lk_openai

    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("OLLAMA_MODEL", "llama3.1")
    logger.info(f"LLM: Ollama {model} @ {base_url} (local)")

    return lk_openai.LLM(
        model=model,
        base_url=f"{base_url}/v1",
        api_key="ollama",  # Ollama ignores the key but the SDK requires a non-empty string
    )
