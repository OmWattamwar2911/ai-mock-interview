"""
plugins/turn_timing.py - per-turn latency timeline (DEBUG_TURNS=1).

Prints exactly one line per turn:
  TURN n | user_end->endpoint_fire Xs | stt_final Xs | llm_first_token Xs | llm_total Xs |
  tts_first_audio Xs | audio_published Xs | TOTAL_end_of_speech_to_first_audio Xs | llm_calls N | prompt_tokens N

Definitions (all measured inside the running worker, using livekit-agents 1.8.9 session events):
  user_end              VAD "speaking -> listening" event (VAD already waited vad_hold seconds of silence)
  user_end->endpoint_fire   user_end until llm_node is invoked (endpointing + turn detector + STT wait)
  stt_final             user_end until the final transcript event (negative = transcript arrived earlier)
  llm_first_token       llm_node start until first token from the model
  llm_total             llm_node start until the last token / analysis JSON
  tts_first_audio       first sentence handed to TTS until TTS reports its first byte (TTSMetrics.ttfb)
  audio_published       first sentence handed to TTS until the agent state flips to "speaking"
  TOTAL                 user_end -> agent "speaking" state, PLUS vad_hold (true end of speech -> first audio)
"""
from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Optional

logger = logging.getLogger("turn_timing")

LOG_FILE = Path(__file__).resolve().parent.parent / "logs" / "turn_timings.jsonl"


def _pct(vals: list[float], p: float) -> float:
    s = sorted(vals)
    if not s:
        return float("nan")
    k = (len(s) - 1) * p / 100.0
    f, c = int(k), min(int(k) + 1, len(s) - 1)
    return s[f] + (s[c] - s[f]) * (k - f)


