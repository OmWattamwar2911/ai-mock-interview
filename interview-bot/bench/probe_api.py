"""Probe: Groq key validity + real installed livekit-agents plugin signatures."""
import os, sys, inspect, importlib
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from plugins.llm import run_groq_self_test
ok, msg, ms = run_groq_self_test()
print("SELFTEST", ok, round(ms), msg[:160])

import livekit.agents as la
print("livekit-agents", la.__version__)
from livekit.plugins import groq, deepgram
print("groq.STT", inspect.signature(groq.STT.__init__))
print("deepgram.TTS", inspect.signature(deepgram.TTS.__init__))
print("deepgram.STT", inspect.signature(deepgram.STT.__init__))
for m in ["livekit.plugins.turn_detector", "livekit.plugins.cartesia"]:
    try:
        importlib.import_module(m); print("OK", m)
    except Exception as e:
        print("MISSING", m, type(e).__name__)
from livekit.agents import stt
print("StreamAdapter", hasattr(stt, "StreamAdapter"))
from livekit.agents.voice import turn
print("EndpointingOptions", inspect.signature(turn.EndpointingOptions))
print("PreemptiveGenerationOptions", inspect.signature(turn.PreemptiveGenerationOptions))
print("TurnHandlingOptions", inspect.signature(turn.TurnHandlingOptions))
