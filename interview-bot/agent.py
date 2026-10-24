"""
agent.py – LiveKit Agents entry point for the interview bot.

Run locally:
    python agent.py dev           # hot-reload development mode
    python agent.py start         # production mode
"""

import asyncio
import json
import logging
import os
import sys
import traceback

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import WorkerOptions, cli

# Pre-import LiveKit plugins on the main process thread so they register cleanly before job threads run
try:
    from livekit.plugins import openai
except Exception:
    pass
try:
    from livekit.plugins import groq
except Exception:
    pass
try:
    from livekit.plugins import deepgram
except Exception:
    pass
try:
    from livekit.plugins import silero
except Exception:
    pass

from interviewer import InterviewerAgent

load_dotenv()

logger = logging.getLogger("interview-bot")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


active_rooms: set[str] = set()


async def entrypoint(ctx: agents.JobContext):
    """Called each time the worker is dispatched to a new LiveKit room."""
    room_name = ctx.room.name
    logger.info(f"JOB RECEIVED room={room_name} job_id={ctx.job.id}")

    if room_name in active_rooms:
        logger.warning(
            f"Room {room_name} already has an active agent session. Rejecting duplicate job {ctx.job.id}."
        )
        return

    active_rooms.add(room_name)

    try:
        await ctx.connect()
        logger.info(f"Worker connected to room: {room_name}")

        # Extract session ID from room metadata or room name
        session_id = ""
        if ctx.room.metadata:
            try:
                meta = json.loads(ctx.room.metadata)
                session_id = meta.get("sessionId") or meta.get("interviewId") or ""
            except Exception:
                pass

        if not session_id:
            session_id = room_name.removeprefix("interview-")

        logger.info(f"Resolved session ID: {session_id} for room: {room_name}")

        app_url = os.environ.get("APP_URL", "http://localhost:3000")
        internal_secret = os.environ.get("INTERNAL_BOT_SECRET", "")
        duration_min = int(os.getenv("INTERVIEW_DURATION_MIN", "20"))

        agent = InterviewerAgent(
            session_id=session_id,
            app_url=app_url,
            internal_secret=internal_secret,
            duration_min=duration_min,
        )

        # Register graceful shutdown callback to post results
        ctx.add_shutdown_callback(agent.on_shutdown)

        # Run the full interview pipeline
        await agent.run(ctx)
        logger.info(f"Worker shutting down for room {room_name} (session_id={session_id})")

    except Exception as e:
        logger.error(
            f"FATAL: Unhandled exception in entrypoint for room {room_name}: {e}\n{traceback.format_exc()}"
        )
        raise
    finally:
        active_rooms.discard(room_name)


def prewarm(proc: agents.JobProcess):
    """Pre-warm local models so job connection and inference are instantaneous."""
    try:
        proc.userdata["vad"] = silero.VAD.load()
        logger.info("Prewarmed Silero VAD into process memory")
    except Exception as e:
        logger.warning(f"Silero VAD prewarm skipped: {e}")

    try:
        from faster_whisper import WhisperModel
        model_size = os.getenv("WHISPER_MODEL", "base")
        proc.userdata["whisper"] = WhisperModel(model_size, device="cpu", compute_type="int8")
        logger.info(f"Prewarmed Faster-Whisper ({model_size}, int8) into process memory")
    except Exception as e:
        logger.warning(f"Faster-Whisper prewarm skipped: {e}")


if __name__ == "__main__":
    livekit_url = os.environ.get("LIVEKIT_URL", "ws://localhost:7880")
    logger.info(f"Worker registered with LiveKit URL: {livekit_url}")

    provider = os.getenv("LLM_PROVIDER", "groq").lower().strip()
    logger.info(f"Configured LLM Provider: {provider}")
    if provider == "groq":
        from plugins.llm import run_groq_self_test
        run_groq_self_test()

    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            agent_name="interview-bot",
        )
    )
