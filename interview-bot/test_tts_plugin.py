"""Test that the EdgeTTS plugin integrates with the LiveKit TTS API."""
import asyncio
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


async def main() -> None:
    # Make sure we can import from the plugins dir
    import os
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    from plugins.tts import build_tts

    tts = build_tts("local", language="en")  # PROFILE=local, no Piper → EdgeTTS
    print(f"TTS object: {tts.__class__.__name__}")

    # Try synthesizing
    stream = tts.synthesize("Hello there, I am Aria!")
    frame = await stream.collect()
    print(f"TTS Plugin PASS: produced AudioFrame with {frame.data.nbytes} bytes, sample_rate={frame.sample_rate}")


asyncio.run(main())
