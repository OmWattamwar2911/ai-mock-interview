"""
bench/measure_stages.py - per-stage latency measurements using the REAL pipeline components.

Honest scope: no microphone / LiveKit room is involved. Each stage is timed in isolation with
the actual classes the worker uses, fed with 8 realistic spoken answers (synthesised audio):

  STT  : livekit STT.recognize(AudioFrame)  (FasterWhisperSTT today, GroqSTT / Deepgram after)
  LLM  : the real Groq call used by the worker (old: non-streaming JSON; new: single stream)
  TTS  : livekit TTS.synthesize(text) -> time to first audio frame the framework would receive

The endpointing wait is NOT measurable offline; it is taken from the configured
min_endpointing_delay and labelled "cfg" in the output.

Usage:  python bench/measure_stages.py --phase before|after [--turns 8]
"""
from __future__ import annotations

import argparse, asyncio, io, json, os, socket, ssl, statistics, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import numpy as np
from livekit import rtc

AUDIO_DIR = ROOT / "bench" / "audio"
AUDIO_DIR.mkdir(exist_ok=True)

ANSWERS = [
    "Hi Aria, yes I am ready to start. I am a backend developer with three years of experience in Python and PostgreSQL.",
    "I built a pizza ordering app with Flask and PostgreSQL. It served around two hundred users and handled orders, payments and live order tracking.",
    "For concurrency we used database transactions with row level locking in PostgreSQL, so two users could not order the last pizza at the same time.",
    "When the connection pool saturated during the lunch peak, I introduced PgBouncer and added indexes on the orders table, which cut wait time by about eighty percent.",
    "The main trade off was consistency versus speed. I cached the menu in Redis with a short expiry but always read stock levels directly from the database.",
    "I would say my biggest weakness is system design at larger scale, because most of my projects so far had under a thousand daily active users.",
    "In a previous team we disagreed on using microservices. I proposed a modular monolith first, wrote a short design document, and the team agreed after a two week spike.",
    "For testing I wrote unit tests with pytest for the pricing rules, and integration tests that spin up a temporary PostgreSQL container for the order flow.",
]

FIRST_SENTENCES = [
    "Three years with Python and PostgreSQL, good to know.",
    "Two hundred users on Flask and PostgreSQL is a solid base, so how did you structure the order tables?",
    "Row level locking for the last pizza makes sense, but which isolation level did you actually use?",
    "PgBouncer cut the wait time by eighty percent, so what pooling mode did you pick and why?",
    "Caching the menu in Redis but reading stock from the database is a clear split, so how did you handle cache invalidation?",
    "You mention scale as a weakness, so what have you done to learn about it so far?",
    "A modular monolith before microservices is a defensible call, so what did your two week spike measure?",
    "Pytest plus a temporary PostgreSQL container is a good setup, so how long did the integration suite take to run?",
]


def pct(vals, p):
    s = sorted(vals)
    if not s:
        return float("nan")
    k = (len(s) - 1) * p / 100
    f, c = int(k), min(int(k) + 1, len(s) - 1)
    return s[f] + (s[c] - s[f]) * (k - f)


# ───────────────────────── audio fixtures ─────────────────────────
async def ensure_audio(n: int):
    import edge_tts, av
    files = []
    for i, text in enumerate(ANSWERS[:n]):
        mp3 = AUDIO_DIR / f"ans{i}.mp3"
        wav = AUDIO_DIR / f"ans{i}.npy"
        if not wav.exists():
            if not mp3.exists():
                comm = edge_tts.Communicate(text, "en-US-GuyNeural")
                await comm.save(str(mp3))
            container = av.open(str(mp3))
            resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
            chunks = []
            for frame in container.decode(audio=0):
                for rf in resampler.resample(frame):
                    chunks.append(rf.to_ndarray().reshape(-1))
            for rf in resampler.resample(None):
                chunks.append(rf.to_ndarray().reshape(-1))
            np.save(wav, np.concatenate(chunks).astype(np.int16))
        files.append(np.load(wav))
    return files


