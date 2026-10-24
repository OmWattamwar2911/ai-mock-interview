import os, sys, time, json, typing
from dotenv import load_dotenv
load_dotenv()
import httpx

key = os.environ["GROQ_API_KEY"].strip()
t = time.perf_counter()
r = httpx.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {key}"}, timeout=10)
print("GET /models", r.status_code, f"{(time.perf_counter()-t)*1000:.0f}ms")
if r.status_code == 200:
    ids = sorted(m["id"] for m in r.json()["data"])
    print("MODELS:", json.dumps(ids, indent=1))
else:
    print(r.text[:300])

from livekit.agents.voice import turn
for name in ["EndpointingOptions", "PreemptiveGenerationOptions", "TurnHandlingOptions", "InterruptionOptions"]:
    cls = getattr(turn, name, None)
    if cls is not None:
        print(name, typing.get_type_hints(cls))
