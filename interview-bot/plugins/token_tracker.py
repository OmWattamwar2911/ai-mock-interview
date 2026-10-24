"""
token_tracker.py – Free-tier token budget tracker for Groq.

Groq Free Tier limits for llama-3.3-70b-versatile:
- ~30 Requests Per Minute (RPM)
- ~100,000 Tokens Per Day (TPD)

Persists daily token counts across worker restarts in interview-bot/.groq_usage.json
and logs turn, session, and daily utilization.
"""

import json
import logging
import os
import threading
import time

logger = logging.getLogger("plugins.token_tracker")

USAGE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".groq_usage.json")
DAILY_FREE_TIER_LIMIT = 100_000
RATE_LIMIT_RPM = 30


class GroqTokenTracker:
    def __init__(self):
        self._lock = threading.Lock()
        self.session_tokens = 0
        self.session_turns = 0
        self.daily_tokens = 0
        self.daily_requests = 0
        self.current_date = time.strftime("%Y-%m-%d")
        self._load_daily_usage()

    def _load_daily_usage(self) -> None:
        today = time.strftime("%Y-%m-%d")
        if os.path.exists(USAGE_FILE):
            try:
                with open(USAGE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("date") == today:
                        self.daily_tokens = int(data.get("daily_tokens", 0))
                        self.daily_requests = int(data.get("daily_requests", 0))
                        self.current_date = today
                        return
            except Exception as e:
                logger.debug(f"Could not load token usage file: {e}")

        # New day or missing file
        self.daily_tokens = 0
        self.daily_requests = 0
        self.current_date = today
        self._save_daily_usage()

    def _save_daily_usage(self) -> None:
        try:
            with open(USAGE_FILE, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "date": self.current_date,
                        "daily_tokens": self.daily_tokens,
                        "daily_requests": self.daily_requests,
                        "limit": DAILY_FREE_TIER_LIMIT,
                    },
                    f,
                    indent=2,
                )
        except Exception as e:
            logger.debug(f"Could not save token usage file: {e}")

    def track_turn(self, prompt_tokens: int, completion_tokens: int, turn_index: int = 1) -> dict:
        """Records tokens consumed in a turn and logs structured utilization metrics."""
        with self._lock:
            today = time.strftime("%Y-%m-%d")
            if today != self.current_date:
                self.current_date = today
                self.daily_tokens = 0
                self.daily_requests = 0

            total_turn_tokens = prompt_tokens + completion_tokens
            self.session_tokens += total_turn_tokens
            self.session_turns += 1
            self.daily_tokens += total_turn_tokens
            self.daily_requests += 1

            self._save_daily_usage()

            pct = (self.daily_tokens / DAILY_FREE_TIER_LIMIT) * 100.0

            logger.info(
                f"[Groq Token Usage] Turn #{turn_index}: prompt={prompt_tokens}, completion={completion_tokens}, "
                f"turn_total={total_turn_tokens} | "
                f"Session: {self.session_tokens:,} tokens ({self.session_turns} turns) | "
                f"Daily Total: {self.daily_tokens:,} / {DAILY_FREE_TIER_LIMIT:,} tokens ({pct:.1f}% of free tier)"
            )

            return {
                "turnTokens": total_turn_tokens,
                "sessionTokens": self.session_tokens,
                "dailyTokens": self.daily_tokens,
                "dailyLimit": DAILY_FREE_TIER_LIMIT,
                "dailyPercent": round(pct, 2),
            }

    def is_daily_budget_depleted(self) -> bool:
        """Returns True if daily budget exceeded 98% of 100,000 free tokens."""
        with self._lock:
            return self.daily_tokens >= (DAILY_FREE_TIER_LIMIT * 0.98)


# Global singleton instance
token_tracker = GroqTokenTracker()