def to_frame(pcm: np.ndarray) -> rtc.AudioFrame:
    return rtc.AudioFrame(data=pcm.tobytes(), sample_rate=16000, num_channels=1, samples_per_channel=len(pcm))


# ───────────────────────── network ─────────────────────────
def measure_network():
    host = "api.groq.com"
    out = {}
    t = time.perf_counter(); infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    out["dns_ms"] = (time.perf_counter() - t) * 1000
    ip = infos[0][4][0]
    t = time.perf_counter(); s = socket.create_connection((ip, 443), timeout=5)
    out["tcp_connect_ms"] = (time.perf_counter() - t) * 1000
    ctx = ssl.create_default_context()
    t = time.perf_counter(); ss = ctx.wrap_socket(s, server_hostname=host)
    out["tls_handshake_ms"] = (time.perf_counter() - t) * 1000
    ss.close()
    return out


# ───────────────────────── STT ─────────────────────────
async def bench_stt(pcms, which: str):
    from plugins.stt import build_stt
    results = []
    if which == "faster_whisper":
        from plugins._faster_whisper_stt import FasterWhisperSTT
        stt = FasterWhisperSTT(model_size=os.getenv("WHISPER_MODEL", "base"), device="cpu", compute_type="int8", language="en")
    elif which == "groq":
        from livekit.plugins import groq
        stt = groq.STT(model="whisper-large-v3-turbo", language="en")
    elif which == "auto":
        stt = build_stt(os.getenv("PROFILE", "local"), language="en")
    else:
        raise ValueError(which)
    name = f"{stt.__class__.__name__}({getattr(stt, 'model', '?')})"
    await stt.recognize(to_frame(pcms[0][: 16000 * 2]))  # warm (model load / connection)
    for pcm in pcms:
        t = time.perf_counter()
        ev = await stt.recognize(to_frame(pcm))
        dt = time.perf_counter() - t
        text = ev.alternatives[0].text if ev.alternatives else ""
        results.append({"sec": dt, "audio_sec": len(pcm) / 16000, "text": text})
    return name, results


# ───────────────────────── TTS ─────────────────────────
async def bench_tts(texts, which: str):
    from plugins.tts import build_tts
    tts = build_tts(os.getenv("PROFILE", "local"), language="en") if which == "auto" else None
    if which == "edge_old":
        from plugins._edge_tts import EdgeTTS
        tts = EdgeTTS(language="en")
    name = f"{tts.__class__.__name__}({getattr(tts, 'model', '?')})"
    out = []
    # warm one
    async for _ in tts.synthesize("Warm up."):
        break
    for text in texts:
        t0 = time.perf_counter(); first = None; frames = 0
        stream = tts.synthesize(text)
        async for ev in stream:
            if first is None:
                first = time.perf_counter() - t0
            frames += 1
        out.append({"first_audio": first, "total": time.perf_counter() - t0})
        await stream.aclose()
    return name, out


