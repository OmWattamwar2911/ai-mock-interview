"""Probe Groq models available to this key: streaming TTFT, STT, TTS."""
import asyncio, os, sys, time, json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); os.chdir(ROOT)
from dotenv import load_dotenv; load_dotenv(ROOT / ".env")
import numpy as np, httpx
from groq import AsyncGroq

KEY = os.environ["GROQ_API_KEY"].strip()
SYS = ("You are Aria, a technical interviewer. Reply in at most 2 short sentences naming something specific the "
       "candidate said and ending with exactly one question. Then output the line <<<A>>> and a JSON object "
       "{\"key_points\":[...],\"quality\":\"strong|okay|vague\"}.")
USER = "I built a pizza ordering app with Flask and PostgreSQL for about 200 users."


async def ttft(client, model, **extra):
    t0 = time.perf_counter(); first = None; txt = ""; usage = None
    try:
        stream = await client.chat.completions.create(
            model=model, stream=True, temperature=0.5, max_completion_tokens=400,
            messages=[{"role": "system", "content": SYS}, {"role": "user", "content": USER}],
            **extra)
        async for ch in stream:
            if ch.choices and ch.choices[0].delta.content:
                if first is None:
                    first = time.perf_counter() - t0
                txt += ch.choices[0].delta.content
            if getattr(ch, "x_groq", None) and getattr(ch.x_groq, "usage", None):
                usage = ch.x_groq.usage
            if getattr(ch, "usage", None):
                usage = ch.usage
        total = time.perf_counter() - t0
        return {"model": model, "extra": extra, "ttft": first, "total": total,
                "usage": (usage.prompt_tokens, usage.completion_tokens) if usage else None, "text": txt[:230]}
    except Exception as e:
        return {"model": model, "extra": extra, "error": str(e)[:200]}


async def main():
    client = AsyncGroq(api_key=KEY, timeout=15)
    await client.models.list()  # warm connection
    cases = [
        ("openai/gpt-oss-20b", {"reasoning_effort": "low"}),
        ("openai/gpt-oss-120b", {"reasoning_effort": "low"}),
        ("qwen/qwen3.8-27b", {}),
        ("allam-2-7b", {}),
    ]
    for m, ex in cases:
        for i in range(2):
            r = await ttft(client, m, **ex)
            print("LLM", json.dumps(r, default=str))
    return
    # STT
    sys.path.insert(0, str(ROOT / "bench"))
    pcm = np.load(ROOT / "bench" / "audio" / "ans1.npy")
    import io, wave
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(pcm.tobytes())
    for i in range(3):
        t = time.perf_counter()
        try:
            r = await client.audio.transcriptions.create(model="whisper-large-v3-turbo", file=("a.wav", buf.getvalue()), language="en")
            print("STT groq turbo", f"{time.perf_counter()-t:.2f}s", r.text[:80])
        except Exception as e:
            print("STT error", str(e)[:200]); break
    # TTS
    for i in range(2):
        t = time.perf_counter()
        try:
            resp = await client.audio.speech.create(model="canopylabs/orpheus-v1-english", voice="diana",
                                                    input="Three years with Python and PostgreSQL, good to know.", response_format="wav")
            data = await resp.read()
            print("TTS groq orpheus", f"{time.perf_counter()-t:.2f}s", len(data), "bytes")
        except Exception as e:
            print("TTS error", str(e)[:300]); break

asyncio.run(main())
