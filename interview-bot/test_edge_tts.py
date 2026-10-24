"""Quick smoke test for EdgeTTS – run from the venv."""
import asyncio
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


async def main() -> None:
    import edge_tts

    communicate = edge_tts.Communicate(
        "Hello, I am Aria, your AI interviewer for today.", "en-US-JennyNeural"
    )
    total_bytes = 0
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            total_bytes += len(chunk["data"])
    if total_bytes > 0:
        print(f"EdgeTTS PASS: produced {total_bytes} audio bytes")
    else:
        print("EdgeTTS FAIL: 0 bytes received")
        raise RuntimeError("No audio produced")


asyncio.run(main())