# ───────────────────────── LLM ─────────────────────────
async def bench_llm_old(model: str, answers):
    """The exact call the worker made per turn before the fix (non-streaming JSON analysis)."""
    from plugins.llm import _call_groq_with_fallback
    key = os.environ["GROQ_API_KEY"].strip()
    sysmsg = ("You are an expert technical interviewer conducting a hidden analysis of a candidate's response.\n"
              "Return strict JSON with keys summary,key_points,quality,correctness_notes,resume_consistency,missing,next_move,next_question.")
    rows = []
    for a in answers:
        msgs = [{"role": "system", "content": sysmsg}, {"role": "user", "content": a}]
        t = time.perf_counter()
        content, lat, usage, used = await _call_groq_with_fallback(
            messages=msgs, groq_key=key, primary_model=model, temperature=0.3, max_tokens=220,
            response_format={"type": "json_object"})
        rows.append({"wall": time.perf_counter() - t, "ok": bool(content), "model_used": used,
                     "prompt_tokens": usage.get("prompt_tokens"), "completion_tokens": usage.get("completion_tokens"),
                     "calls": 1})
    return rows


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phase", default="before")
    ap.add_argument("--turns", type=int, default=8)
    ap.add_argument("--groq-model", default=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"))
    args = ap.parse_args()
    n = args.turns

    print(f"== phase={args.phase} turns={n} configured GROQ_MODEL={args.groq_model}")
    net = measure_network(); print("NETWORK api.groq.com:", {k: round(v, 1) for k, v in net.items()})
    pcms = await ensure_audio(n)
    print("audio lengths (s):", [round(len(p) / 16000, 1) for p in pcms])
    res = {"network": net}

    if args.phase == "before":
        name, stt_rows = await bench_stt(pcms, "faster_whisper")
        res["stt"] = {"impl": name, "rows": stt_rows}
        tname, tts_rows = await bench_tts(FIRST_SENTENCES[:n], "edge_old")
        res["tts"] = {"impl": tname, "rows": tts_rows}
        res["llm_actual_env_model"] = {"model": args.groq_model, "rows": await bench_llm_old(args.groq_model, ANSWERS[:n])}
    elif args.phase == "after":
        name, stt_rows = await bench_stt(pcms, "groq")
        res["stt"] = {"impl": name, "rows": stt_rows}
        tname, tts_rows = await bench_tts(FIRST_SENTENCES[:n], "edge_old")
        res["tts"] = {"impl": tname, "rows": tts_rows}
        
        # New streaming turn engine benchmark
        from plugins.groq_turn import GroqTurnEngine, build_turn_messages
        engine = GroqTurnEngine()
        await engine.startup()
        llm_rows = []
        for a in ANSWERS[:n]:
            msgs = build_turn_messages(
                brief="Role: Full-stack Engineer. Candidate built pizza ordering app with Flask/Postgres.",
                chat_msgs=[],
                user_text=a,
                summary="",
                notes="",
            )
            t0 = time.perf_counter()
            first_tok = None
            spoken = []
            res_obj = None
            async for kind, payload in engine.stream_turn(msgs):
                if kind == "first_token":
                    first_tok = payload
                elif kind == "sentence":
                    spoken.append(payload)
                elif kind == "done":
                    res_obj = payload
            tot = time.perf_counter() - t0
            llm_rows.append({
                "ttft": first_tok or tot,
                "total": tot,
                "model_used": res_obj.model if res_obj else engine.model,
                "prompt_tokens": res_obj.prompt_tokens if res_obj else 0,
                "completion_tokens": res_obj.completion_tokens if res_obj else 0,
                "spoken_reply": res_obj.reply if res_obj else "".join(spoken).strip(),
                "analysis": res_obj.analysis if res_obj else {},
                "calls": 1,
            })
        await engine.aclose()
        res["llm_turn_engine"] = llm_rows
    Path(ROOT / "bench" / f"results_{args.phase}.json").write_text(json.dumps(res, indent=1, default=str))
    for k in ("stt", "tts"):
        if k in res:
            v = res[k]; key = "sec" if k == "stt" else "first_audio"
            vals = [r[key] for r in v["rows"]]
            print(f"{k.upper()} {v['impl']}: " + " ".join(f"{x:.2f}" for x in vals) + f" | p50={pct(vals,50):.2f}s p95={pct(vals,95):.2f}s")
    if "llm_actual_env_model" in res:
        v = res["llm_actual_env_model"]
        print(f"LLM(old path, model={v['model']}): wall " + " ".join(f"{r['wall']:.2f}" for r in v["rows"]) + " | ok=" + str([r['ok'] for r in v['rows']]) + " used=" + str(sorted({r['model_used'] for r in v['rows']})))


if __name__ == "__main__":
    asyncio.run(main())