class TurnTimer:
    def __init__(self, vad_hold_s: float = 0.55):
        self.enabled = os.getenv("DEBUG_TURNS", "1") == "1"
        self.vad_hold = vad_hold_s
        self.n = 0
        self.cur: Optional[dict] = None
        self.done: list[dict] = []

    # ── marks from the custom llm_node ──────────────────────────────────────
    def _ensure(self) -> dict:
        if self.cur is None:
            self.cur = {"t_user_end": None}
        return self.cur

    def mark(self, key: str, value: Optional[float] = None, *, only_first: bool = True) -> None:
        c = self._ensure()
        if only_first and c.get(key) is not None:
            return
        c[key] = value if value is not None else time.time()

    def mark_user_speech_end(self) -> None:
        self.cur = {"t_user_end": time.time()}

    def mark_endpoint_fire(self) -> None:
        self.mark("t_endpoint_fire", time.time())

    def mark_stt_final(self) -> None:
        self.mark("t_stt_final", time.time())

    def mark_llm_start(self) -> None:
        self.mark("t_llm_start", time.time())
        self.incr("llm_calls", 1)

    def mark_llm_first_token(self) -> None:
        self.mark("t_llm_first_token", time.time())

    def mark_tts_start(self) -> None:
        self.mark("t_first_sentence", time.time())

    def mark_llm_end(self) -> None:
        self.mark("t_llm_done", time.time())

    def mark_audio_published(self) -> None:
        if self.cur is not None and self.cur.get("t_first_audio") is None:
            self.cur["t_first_audio"] = time.time()

    def format_turn_log(self, turn_num: int) -> str:
        c = self.cur or {}
        ue = c.get("t_user_end") or time.time()
        f = lambda v: "n/a" if v is None else f"{v:.2f}s"
        endpoint = None if c.get("t_llm_start") is None else c["t_llm_start"] - ue
        stt_final = None if c.get("t_stt_final") is None else c["t_stt_final"] - ue
        llm_ft = None if c.get("t_llm_first_token") is None or c.get("t_llm_start") is None else c["t_llm_first_token"] - c["t_llm_start"]
        llm_total = None if c.get("t_llm_done") is None or c.get("t_llm_start") is None else c["t_llm_done"] - c["t_llm_start"]
        first_sentence = c.get("t_first_sentence")
        first_audio = c.get("t_first_audio") or time.time()
        published = None if first_sentence is None else first_audio - first_sentence
        total = first_audio - ue + self.vad_hold
        return (
            f"TURN {turn_num} | user_end->endpoint_fire {f(endpoint)} | stt_final {f(stt_final)} | "
            f"llm_first_token {f(llm_ft)} | llm_total {f(llm_total)} | tts_first_audio {f(published)} | "
            f"audio_published {f(published)} | TOTAL_end_of_speech_to_first_audio {total:.2f}s | "
            f"llm_calls {c.get('llm_calls', 1)} | prompt_tokens {c.get('prompt_tokens', 'n/a')}"
        )

    def set(self, key: str, value) -> None:
        self._ensure()[key] = value

    def incr(self, key: str, by: int = 1) -> None:
        c = self._ensure()
        c[key] = c.get(key, 0) + by

    # ── session wiring ──────────────────────────────────────────────────────
    def attach(self, session) -> None:
        @session.on("user_state_changed")
        def _u(ev):
            if getattr(ev, "old_state", "") == "speaking" and getattr(ev, "new_state", "") == "listening":
                self.cur = {"t_user_end": getattr(ev, "created_at", time.time())}

        @session.on("user_input_transcribed")
        def _t(ev):
            if getattr(ev, "is_final", False):
                self.mark("t_stt_final", getattr(ev, "created_at", time.time()))

        @session.on("metrics_collected")
        def _m(ev):
            m = ev.metrics
            kind = getattr(m, "type", "")
            if kind == "eou_metrics":
                self.set("eou_delay", m.end_of_utterance_delay)
                self.set("eou_transcription_delay", m.transcription_delay)
            elif kind == "tts_metrics" and not getattr(m, "cancelled", False):
                if self._ensure().get("tts_ttfb") is None:
                    self.set("tts_ttfb", m.ttfb)
            elif kind == "stt_metrics":
                self.set("stt_duration", m.duration)

        @session.on("agent_state_changed")
        def _a(ev):
            new = getattr(ev, "new_state", "")
            old = getattr(ev, "old_state", "")
            ts = getattr(ev, "created_at", time.time())
            if new == "speaking" and self.cur is not None and self.cur.get("t_first_audio") is None:
                self.cur["t_first_audio"] = ts
            if old == "speaking" and new != "speaking":
                self.finish()

    # ── output ──────────────────────────────────────────────────────────────
    def finish(self) -> None:
        c = self.cur
        self.cur = None
        if not c or c.get("t_first_audio") is None or c.get("t_user_end") is None:
            return  # greeting / say() without a candidate turn
        self.n += 1
        ue = c["t_user_end"]
        f = lambda v: "n/a" if v is None else f"{v:.2f}s"
        endpoint = None if c.get("t_llm_start") is None else c["t_llm_start"] - ue
        stt_final = None if c.get("t_stt_final") is None else c["t_stt_final"] - ue
        llm_ft = None if c.get("t_llm_first_token") is None or c.get("t_llm_start") is None else c["t_llm_first_token"] - c["t_llm_start"]
        llm_total = None if c.get("t_llm_done") is None or c.get("t_llm_start") is None else c["t_llm_done"] - c["t_llm_start"]
        first_sentence = c.get("t_first_sentence")
        published = None if first_sentence is None else c["t_first_audio"] - first_sentence
        total = c["t_first_audio"] - ue + self.vad_hold
        rec = {
            "turn": self.n, "endpoint_fire": endpoint, "stt_final": stt_final, "llm_first_token": llm_ft,
            "llm_total": llm_total, "tts_first_audio": c.get("tts_ttfb"), "audio_published": published,
            "total": total, "llm_calls": c.get("llm_calls", 0), "prompt_tokens": c.get("prompt_tokens"),
            "completion_tokens": c.get("completion_tokens"), "model": c.get("model"),
            "eou_delay": c.get("eou_delay"), "vad_hold": self.vad_hold, "backchannel": bool(c.get("backchannel")),
        }
        self.done.append(rec)
        if self.enabled:
            logger.info(
                f"TURN {self.n} | user_end->endpoint_fire {f(endpoint)} | stt_final {f(stt_final)} | "
                f"llm_first_token {f(llm_ft)} | llm_total {f(llm_total)} | tts_first_audio {f(c.get('tts_ttfb'))} | "
                f"audio_published {f(published)} | TOTAL_end_of_speech_to_first_audio {total:.2f}s | "
                f"llm_calls {c.get('llm_calls', 0)} | prompt_tokens {c.get('prompt_tokens', 'n/a')} | model {c.get('model', 'n/a')}"
            )
            totals = [r["total"] for r in self.done]
            if len(totals) >= 3:
                logger.info(f"TURN-STATS n={len(totals)} TOTAL p50={_pct(totals, 50):.2f}s p95={_pct(totals, 95):.2f}s")
        try:
            LOG_FILE.parent.mkdir(exist_ok=True)
            with LOG_FILE.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(rec) + "\n")
        except Exception:
            pass
