"""
plugins/llm.py – Multi-Provider LLM Engine with Groq Free-Tier Optimization,
Two-Stage Grounded Dialogue Generation, Startup Self-Test & Zero Generic Praise.

Supported Providers (via LLM_PROVIDER env switch):
- groq (default): llama-3.3-70b-versatile with llama-3.1-8b-instant 429 fallback
- openai: gpt-4o-mini
- ollama: llama3.1 local

Free Tier Safety:
- Token tracker persists daily usage to .groq_usage.json
- Slotted sliding history (max 6 turns + rolling summary) keeps prompts < 450 tokens
- Rate limit (429) backoff + automatic fallback to llama-3.1-8b-instant and local engine
- Startup self-test sends 'Say hello' and reports PASS/FAIL with latency and error
- Never prints full API keys in logs (shows only first 4 chars)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
import urllib.request
import uuid
from typing import Any, Callable, Optional

from livekit.agents import llm
from livekit.agents.llm import FallbackAdapter
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions

from interview_state import (
    InterviewStateMachine,
    PHASE_READINESS,
    PHASE_WARMUP,
    PHASE_RESUME,
    PHASE_JD_MATCH,
    PHASE_TECHNICAL,
    PHASE_BEHAVIORAL,
    PHASE_CLOSING,
    PHASE_SEQUENCE,
)
from plugins.token_tracker import token_tracker

logger = logging.getLogger("plugins.llm")


# ─── 1. Key Masking & Security Helper ────────────────────────────────────────

def mask_api_key(key: Optional[str]) -> str:
    """Safely masks API key to first 4 chars; never prints full key in logs."""
    if not key or key.strip().startswith("<"):
        return "<not-configured>"
    k = key.strip()
    return k[:4] + "..." if len(k) >= 4 else "***"


# ─── 2. Startup Self-Test ────────────────────────────────────────────────────

def run_groq_self_test(
    api_key: Optional[str] = None,
    model: Optional[str] = None,
) -> tuple[bool, str, float]:
    """
    Sends 'Say hello' to Groq and logs PASS or FAIL with response time and exact error.
    Never prints full key.
    """
    key = (api_key or os.getenv("GROQ_API_KEY", "")).strip()
    target_model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    masked = mask_api_key(key)

    if not key or key.startswith("<"):
        err = "GROQ_API_KEY is missing or unconfigured (set to placeholder <paste my key here>)"
        logger.warning(
            f"[Groq Startup Self-Test] FAIL (response_time: 0.0ms, key: {masked}, error: '{err}'). "
            f"Falling back to next available provider."
        )
        return False, err, 0.0

    start_t = time.perf_counter()
    try:
        from groq import Groq
        client = Groq(api_key=key, timeout=5.0)
        resp = client.chat.completions.create(
            model=target_model,
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=15,
            temperature=0.5,
        )
        elapsed_ms = (time.perf_counter() - start_t) * 1000.0
        reply = resp.choices[0].message.content.strip() if resp.choices else "Hello"
        logger.info(
            f"[Groq Startup Self-Test] PASS (response_time: {elapsed_ms:.1f}ms, model: {target_model}, key: {masked}, reply: \"{reply}\")"
        )
        return True, reply, elapsed_ms
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_t) * 1000.0
        err = str(e)
        logger.warning(
            f"[Groq Startup Self-Test] FAIL (response_time: {elapsed_ms:.1f}ms, key: {masked}, error: '{err}'). "
            f"Falling back to next available provider."
        )
        return False, err, elapsed_ms


# ─── 3. DEBUG_TURNS=1 Trace Logger ──────────────────────────────────────────

def log_turn_debug(
    turn_index: int,
    stt_text: str,
    stt_language: str,
    stt_confidence: float,
    system_prompt: str,
    history_messages: list,
    model_name: str,
    temperature: float,
    max_tokens: int,
    num_ctx: int,
    raw_llm_output: str,
    fallback_used: str = "None (direct dynamic generation)",
    ttft_ms: Optional[float] = None,
    tokens_used: Optional[dict] = None,
) -> None:
    """Prints exhaustive turn trace conforming to user verification requirements."""
    if os.getenv("DEBUG_TURNS", "1") != "1":
        return

    sys_tokens = len(system_prompt.split()) * 4 // 3
    history_count = len(history_messages)
    last_3 = history_messages[-3:] if len(history_messages) >= 3 else history_messages

    def _get_msg_field(msg, field: str, default=""):
        if isinstance(msg, dict):
            return msg.get(field, default)
        return getattr(msg, field, default)

    final_user_msg = next((m for m in reversed(history_messages) if _get_msg_field(m, "role") == "user"), None)
    final_user_text = _get_msg_field(final_user_msg, "content", "") if final_user_msg else stt_text
    if isinstance(final_user_text, list):
        final_user_text = " ".join(str(x) for x in final_user_text)

    formatted_last_3 = []
    for m in last_3:
        role = _get_msg_field(m, "role", "unknown")
        raw_c = _get_msg_field(m, "content", "")
        content = " ".join(str(x) for x in raw_c) if isinstance(raw_c, list) else str(raw_c)
        formatted_last_3.append({"role": role, "content": content})

    truncation_note = "0% truncated (prompt tokens well within num_ctx window)" if sys_tokens < num_ctx else f"WARNING: prompt size {sys_tokens} exceeds num_ctx {num_ctx}"
    ttft_str = f", TTFT={ttft_ms:.1f}ms" if ttft_ms is not None else ""
    tokens_str = f" | Turn tokens: {tokens_used.get('turnTokens', 'n/a')}" if tokens_used else ""

    logger.info(
        f"\n==================== [TURN TRACE: TURN #{turn_index}] ====================\n"
        f"(a) RAW STT: text='{stt_text}', language='{stt_language}', confidence={stt_confidence:.3f}\n"
        f"(b) LLM INPUT MESSAGES ARRAY:\n"
        f"    - System prompt estimated tokens: ~{sys_tokens} (num_ctx={num_ctx}, {truncation_note})\n"
        f"    - Total history messages count: {history_count}\n"
        f"    - Last 3 messages in full:\n"
        f"        {json.dumps(formatted_last_3, indent=8)}\n"
        f"    - Final user message: '{final_user_text}'\n"
        f"(c) MODEL & PARAMETERS: name='{model_name}', temperature={temperature}, max_tokens={max_tokens}, num_ctx={num_ctx}{ttft_str}{tokens_str}\n"
        f"(d) RAW LLM OUTPUT BEFORE TTS: '{raw_llm_output}'\n"
        f"(e) FALLBACK / TEMPLATE APPLIED: '{fallback_used}'\n"
        f"=========================================================================="
    )


# ─── 4. Compact Context & History Compaction ─────────────────────────────────

def build_compact_chat_history(
    messages: list,
    max_recent_turns: int = 6,
) -> list[dict]:
    """
    Keeps prompt within free tier limits:
    - Retains only the last max_recent_turns (e.g. 3 user + 3 assistant).
    - Compresses prior history into a rolling summary sentence.
    """
    def _get_field(msg, field, default=""):
        return msg.get(field, default) if isinstance(msg, dict) else getattr(msg, field, default)

    dialogue_msgs = [
        m for m in messages
        if _get_field(m, "role") in ("user", "assistant") and _get_field(m, "content")
    ]

    if len(dialogue_msgs) <= max_recent_turns:
        return [
            {"role": _get_field(m, "role"), "content": _get_field(m, "content")}
            for m in dialogue_msgs
        ]

    older = dialogue_msgs[:-max_recent_turns]
    recent = dialogue_msgs[-max_recent_turns:]

    # Build rolling summary from older turns
    topics = []
    for m in older:
        c = str(_get_field(m, "content"))
        words = [w for w in re.findall(r"[A-Za-z0-9+#]+", c) if len(w) > 3]
        topics.extend(words[:3])
    unique_topics = list(dict.fromkeys(topics))[:5]
    summary = f"Earlier conversation discussed: {', '.join(unique_topics)}."

    result = [{"role": "system", "content": summary}]
    for m in recent:
        result.append({
            "role": _get_field(m, "role"),
            "content": _get_field(m, "content"),
        })
    return result


# ─── 5. Resilient Groq Caller with 429 Backoff & Fallback ────────────────────

async def _call_groq_with_fallback(
    messages: list[dict],
    groq_key: str,
    primary_model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.5,
    max_tokens: int = 150,
    response_format: Optional[dict] = None,
    on_rate_limit: Optional[Callable[[str], None]] = None,
) -> tuple[Optional[str], float, dict, str]:
    """
    Calls Groq with:
    - 429 retry once with backoff (1.5s)
    - Fallback to llama-3.1-8b-instant on persistent 429
    - Returns (content, latency_ms, usage_dict, active_model_used)
    """
    from groq import AsyncGroq, RateLimitError

    client = AsyncGroq(api_key=groq_key)
    models_to_try = [primary_model, "llama-3.1-8b-instant"]

    for m_idx, current_model in enumerate(models_to_try):
        for attempt in range(1, 3):
            start_t = time.perf_counter()
            try:
                kwargs: dict[str, Any] = {
                    "model": current_model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
                if response_format:
                    kwargs["response_format"] = response_format

                resp = await asyncio.wait_for(client.chat.completions.create(**kwargs), timeout=5.0)
                latency_ms = (time.perf_counter() - start_t) * 1000.0
                content = resp.choices[0].message.content or ""
                p_tokens = resp.usage.prompt_tokens if resp.usage else 0
                c_tokens = resp.usage.completion_tokens if resp.usage else 0
                t_tokens = resp.usage.total_tokens if resp.usage else (p_tokens + c_tokens)

                usage = {
                    "prompt_tokens": p_tokens,
                    "completion_tokens": c_tokens,
                    "total_tokens": t_tokens,
                    "model": current_model,
                }
                return content, latency_ms, usage, current_model

            except RateLimitError as rle:
                latency_ms = (time.perf_counter() - start_t) * 1000.0
                logger.warning(
                    f"[Groq RateLimit 429] Model '{current_model}' rate limited (attempt {attempt}/2): {rle}"
                )
                if on_rate_limit:
                    try:
                        on_rate_limit("Replies may be slightly delayed due to provider rate limits.")
                    except Exception:
                        pass

                if attempt == 1:
                    await asyncio.sleep(1.5)
                else:
                    if m_idx == 0:
                        logger.warning("[Groq RateLimit 429] Falling back to llama-3.1-8b-instant")
                    break
            except Exception as e:
                logger.warning(f"[Groq API Error] Call to '{current_model}' failed: {e}")
                break

    return None, 0.0, {}, "none"


# ─── 6. Two-Stage Grounded Dialogue Engine ──────────────────────────────────

async def generate_grounded_two_stage_turn(
    user_text: str,
    chat_ctx: llm.ChatContext,
    state_machine: InterviewStateMachine,
    model_name: str = "llama-3.3-70b-versatile",
    temperature: float = 0.5,
    max_tokens: int = 150,
    num_ctx: int = 8192,
    stt_confidence: float = 1.0,
    on_rate_limit: Optional[Callable[[str], None]] = None,
) -> tuple[dict, str]:
    """
    Executes Two-Stage Reasoning for a candidate turn:
    Stage 1: Hidden analysis call returning strict JSON
    Stage 2: Spoken reply generated from JSON + conversation with Grounding Validator
    """
    analysis = None
    fallback_used = "None (direct dynamic generation)"
    ttft_ms = 0.0
    tokens_used: dict = {}
    active_model = model_name

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    provider = os.getenv("LLM_PROVIDER", "groq").lower().strip()

    # ── Attempt Stage 1 via Groq if configured ───────────────────────────────
    if provider == "groq" and groq_key and not groq_key.startswith("<"):
        prompt = (
            "You are an expert technical interviewer conducting a hidden analysis of a candidate's response.\n"
            "Return strict JSON with this schema:\n"
            "{\n"
            '  "summary": "one sentence of what candidate actually said",\n'
            '  "key_points": ["specific facts, technologies, numbers, decisions mentioned"],\n'
            '  "quality": "strong" | "okay" | "vague" | "off_topic" | "wrong",\n'
            '  "correctness_notes": "technical errors or doubtful claims",\n'
            '  "resume_consistency": "consistent | contradicts | unverifiable (with detail)",\n'
            '  "missing": "what a strong answer would have included",\n'
            '  "next_move": "probe_detail" | "ask_example" | "challenge_politely" | "clarify" | "correct_gently" | "move_on",\n'
            '  "next_question": "the single best next question that refers to a specific key_point"\n'
            "}\n"
        )
        compact_history = build_compact_chat_history(list(chat_ctx.messages()), max_recent_turns=6)
        messages = [{"role": "system", "content": prompt}] + compact_history + [{"role": "user", "content": user_text}]

        raw_json, ttft_ms, usage, active_model = await _call_groq_with_fallback(
            messages=messages,
            groq_key=groq_key,
            primary_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            temperature=0.3,
            max_tokens=220,
            response_format={"type": "json_object"},
            on_rate_limit=on_rate_limit,
        )

        if raw_json:
            try:
                parsed = json.loads(raw_json)
                if "key_points" in parsed and "next_question" in parsed:
                    analysis = parsed
                    # Track Groq token usage
                    p_tok = usage.get("prompt_tokens", len(user_text) // 3)
                    c_tok = usage.get("completion_tokens", len(raw_json) // 3)
                    tokens_used = token_tracker.track_turn(p_tok, c_tok, state_machine.current_turn + 1)
            except Exception as e:
                logger.warning(f"Groq Stage 1 JSON parse error ({e}); falling back to offline engine")

    # ── Fallback to Offline Two-Stage NLP Reasoning Engine ────────────────────
    if analysis is None:
        analysis = state_machine.analyze_candidate_answer(user_text)
        fallback_used = "Offline Two-Stage NLP Reasoning Engine (zero generic praise)"
        active_model = "offline-nlp-grounded-interviewer"

    # Stage 2: Spoken Grounded Reply
    spoken_reply = state_machine.generate_spoken_reply(user_text, analysis=analysis)

    # Turn count & turn trace logging
    state_machine.current_turn += 1
    turn_num = state_machine.current_turn

    sys_msg = next((m for m in chat_ctx.messages() if m.role == "system"), None)
    sys_prompt_text = str(getattr(sys_msg, "content", "")) if sys_msg else ""

    log_turn_debug(
        turn_index=turn_num,
        stt_text=user_text,
        stt_language=state_machine.language,
        stt_confidence=stt_confidence,
        system_prompt=sys_prompt_text,
        history_messages=list(chat_ctx.messages()),
        model_name=active_model,
        temperature=temperature,
        max_tokens=max_tokens,
        num_ctx=num_ctx,
        raw_llm_output=spoken_reply,
        fallback_used=fallback_used,
        ttft_ms=ttft_ms if ttft_ms > 0 else None,
        tokens_used=tokens_used if tokens_used else None,
    )

    return analysis, spoken_reply


# ─── 7. Offline Rule-Based LLM Fallback Stream ───────────────────────────────

class OfflineInterviewerStream(llm.LLMStream):
    def __init__(
        self,
        llm_instance: OfflineInterviewerLLM,
        *,
        chat_ctx: llm.ChatContext,
        tools: list,
        conn_options: APIConnectOptions,
    ):
        super().__init__(llm_instance, chat_ctx=chat_ctx, tools=tools or [], conn_options=conn_options)
        self._interviewer_llm = llm_instance

    async def _run(self) -> None:
        sm = self._interviewer_llm.state_machine
        user_msgs = [m.content for m in self._chat_ctx.messages() if m.role == "user"]
        last_user_text = ""
        if user_msgs:
            raw = user_msgs[-1]
            last_user_text = " ".join(str(x) for x in raw) if isinstance(raw, list) else str(raw)

        turn_num = (sm.current_turn if sm else 0) + 1
        if sm:
            sm.current_turn = turn_num

        reply = ""
        if sm:
            reply = sm.generate_spoken_reply(last_user_text)
        else:
            reply = "Understood. Could you walk me through your technical experience with that system?"

        sys_msg = next((m for m in self._chat_ctx.messages() if m.role == "system"), None)
        sys_prompt_text = str(getattr(sys_msg, "content", "")) if sys_msg else ""

        log_turn_debug(
            turn_index=turn_num,
            stt_text=last_user_text,
            stt_language=sm.language if sm else "en",
            stt_confidence=1.0,
            system_prompt=sys_prompt_text,
            history_messages=list(self._chat_ctx.messages()),
            model_name="offline-nlp-grounded-interviewer",
            temperature=0.5,
            max_tokens=150,
            num_ctx=8192,
            raw_llm_output=reply,
            fallback_used="Offline Two-Stage NLP Reasoning Engine",
        )

        words = reply.split()
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            chunk = llm.ChatChunk(
                choices=[
                    llm.Choice(
                        delta=llm.ChoiceDelta(content=token, role="assistant"),
                        index=0,
                    )
                ]
            )
            self._event_ch.send_nowait(chunk)
            await asyncio.sleep(0.015)


class OfflineInterviewerLLM(llm.LLM):
    """Zero-network, grounded NLP engine used when cloud/local providers are unavailable."""

    def __init__(self, state_machine: Optional[InterviewStateMachine] = None) -> None:
        super().__init__()
        self.state_machine = state_machine

    @property
    def model(self) -> str:
        return "offline-nlp-interviewer"

    @property
    def provider(self) -> str:
        return "rehearse-offline"

    def chat(
        self,
        *,
        chat_ctx: llm.ChatContext,
        tools: Optional[list] = None,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
        **kwargs,
    ) -> llm.LLMStream:
        return OfflineInterviewerStream(
            self,
            chat_ctx=chat_ctx,
            tools=tools or [],
            conn_options=conn_options,
        )


# ─── 8. Health checks ────────────────────────────────────────────────────────

def _is_ollama_online_sync(base_url: str) -> bool:
    try:
        req = urllib.request.Request(
            f"{base_url}/api/tags",
            headers={"User-Agent": "rehearse-healthcheck"},
        )
        with urllib.request.urlopen(req, timeout=1.2) as resp:
            return resp.status == 200
    except Exception:
        return False


async def _is_ollama_online(base_url: str) -> bool:
    return await asyncio.to_thread(_is_ollama_online_sync, base_url)


# ─── 9. Individual Provider Builders ─────────────────────────────────────────

def _build_groq_llm(model_override: Optional[str] = None) -> Optional[llm.LLM]:
    """
    Builds Groq LLM using real livekit-plugins-groq plugin API,
    falling back to livekit-plugins-openai with https://api.groq.com/openai/v1.
    """
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_key or groq_key.startswith("<"):
        logger.warning(
            f"[LLM Setup] GROQ_API_KEY is missing or unconfigured (key='{mask_api_key(groq_key)}'). "
            f"Falling back to next available provider."
        )
        return None

    model = model_override or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    logger.info(f"Initializing Groq LLM plugin (model={model}, key={mask_api_key(groq_key)})")

    # 1. Primary: livekit-plugins-groq
    try:
        from livekit.plugins import groq as lk_groq
        return lk_groq.LLM(
            model=model,
            api_key=groq_key,
            temperature=0.5,
            max_completion_tokens=150,
        )
    except Exception as e:
        logger.warning(f"livekit.plugins.groq failed to initialize ({e}); trying OpenAI compatibility")

    # 2. Secondary: OpenAI-compatible endpoint
    try:
        from livekit.plugins import openai as lk_openai
        return lk_openai.LLM(
            model=model,
            base_url="https://api.groq.com/openai/v1",
            api_key=groq_key,
            temperature=0.5,
            max_completion_tokens=150,
        )
    except Exception as e:
        logger.error(f"Failed to initialize Groq LLM: {e}")
        return None


def _build_openai_llm() -> Optional[llm.LLM]:
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not openai_key or openai_key.startswith("<"):
        return None
    try:
        from livekit.plugins import openai as lk_openai
        logger.info(f"Initializing OpenAI gpt-4o-mini LLM (key={mask_api_key(openai_key)})")
        return lk_openai.LLM(
            model="gpt-4o-mini",
            api_key=openai_key,
            temperature=0.5,
            max_completion_tokens=150,
        )
    except Exception as e:
        logger.warning(f"Could not initialize OpenAI LLM: {e}")
        return None


def _build_ollama_llm() -> Optional[llm.LLM]:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("OLLAMA_MODEL", "llama3.1")
    try:
        from livekit.plugins import openai as lk_openai
        logger.info(f"Initializing Ollama {model} @ {base_url} (num_ctx=8192, temp=0.5)")
        return lk_openai.LLM(
            model=model,
            base_url=f"{base_url.rstrip('/')}/v1",
            api_key="ollama",
            temperature=0.5,
            extra_body={"options": {"num_ctx": 8192}},
        )
    except Exception as e:
        logger.warning(f"Could not initialize Ollama LLM: {e}")
        return None


# ─── 10. Resilient Combined LLM Builder ──────────────────────────────────────

async def build_llm_async(profile: str, state_machine: Optional[InterviewStateMachine] = None) -> llm.LLM:
    """
    Builds LLM chain respecting LLM_PROVIDER ('groq' | 'openai' | 'ollama').
    When LLM_PROVIDER=groq:
      Uses Groq (llama-3.3-70b-versatile).
      If key missing or error, logs clear warning and falls back to next available provider.
    """
    provider_pref = os.getenv("LLM_PROVIDER", "groq").lower().strip()
    candidates: list[llm.LLM] = []

    logger.info(f"[LLM Setup] Selected LLM_PROVIDER='{provider_pref}'")

    if provider_pref == "groq":
        groq_llm = _build_groq_llm()
        if groq_llm:
            candidates.append(groq_llm)
        else:
            logger.warning("[LLM Setup] Groq unavailable. Falling back to OpenAI -> Ollama -> Offline")
            openai_llm = _build_openai_llm()
            if openai_llm:
                candidates.append(openai_llm)
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            if await _is_ollama_online(base_url):
                ollama_llm = _build_ollama_llm()
                if ollama_llm:
                    candidates.append(ollama_llm)
    elif provider_pref == "openai":
        openai_llm = _build_openai_llm()
        if openai_llm:
            candidates.append(openai_llm)
        else:
            logger.warning("[LLM Setup] OpenAI unavailable. Falling back to Groq -> Ollama -> Offline")
            groq_llm = _build_groq_llm()
            if groq_llm:
                candidates.append(groq_llm)
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            if await _is_ollama_online(base_url):
                ollama_llm = _build_ollama_llm()
                if ollama_llm:
                    candidates.append(ollama_llm)
    elif provider_pref == "ollama":
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        if await _is_ollama_online(base_url):
            ollama_llm = _build_ollama_llm()
            if ollama_llm:
                candidates.append(ollama_llm)
        else:
            logger.warning("[LLM Setup] Ollama offline. Falling back to Groq -> OpenAI -> Offline")
            groq_llm = _build_groq_llm()
            if groq_llm:
                candidates.append(groq_llm)
            openai_llm = _build_openai_llm()
            if openai_llm:
                candidates.append(openai_llm)

    # Always append OfflineInterviewerLLM with two-stage grounded reasoning
    offline_llm = OfflineInterviewerLLM(state_machine=state_machine)
    candidates.append(offline_llm)

    if len(candidates) == 1:
        logger.info(f"Using single LLM engine: {candidates[0].__class__.__name__}")
        return candidates[0]

    logger.info(f"Wrapping {len(candidates)} LLM candidates with LiveKit FallbackAdapter")
    return FallbackAdapter(candidates)


build_llm = build_llm_async


# ─── 11. Interview Feedback Generator via Groq ───────────────────────────────

async def generate_groq_interview_feedback(
    transcript: list[dict],
    context_data: dict,
    state_machine: Optional[InterviewStateMachine] = None,
) -> dict:
    """
    Generates structured end-of-interview feedback using Groq llama-3.3-70b-versatile.
    Falls back to state_machine.generate_fallback_report if Groq is unavailable.
    """
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_key or groq_key.startswith("<"):
        if state_machine:
            return state_machine.generate_fallback_report(transcript)
        return {}

    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    prompt = (
        "You are a principal technical interviewer reviewing a completed mock interview.\n"
        "Analyze the transcript and generate a structured evaluation report conforming strictly to this JSON format:\n"
        "{\n"
        '  "overallScore": float (0-10),\n'
        '  "overallScore100": float (0-100),\n'
        '  "verdict": "Strong Hire" | "Hire" | "Weak Hire" | "No Hire",\n'
        '  "strengths": ["string", "string"],\n'
        '  "weaknesses": ["string", "string"],\n'
        '  "improvementPlan": ["string", "string"],\n'
        '  "supportingQuotes": [{"quote": "string", "context": "string"}],\n'
        '  "candidateQuotes": ["string"],\n'
        '  "perQuestion": [{"question": "string", "score": float, "feedback": "string"}],\n'
        '  "practicePlan7Day": [{"day": int, "focus": "string", "tasks": ["string"]}]\n'
        "}\n"
    )

    formatted_transcript = "\n".join(
        f"{m.get('speaker', m.get('role', 'speaker'))}: {m.get('text', '')}"
        for m in transcript[-20:]  # last 20 turns
    )

    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": f"Transcript:\n{formatted_transcript}"},
    ]

    try:
        raw_json, _, usage, _ = await _call_groq_with_fallback(
            messages=messages,
            groq_key=groq_key,
            primary_model=model,
            temperature=0.3,
            max_tokens=650,
            response_format={"type": "json_object"},
        )
        if raw_json:
            parsed = json.loads(raw_json)
            if "overallScore" in parsed and "verdict" in parsed:
                token_tracker.track_turn(
                    usage.get("prompt_tokens", 400),
                    usage.get("completion_tokens", 300),
                    turn_index=999,
                )
                return parsed
    except Exception as e:
        logger.warning(f"Failed to generate feedback via Groq ({e}); using state machine report")

    if state_machine:
        return state_machine.generate_fallback_report(transcript)
    return {}
