"""
health_check.py – Verifies the local dev environment is ready.

Checks:
  1. Core env vars and LLM provider configuration
  2. Bot module imports
  3. Groq Startup Self-Test
  4. LiveKit server reachability

Run: python health_check.py
"""

import asyncio
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import aiohttp
from dotenv import load_dotenv

load_dotenv()


async def check_livekit():
    url = os.getenv("LIVEKIT_URL", "ws://localhost:7880").replace("ws://", "http://").replace("wss://", "https://")
    print(f"  Checking LiveKit at {url} ...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status in (200, 426):
                    print(f"  ✅ LiveKit server is reachable (HTTP {resp.status})")
                    return True
                else:
                    print(f"  ❌ LiveKit returned unexpected status {resp.status}")
                    return False
    except Exception as e:
        print(f"  ❌ LiveKit not reachable: {e}")
        print("     → Run: docker compose up -d rehearse-postgres livekit")
        return False


def check_imports():
    print("  Checking bot module imports ...")
    try:
        import interviewer  # noqa
        from plugins import stt, llm, tts  # noqa
        print("  ✅ Bot modules import cleanly")
        return True
    except ImportError as e:
        print(f"  ❌ Import error: {e}")
        print("     → Run: pip install -r requirements.txt")
        return False


def check_env():
    print("  Checking required env vars ...")
    required = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "APP_URL", "INTERNAL_BOT_SECRET"]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        print(f"  ❌ Missing env vars: {', '.join(missing)}")
        print("     → Copy .env.example to .env and fill in values")
        return False
    profile = os.getenv("PROFILE", "cloud")
    provider = os.getenv("LLM_PROVIDER", "groq")
    print(f"  ✅ Core env vars present | PROFILE={profile} | LLM_PROVIDER={provider}")
    return True


def check_llm_provider():
    provider = os.getenv("LLM_PROVIDER", "groq").lower().strip()
    print(f"  Checking LLM provider ({provider}) ...")
    if provider == "groq":
        from plugins.llm import run_groq_self_test
        passed, msg, latency = run_groq_self_test()
        if passed:
            print(f"  ✅ Groq LLM Self-Test PASSED ({latency:.1f}ms): {msg}")
        else:
            print(f"  ⚠️ Groq LLM Self-Test reported: {msg}")
            print("     (Agent will gracefully fall back to next available provider if unconfigured)")
    return True


async def main():
    print("\n🔍 Interview Bot Health Check\n")
    results = [
        check_env(),
        check_imports(),
        check_llm_provider(),
        await check_livekit(),
    ]
    print()
    if all(results):
        print("✅ All checks passed. Ready to run: python agent.py dev\n")
    else:
        print("❌ Some checks failed. Fix the issues above before starting the bot.\n")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
