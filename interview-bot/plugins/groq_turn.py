"""
plugins/groq_turn.py - ONE streaming Groq call per turn.

Model output format (see prompts/turn_system.md):
    <spoken reply, max 2 short sentences>
    <<<ANALYSIS>>>
    {json}

* The spoken part is yielded sentence-by-sentence to TTS as soon as each sentence completes.
* The analysis JSON is parsed after the stream ends and only used for the NEXT turn.
* One persistent AsyncGroq/httpx client (keep-alive) is reused for every call.
* The model is resolved at startup against GET /models, so a model the key cannot access
  (HTTP 404 model_not_found) is never called; the first available preferred model is used.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import AsyncIterator, Optional

import httpx

logger = logging.getLogger("plugins.groq_turn")

DELIM = "<<<ANALYSIS>>>"
TURN_SYSTEM = (Path(__file__).resolve().parent.parent / "prompts" / "turn_system.md").read_text(encoding="utf-8")

# Fast, instruction-following models first. Resolved against what the key can actually access.
MODEL_PREFERENCE = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
    "allam-2-7b",
]

_SENT_RE = re.compile(r".+?[.!?]+[\"')\]]*(?=\s|$)", re.S)
MAX_SPOKEN_SENTENCES = 3


@dataclass
class TurnResult:
    reply: str = ""
    analysis: Optional[dict] = None
    raw_analysis: str = ""
    model: str = ""
    ttft: Optional[float] = None
    total: Optional[float] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    first_sentence_at: Optional[float] = None
    fallbacks: list = field(default_factory=list)


def mask(key: str) -> str:
    return (key[:4] + "...") if key and len(key) >= 4 and not key.startswith("<") else "<not-configured>"


def parse_analysis(raw: str) -> Optional[dict]:
    if not raw:
        return None
    s, e = raw.find("{"), raw.rfind("}")
    if s == -1 or e <= s:
        return None
    try:
        data = json.loads(raw[s:e + 1])
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    data.setdefault("key_points", [])
    data.setdefault("quality", "okay")
    data.setdefault("next_move", "probe_detail")
    data.setdefault("resume_consistency", "unverifiable")
    return data


def _clean_spoken(text: str) -> str:
    text = re.sub(r"[*_`#>]+", "", text)
    return re.sub(r"\s+", " ", text).strip()


class GroqTurnEngine:
    def __init__(self) -> None:
        self.key = os.getenv("GROQ_API_KEY", "").strip()
        self.configured_model = os.getenv("GROQ_MODEL", "").strip()
        self.model: Optional[str] = None
        self.available: list[str] = []
        self.fallback_models: list[str] = []
        self._client = None
        self._http: Optional[httpx.AsyncClient] = None
        self.startup_info: dict = {}

    @property
    def usable(self) -> bool:
        return bool(self.key) and not self.key.startswith("<") and self.model is not None

    def _ensure_client(self):
        if self._client is None:
            from groq import AsyncGroq
            # One persistent keep-alive connection pool for every turn.
            self._http = httpx.AsyncClient(
                timeout=httpx.Timeout(12.0, connect=3.0),
                limits=httpx.Limits(max_keepalive_connections=4, keepalive_expiry=120.0),
            )
            self._client = AsyncGroq(api_key=self.key, http_client=self._http, max_retries=0)
        return self._client

    async def startup(self) -> dict:
        """List models (warms DNS/TLS/keep-alive), resolve the model actually used, log it."""
        info = {"provider": "groq", "key": mask(self.key), "configured_model": self.configured_model or "(unset)"}
        if not self.key or self.key.startswith("<"):
            info.update(usable=False, error="GROQ_API_KEY missing/placeholder")
            self.startup_info = info
            return info
        client = self._ensure_client()
        t0 = time.perf_counter()
        try:
            listing = await client.models.list()
            info["models_call_ms"] = round((time.perf_counter() - t0) * 1000)
            self.available = sorted(m.id for m in listing.data)
        except Exception as e:
            info.update(usable=False, error=f"{type(e).__name__}: {str(e)[:160]}")
            self.startup_info = info
            return info
        order = ([self.configured_model] if self.configured_model else []) + MODEL_PREFERENCE
        picks = [m for m in dict.fromkeys(order) if m in self.available]
        if self.configured_model and self.configured_model not in self.available:
            info["configured_model_missing"] = True
            logger.error(
                f"[LLM] GROQ_MODEL='{self.configured_model}' is NOT available to this key (would return 404 "
                f"model_not_found). Available: {self.available}"
            )
        if not picks:
            info.update(usable=False, error=f"no usable chat model in {self.available}")
            self.startup_info = info
            return info
        self.model, self.fallback_models = picks[0], picks[1:3]
        info.update(usable=True, model=self.model, fallbacks=self.fallback_models, available=self.available)
        self.startup_info = info
        return info

    def _extra_params(self, model: Optional[str]) -> dict:
        return {"reasoning_effort": "low"} if model and model.startswith("openai/gpt-oss") else {}

    async def stream_turn(self, messages: list[dict], *, max_tokens: int = 150, temperature: float = 0.5,
                          model: Optional[str] = None) -> AsyncIterator[tuple[str, object]]:
        """Yields ("first_token", t), ("sentence", text)..., then ("done", TurnResult). Retries on 429 backoff then fallback."""
        if not self.model:
            await self.startup()
        client = self._ensure_client()
        candidate_models = [model or self.model] + [m for m in self.fallback_models if m != (model or self.model)]
        
        stream = None
        use_model = candidate_models[0]
        t0 = time.perf_counter()
        
        for m_idx, m_try in enumerate(candidate_models):
            use_model = m_try
            for attempt in range(2):
                try:
                    stream = await client.chat.completions.create(
                        model=use_model, messages=messages, stream=True, temperature=temperature,
                        max_completion_tokens=max_tokens, **self._extra_params(use_model),
                    )
                    break
                except Exception as e:
                    err_str = str(e).lower()
                    if "429" in err_str or "rate_limit" in err_str:
                        logger.warning(f"[Groq 429 RateLimit] Model {use_model} hit limit (attempt {attempt+1}/2). Backing off 1.8s...")
                        await asyncio.sleep(1.8)
                        continue
                    logger.warning(f"[Groq Call Failed] Model {use_model} error: {e}")
                    break
            if stream is not None:
                break
                
        if stream is None:
            raise RuntimeError(f"All Groq models exhausted or rate-limited: {candidate_models}")

        res = TurnResult(model=use_model or "")
        buf = ""
        emitted_upto = 0
        sentences: list[str] = []
        delim_seen = False
        usage = None
        try:
            async for ch in stream:
                xg = getattr(ch, "x_groq", None)
                if xg is not None and getattr(xg, "usage", None):
                    usage = xg.usage
                if not ch.choices:
                    continue
                piece = ch.choices[0].delta.content
                if not piece:
                    continue
                if res.ttft is None:
                    res.ttft = time.perf_counter() - t0
                    yield ("first_token", time.time())
                buf += piece
                di = buf.find(DELIM)
                if di != -1:
                    delim_seen = True
                spoken_region = buf[:di] if di != -1 else buf
                if di == -1:  # hold back a possible partial delimiter at the tail
                    for k in range(min(len(DELIM) - 1, len(spoken_region)), 0, -1):
                        if DELIM.startswith(spoken_region[-k:]):
                            spoken_region = spoken_region[:-k]
                            break
                if len(sentences) < MAX_SPOKEN_SENTENCES:
                    for m in _SENT_RE.finditer(spoken_region, emitted_upto):
                        s = _clean_spoken(m.group(0))
                        emitted_upto = m.end()
                        if s:
                            sentences.append(s)
                            if res.first_sentence_at is None:
                                res.first_sentence_at = time.time()
                            yield ("sentence", s)
                            if len(sentences) >= MAX_SPOKEN_SENTENCES:
                                break
        finally:
            try:
                await stream.close()
            except Exception:
                pass
        res.total = time.perf_counter() - t0
        di = buf.find(DELIM)
        spoken_region = buf[:di] if di != -1 else buf
        tail = _clean_spoken(spoken_region[emitted_upto:]) if len(sentences) < MAX_SPOKEN_SENTENCES else ""
        if tail:
            sentences.append(tail)
            if res.first_sentence_at is None:
                res.first_sentence_at = time.time()
            yield ("sentence", tail)
        res.reply = " ".join(sentences)
        res.raw_analysis = buf[di + len(DELIM):].strip() if di != -1 else ""
        res.analysis = parse_analysis(res.raw_analysis)
        if usage is not None:
            res.prompt_tokens = getattr(usage, "prompt_tokens", None)
            res.completion_tokens = getattr(usage, "completion_tokens", None)
        yield ("done", res)

    async def aclose(self) -> None:
        if self._http is not None:
            await self._http.aclose()
            self._http = None
            self._client = None


# ───────────────────────── prompt assembly ─────────────────────────

def _msg_text(m) -> str:
    c = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
    if isinstance(c, list):
        c = " ".join(str(x) for x in c)
    return str(c or "").replace("\u200b", "").strip()


def build_turn_messages(*, brief: str, chat_msgs: list, user_text: str, summary: str, notes: str,
                        recent_turns: int = 6) -> list[dict]:
    """
    [0] static system prompt + compact interview brief (identical every turn -> prefix stays cacheable)
    [1] rolling summary of older turns (only once history exceeds the window)
    [..] the last `recent_turns` exchanges (older candidate answers trimmed)
    [-2] short dynamic interviewer notes (phase, topic hints, avoid-list, grounding feedback)
    [-1] the candidate's latest transcript, verbatim
    """
    dialogue = [(getattr(m, "role", None) if not isinstance(m, dict) else m.get("role"), _msg_text(m)) for m in chat_msgs]
    dialogue = [(r, t) for r, t in dialogue if r in ("user", "assistant") and t]
    if dialogue and dialogue[-1][0] == "user":
        dialogue = dialogue[:-1]  # latest user message is appended explicitly below
    window = dialogue[-(recent_turns * 2):]
    out: list[dict] = [{"role": "system", "content": TURN_SYSTEM + "\n\n" + brief}]
    older = len(dialogue) - len(window)
    if older > 0 and summary:
        out.append({"role": "system", "content": f"Summary of the {older} earlier messages: {summary}"})
    for i, (r, t) in enumerate(window):
        if r == "user" and i < len(window) - 2 and len(t) > 320:
            t = t[:320] + "..."
        out.append({"role": r, "content": t})
    if notes:
        out.append({"role": "system", "content": notes})
    out.append({"role": "user", "content": user_text})
    return out


# ───────────────────────── grounding validator (background) ─────────────────────────

_WORD = re.compile(r"[A-Za-z][A-Za-z0-9+#./-]{2,}|\d[\d,.%]*")
_STOP = {"the", "and", "with", "for", "that", "this", "you", "your", "have", "was", "were", "are", "from", "about",
         "what", "how", "did", "does", "which", "when", "then", "than", "into", "just", "like", "also", "they"}


def content_tokens(text: str) -> set[str]:
    return {w.lower().strip(".,") for w in _WORD.findall(text or "") if w.lower() not in _STOP}


def validate_grounding(*, reply: str, user_text: str, analysis: Optional[dict], previous_reply: str,
                       asked_questions: list[str]) -> list[str]:
    """Returns a list of problems (empty = fine). Runs OFF the critical path; result feeds the next turn."""
    problems: list[str] = []
    key_points = [str(k) for k in (analysis or {}).get("key_points", [])]
    user_tokens = content_tokens(user_text)
    reply_tokens = content_tokens(reply)
    key_tokens = set().union(*[content_tokens(k) for k in key_points]) if key_points else set()
    if not (reply_tokens & (user_tokens | key_tokens)):
        problems.append("your last reply did not mention any specific word the candidate said")
    q = [s for s in re.split(r"(?<=[.!?])\s+", reply) if s.strip().endswith("?")]
    if len(q) != 1:
        problems.append(f"your last reply had {len(q)} questions; ask exactly one")
    for prev_q in asked_questions[-6:]:
        if q and content_tokens(q[-1]) and len(content_tokens(q[-1]) & content_tokens(prev_q)) / max(1, len(content_tokens(q[-1]))) > 0.8:
            problems.append("your last question repeated an earlier question; ask something new")
            break
    if previous_reply and reply.split()[:3] == previous_reply.split()[:3]:
        problems.append("your last reply started with the same words as the one before; vary the opening")
    return problems
