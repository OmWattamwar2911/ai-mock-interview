import inspect, typing, sys
from livekit.agents import voice, metrics, llm, tts
from livekit.agents.voice import events
print("Agent.tts_node:", inspect.signature(voice.Agent.tts_node))
print("Agent.llm_node:", inspect.signature(voice.Agent.llm_node))
print("Agent.on_user_turn_completed:", inspect.signature(voice.Agent.on_user_turn_completed))
print("Agent.default.tts_node:", inspect.signature(voice.Agent.default.tts_node))
for n in ["UserStateChangedEvent", "AgentStateChangedEvent", "UserInputTranscribedEvent", "MetricsCollectedEvent", "ConversationItemAddedEvent", "SpeechCreatedEvent"]:
    c = getattr(events, n, None)
    if c: print(n, list(typing.get_type_hints(c).keys()) if hasattr(c, "__annotations__") else c)
print("metrics:", [n for n in dir(metrics) if n.endswith("Metrics")])
for n in ["EOUMetrics", "LLMMetrics", "TTSMetrics", "STTMetrics"]:
    c = getattr(metrics, n, None)
    if c: print(n, list(c.model_fields.keys()) if hasattr(c, "model_fields") else list(typing.get_type_hints(c).keys()))
print("session.say:", inspect.signature(voice.AgentSession.say))
print("session events:", [e for e in typing.get_args(events.EventTypes)] if hasattr(events, "EventTypes") else "n/a")
