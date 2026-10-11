"""
interviewer.py – Core interview pipeline.

Pipeline: VAD (Silero) → STT → LLM (with system prompt + context) → TTS
Handles: turn detection, interruptions, silence, time limit, feedback posting.
"""

import asyncio
import json
import logging
import os
import time
from pathlib import Path

import aiohttp
from livekit import agents
from livekit.agents import AgentSession, llm
from livekit.plugins import silero

from plugins.stt import build_stt
from plugins.llm import build_llm
from plugins.tts import build_tts

logger = logging.getLogger("interviewer")

SYSTEM_PROMPT = (Path(__file__).parent / "prompts" / "system.md").read_text()


class InterviewerAgent:
    def __init__(
        self,
        session_id: str,
        app_url: str,
        internal_secret: str,
        duration_min: int = 20,
    ):
        self.session_id = session_id
        self.app_url = app_url
        self.internal_secret = internal_secret
        self.duration_sec = duration_min * 60
        self._transcript: list[dict] = []  # {"role": "user"|"assistant", "text": str}

    # ─── Internal API helpers ──────────────────────────────────────────────────

    def _headers(self) -> dict:
        return {"x-internal-secret": self.internal_secret, "Content-Type": "application/json"}

    async def _fetch_context(self) -> dict:
        """GET /api/internal/interview/:id → resume, JD, skill gaps, config."""
        async with aiohttp.ClientSession() as session:
            url = f"{self.app_url}/api/internal/interview/{self.session_id}"
            async with session.get(url, headers=self._headers(), timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    raise RuntimeError(f"Failed to fetch interview context: {resp.status} {text}")
                return await resp.json()

    async def _post_result(self, summary: dict) -> None:
        """POST /api/internal/interview/:id/result → transcript + scores."""
        payload = {"transcript": self._transcript, "botSummary": summary}
        async with aiohttp.ClientSession() as session:
            url = f"{self.app_url}/api/internal/interview/{self.session_id}/result"
            async with session.post(url, headers=self._headers(), json=payload, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status not in (200, 201):
                    text = await resp.text()
                    logger.error(f"Failed to post result: {resp.status} {text}")
                else:
                    logger.info("Result posted successfully.")

    # ─── Context → system prompt injection ────────────────────────────────────

    def _build_context_block(self, ctx_data: dict) -> str:
        resume = ctx_data.get("resume", {})
        jd = ctx_data.get("jd", {})
        skill_gap = ctx_data.get("skillGap", {})
        config = ctx_data.get("config", {})

        return f"""
## Interview Context

**Role:** {jd.get('title', 'Software Engineer')}
**Interview type:** {config.get('type', 'general')} | **Difficulty:** {config.get('difficulty', 'medium')}
**Duration limit:** {self.duration_sec // 60} minutes

### Candidate Resume Summary
- Name: {resume.get('name', 'the candidate')}
- Skills: {', '.join(resume.get('skills', [])[:15])}
- Experience: {resume.get('experienceYears', '?')} years
- Recent role: {resume.get('recentRole', 'N/A')}

### Target Job Description
- Required skills: {', '.join(jd.get('requiredSkills', [])[:10])}
- Key responsibilities: {'; '.join(jd.get('responsibilities', [])[:3])}

### Skill Gaps to Target
{json.dumps(skill_gap, indent=2)}
"""

    # ─── Main run loop ─────────────────────────────────────────────────────────

    async def run(self, job_ctx: agents.JobContext) -> None:
        # 1. Fetch interview context from the app
        try:
            ctx_data = await self._fetch_context()
        except Exception as e:
            logger.error(f"Could not fetch context: {e}. Proceeding with generic interview.")
            ctx_data = {}

        context_block = self._build_context_block(ctx_data)
        full_system_prompt = SYSTEM_PROMPT + "\n\n" + context_block

        # 2. Build pluggable STT / LLM / TTS based on PROFILE env var
        profile = os.getenv("PROFILE", "cloud").lower()
        logger.info(f"Starting interview with profile={profile}")

        stt = build_stt(profile)
        chat_model = build_llm(profile)
        tts = build_tts(profile)
        vad = silero.VAD.load()

        # 3. Build the chat context with the system prompt
        chat_ctx = llm.ChatContext().append(
            role="system", text=full_system_prompt
        )

        # 4. Create and start the agent session
        session = AgentSession(
            vad=vad,
            stt=stt,
            llm=chat_model,
            tts=tts,
            chat_ctx=chat_ctx,
        )

        # Wire up transcript capture
        @session.on("user_speech_committed")
        def on_user(event):
            self._transcript.append({"role": "user", "text": event.transcript})

        @session.on("agent_speech_committed")
        def on_agent(event):
            self._transcript.append({"role": "assistant", "text": event.text})

        start_time = time.monotonic()

        await session.start(job_ctx.room, participant=None)

        # 5. Wait for time limit OR room to empty
        while True:
            elapsed = time.monotonic() - start_time
            if elapsed >= self.duration_sec:
                logger.info("Time limit reached, ending interview.")
                await session.say(
                    "We've reached our time limit for today. Thank you so much for your time. "
                    "Your results will be available in your dashboard shortly. Have a great day!"
                )
                break

            # Check if no candidate participants remain
            participants = [
                p for p in job_ctx.room.remote_participants.values()
                if p.identity != "interview-bot"
            ]
            if not participants:
                logger.info("Candidate left the room.")
                break

            await asyncio.sleep(5)

        await session.aclose()

        # 6. Extract feedback JSON from the last assistant message
        summary = self._extract_feedback_json()
        await self._post_result(summary)

    def _extract_feedback_json(self) -> dict:
        """Parse the structured JSON block the LLM emits at interview end."""
        for msg in reversed(self._transcript):
            if msg["role"] == "assistant" and "overallScore" in msg["text"]:
                try:
                    start = msg["text"].find("{")
                    end = msg["text"].rfind("}") + 1
                    if start != -1 and end > start:
                        return json.loads(msg["text"][start:end])
                except json.JSONDecodeError:
                    pass
        # Fallback: return a minimal summary
        return {
            "overallScore": 5,
            "strengths": [],
            "weaknesses": [],
            "improvementPlan": [],
            "perQuestion": [],
            "_note": "Feedback JSON could not be parsed from the conversation.",
        }
