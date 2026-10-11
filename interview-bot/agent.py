"""
agent.py – LiveKit Agents entry point for the interview bot.

Run locally:
    python agent.py dev           # hot-reload development mode
    python agent.py start         # production mode

The LiveKit Agents framework picks up the @agents.cli decorator and manages
the worker process, room joining, and graceful shutdown automatically.
"""

import asyncio
import logging
import os

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import WorkerOptions, cli

from interviewer import InterviewerAgent

load_dotenv()

logger = logging.getLogger("interview-bot")
logging.basicConfig(level=logging.INFO)


async def entrypoint(ctx: agents.JobContext):
    """Called each time the worker is dispatched to a new LiveKit room."""
    logger.info(f"Bot joining room: {ctx.room.name}")
    await ctx.connect()

    # Extract the session ID from the room name (we name rooms "interview-<sessionId>")
    room_name = ctx.room.name
    session_id = room_name.removeprefix("interview-")

    agent = InterviewerAgent(
        session_id=session_id,
        app_url=os.environ["APP_URL"],
        internal_secret=os.environ["INTERNAL_BOT_SECRET"],
        duration_min=int(os.getenv("INTERVIEW_DURATION_MIN", "20")),
    )

    # Run the full interview pipeline; it returns when the interview ends
    await agent.run(ctx)
    logger.info(f"Interview finished for session {session_id}")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            # Bot only joins rooms that match this prefix (set on the room metadata)
            agent_name="interview-bot",
        )
    )
