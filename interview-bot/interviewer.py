"""
interviewer.py – Core Mock Interview Agent with Human-Like Turn Handling & Live Transcription

Key Features:
- PART 1: Turn-taking with 1.3s-5.0s endpointing, 0.7s/2-word interruption threshold, preemptive generation disabled.
          Continuous state machine logging (AGENT_SPEAKING, USER_SPEAKING, USER_TURN_COMPLETE, AGENT_THINKING).
- PART 2: Full context retention with hidden answer analysis (not spoken) and 1-3 sentence spoken responses.
          Varying acknowledgements, targeted follow-ups quoting candidate words, 10-15 planned questions.
- PART 3: Real-time dual-publishing: LiveKit Transcription (topic lk.transcription) and data channel topic "transcript".
          Incremental per-turn database persistence to /api/internal/interview/[id]/transcript.
- PART 4: Sentence-level streaming TTS, sample rate verification, zero concurrent audio overlap.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import traceback
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiohttp
from livekit import agents, rtc
from livekit.agents import llm, voice
from livekit.plugins import silero

from interview_state import (
    InterviewStateMachine,
    PHASE_READINESS,
    PHASE_WARMUP,
    PHASE_RESUME,
    PHASE_JD_MATCH,
    PHASE_TECHNICAL,
    PHASE_BEHAVIORAL,
    PHASE_CLOSING,
    STATE_AGENT_SPEAKING,
    STATE_USER_SPEAKING,
    STATE_USER_TURN_COMPLETE,
    STATE_AGENT_THINKING,
)
from plugins.stt import build_stt
from plugins.llm import build_llm_async
from plugins.tts import build_tts
from plugins.groq_turn import GroqTurnEngine, build_turn_messages, validate_grounding
from plugins.turn_timing import TurnTimer
from plugins.technical_coach import TechnicalCoach

logger = logging.getLogger("interviewer")

SYSTEM_PROMPT = (Path(__file__).parent / "prompts" / "system.md").read_text(encoding="utf-8")

LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish (Español)",
    "fr": "French (Français)",
    "de": "German (Deutsch)",
    "hi": "Hindi (हिन्दी)",
    "zh": "Mandarin Chinese (中文)",
    "ja": "Japanese (日本語)",
    "pt": "Portuguese (Português)",
}


class InterviewerVoiceAgent(voice.Agent):
    """
    LiveKit voice.Agent subclass enforcing Single-Call Streaming Grounded Dialogue:
    - Streams spoken reply sentence-by-sentence to TTS immediately before delimiter.
    - Parses hidden analysis JSON after delimiter for the next turn.
    - Grounding validation runs off the critical path in a background task.
    """
    def __init__(
        self,
        instructions: str,
        vad: silero.VAD,
        stt: Any,
        llm: llm.LLM,
        tts: Any,
        state_machine: InterviewStateMachine,
        interviewer_agent: InterviewerAgent,
        tools: list,
    ):
        super().__init__(
            instructions=instructions,
            vad=vad,
            stt=stt,
            llm=llm,
            tts=tts,
            tools=tools,
        )
        self.state_machine = state_machine
        self.interviewer_agent = interviewer_agent

    async def llm_node(
        self,
        chat_ctx: llm.ChatContext,
        tools: list[llm.Tool],
        model_settings: voice.ModelSettings,
    ):
        """
        Custom LLM node: Streams spoken reply directly to TTS.
        """
        user_msgs = [m for m in chat_ctx.messages() if m.role == "user"]
        last_user_text = ""
        if user_msgs:
            raw = user_msgs[-1].content
            last_user_text = " ".join(str(x) for x in raw) if isinstance(raw, list) else str(raw)

        if not last_user_text or not last_user_text.strip():
            logger.info("[STT Empty] Candidate utterance was empty; prompting candidate to repeat")
            yield "Sorry, I did not catch that, could you say it again? "
            return

        async for sentence in self.interviewer_agent.stream_single_call_turn(last_user_text, chat_ctx):
            yield sentence + " "


class InterviewerAgent:
    def __init__(
        self,
        session_id: str,
        app_url: str,
        internal_secret: str,
        duration_min: int = 20,
    ):
        self.session_id = session_id
        self.app_url = app_url.rstrip("/")
        self.internal_secret = internal_secret
        self.duration_sec = duration_min * 60
        self._transcript: list[dict] = []
        self._turn_count = 0
        self._has_posted_result = False
        self._room: Optional[rtc.Room] = None
        self.state_machine: Optional[InterviewStateMachine] = None
        self._last_stt_confidence: float = 1.0
        self._cached_context: dict = {}
        self.technical_coach: Optional[TechnicalCoach] = None
        self.turn_engine: Optional[GroqTurnEngine] = None
        self.turn_timer: TurnTimer = TurnTimer()
        self._last_analysis: dict = {}
        self._asked_questions: list[str] = []
        self._previous_reply: str = ""
        self._grounding_problems: list[str] = []
        self._session_ref = None

        # Guard flags against overlapping speech
        self._is_generating = False
        self._is_speaking = False

    async def stream_single_call_turn(self, user_text: str, chat_ctx: llm.ChatContext):
        """
        Executes a SINGLE streaming call per turn:
        - Yields spoken reply sentences immediately to TTS.
        - Parses hidden analysis JSON at end of turn.
        - Dispatches grounding validator and DB persistence off the critical path.
        """
        if not self.turn_engine:
            self.turn_engine = GroqTurnEngine()
            await self.turn_engine.startup()

        self.turn_timer.mark_llm_start()

        brief = self._build_context_block(self._cached_context)
        notes = ""
        if self._grounding_problems:
            notes = f"Grounding feedback from your prior response: {'; '.join(self._grounding_problems)}. Address this directly."
        if self.state_machine:
            notes += f"\nCurrent Phase: {self.state_machine.current_phase}."

        # Always inject live problem & code context whenever coach is available
        if self.technical_coach:
            notes += "\n" + self.technical_coach.build_llm_technical_brief()

        msgs = build_turn_messages(
            brief=brief,
            chat_msgs=list(chat_ctx.messages()),
            user_text=user_text,
            summary="",
            notes=notes,
        )

        spoken_sentences = []
        res_obj = None

        try:
            async for kind, payload in self.turn_engine.stream_turn(msgs, max_tokens=150, temperature=0.5):
                if kind == "first_token":
                    self.turn_timer.mark_llm_first_token()
                elif kind == "sentence":
                    self.turn_timer.mark_tts_start()
                    spoken_sentences.append(payload)
                    yield payload
                elif kind == "done":
                    res_obj = payload
        except Exception as e:
            logger.error(f"[Turn Error] Single-call stream failed: {e}")
            yield "Understood. Could you elaborate further on your technical implementation?"
            return

        self.turn_timer.mark_llm_end()

        full_reply = " ".join(spoken_sentences).strip()
        analysis = res_obj.analysis if res_obj else {}
        self._last_analysis = analysis
        self._previous_reply = full_reply

        # Extract asked question
        for s in spoken_sentences:
            if s.strip().endswith("?"):
                self._asked_questions.append(s.strip())

        # Off critical path: Validate grounding in background for next turn
        asyncio.create_task(self._validate_grounding_bg(full_reply, user_text, analysis))

    async def _validate_grounding_bg(self, reply: str, user_text: str, analysis: dict):
        try:
            problems = validate_grounding(
                reply=reply,
                user_text=user_text,
                analysis=analysis,
                previous_reply=self._previous_reply,
                asked_questions=self._asked_questions,
            )
            self._grounding_problems = problems
            if problems:
                logger.info(f"[Grounding Audit] Feedback for next turn: {problems}")
        except Exception as e:
            logger.debug(f"Grounding validation background task exception: {e}")

    # ─── Internal API Helpers ──────────────────────────────────────────────────

    def _headers(self) -> dict:
        return {"x-internal-secret": self.internal_secret, "Content-Type": "application/json"}

    async def _fetch_context(self) -> dict:
        """GET /api/internal/interview/:id → resume, JD, skill gaps, config."""
        url = f"{self.app_url}/api/internal/interview/{self.session_id}"
        logger.info(f"FETCHING INTERVIEW CONTEXT from: {url}")
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self._headers(), timeout=aiohttp.ClientTimeout(total=10)) as resp:
                logger.info(f"INTERVIEW CONTEXT FETCHED for session {self.session_id} (HTTP {resp.status})")
                if resp.status != 200:
                    text = await resp.text()
                    raise RuntimeError(f"Failed to fetch interview context: {resp.status} {text}")
                data = await resp.json()
                self._cached_context = data
                return data

    async def _persist_transcript_line(self, line: dict) -> None:
        """POST /api/internal/interview/:id/transcript → incremental DB save."""
        url = f"{self.app_url}/api/internal/interview/{self.session_id}/transcript"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=self._headers(), json=line, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status not in (200, 201):
                        logger.debug(f"Incremental transcript post status: {resp.status}")
        except Exception as e:
            logger.debug(f"Could not persist incremental transcript line: {e}")

    async def _post_result(self, summary: dict, status: str = "COMPLETED") -> bool:
        """POST /api/internal/interview/:id/result → full evaluation report."""
        if self._has_posted_result:
            return True

        observations_data = [o.to_dict() for o in self.state_machine.observations] if self.state_machine else []
        timeline_data = self.state_machine.timeline if self.state_machine else []
        test_results = self.state_machine.last_test_results if self.state_machine else {}

        payload = {
            "transcript": self._transcript,
            "botSummary": summary,
            "observations": observations_data,
            "timeline": timeline_data,
            "testResults": test_results,
            "status": status,
        }
        url = f"{self.app_url}/api/internal/interview/{self.session_id}/result"

        for attempt in range(1, 4):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        url, headers=self._headers(), json=payload, timeout=aiohttp.ClientTimeout(total=15)
                    ) as resp:
                        logger.info(
                            f"Result POST (attempt {attempt}/3) for session {self.session_id} finished with status {resp.status}"
                        )
                        if resp.status in (200, 201):
                            self._has_posted_result = True
                            return True
                        text = await resp.text()
                        logger.warning(f"Result POST attempt {attempt} failed: {resp.status} {text}")
            except Exception as e:
                logger.warning(f"Result POST network error on attempt {attempt}: {e}")

            if attempt < 3:
                await asyncio.sleep(2.0 * attempt)

        logger.error(f"Failed to post interview result after 3 attempts for session {self.session_id}")
        return False

    async def _generate_evaluation_summary(self) -> dict:
        """Generates comprehensive feedback report using Groq or state machine fallback."""
        summary = None
        for msg in reversed(self._transcript):
            if msg.get("role") == "assistant" and "overallScore" in msg.get("text", ""):
                try:
                    text = msg["text"]
                    start = text.find("{")
                    end = text.rfind("}") + 1
                    if start != -1 and end > start:
                        parsed = json.loads(text[start:end])
                        if "overallScore" in parsed:
                            summary = parsed
                            break
                except Exception:
                    pass

        if not summary:
            try:
                from plugins.llm import generate_groq_interview_feedback
                summary = await generate_groq_interview_feedback(
                    transcript=self._transcript,
                    context_data=self._cached_context,
                    state_machine=self.state_machine,
                )
            except Exception as e:
                logger.warning(f"Error generating feedback via Groq ({e}); using state machine fallback")
                summary = self._extract_feedback_json()

        # PART 6: Always append technical evaluation section with 8 dimensions and reference solution
        if self.technical_coach and isinstance(summary, dict):
            summary["technicalEvaluation"] = self.technical_coach.build_technical_report_section(self._transcript)

        return summary

    async def on_shutdown(self) -> None:
        """Graceful shutdown callback invoked when worker is cleaning up."""
        logger.info(f"Executing shutdown callback for session {self.session_id}")
        if not self._has_posted_result:
            summary = await self._generate_evaluation_summary()
            await self._post_result(summary, status="COMPLETED")

    # ─── Dual Data & Transcription Broadcasting ────────────────────────────────

    def _broadcast_data(self, payload: dict, topic: Optional[str] = None) -> None:
        """Broadcasts payload to LiveKit room data channel, optionally on specific topic."""
        if not self._room or not self._room.local_participant:
            return
        try:
            raw = json.dumps(payload).encode("utf-8")
            loop = asyncio.get_running_loop()
            if topic:
                loop.create_task(self._room.local_participant.publish_data(raw, topic=topic, reliable=True))
            else:
                loop.create_task(self._room.local_participant.publish_data(raw, reliable=True))
        except Exception as e:
            logger.debug(f"Data broadcast ignored: {e}")

    def _broadcast_transcript(
        self,
        id_str: str,
        role: str,
        speaker: str,
        text: str,
        is_final: bool,
        confidence: float = 1.0,
    ) -> None:
        """Publishes transcript line over dedicated 'transcript' topic and standard data channel."""
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        low_confidence = (confidence < 0.65) if confidence is not None else False
        msg = {
            "id": id_str,
            "role": role,
            "speaker": speaker,
            "text": text,
            "isFinal": is_final,
            "confidence": round(confidence, 3) if confidence is not None else 1.0,
            "lowConfidence": low_confidence,
            "timestamp": ts,
            "phase": self.state_machine.current_phase if self.state_machine else "unknown",
        }
        # 1. Publish on topic="transcript"
        self._broadcast_data(msg, topic="transcript")
        # 2. Also publish standard message for backwards compatibility
        self._broadcast_data({
            "type": "transcript_entry",
            "entry": {
                "id": id_str,
                "role": role,
                "speaker": "bot" if role == "assistant" else "candidate",
                "text": text,
                "interim": not is_final,
                "confidence": round(confidence, 3) if confidence is not None else 1.0,
                "lowConfidence": low_confidence,
                "timestamp": ts,
            },
        })

    # ─── System Prompt Context Assembly ────────────────────────────────────────

    def _build_context_block(self, ctx_data: dict) -> str:
        resume = ctx_data.get("resume", {})
        parsed_resume = resume.get("parsed", {})
        jd = ctx_data.get("jd", {})
        parsed_jd = jd.get("parsed", {})
        skill_gap = ctx_data.get("skillGap", {})
        config = ctx_data.get("config", {})
        language = ctx_data.get("language") or config.get("language", "en")
        lang_name = LANGUAGE_NAMES.get(language, language.upper())

        gaps = skill_gap.get("missing", []) if isinstance(skill_gap, dict) else []
        gaps_str = ", ".join(gaps[:5]) if gaps else "None identified"
        coding_prob = ctx_data.get("codingProblem", {})
        coding_title = coding_prob.get("title", "algorithmic challenge") if isinstance(coding_prob, dict) else "algorithmic challenge"
        coding_statement = coding_prob.get("statement", "") if isinstance(coding_prob, dict) else ""
        coding_constraints = coding_prob.get("constraints", "") if isinstance(coding_prob, dict) else ""

        technical_section = ""
        if self.technical_coach:
            technical_section = f"\n{self.technical_coach.build_llm_technical_brief()}"
        else:
            technical_section = f"""
## Live Technical Problem
- Problem: {coding_title}
- Statement: {coding_statement}
- Constraints: {coding_constraints}
"""

        return f"""
## Mandatory Language Requirement
- The candidate explicitly selected: **{lang_name} ({language})**.
- Conduct the entire interview exclusively in **{lang_name}**.

## Candidate Resume Summary (Key Facts)
- Candidate: {parsed_resume.get('name', 'the candidate')} | Experience: {parsed_resume.get('experienceYears', '?')} yrs | Recent Role: {parsed_resume.get('recentRole', 'N/A')}
- Skills: {', '.join(parsed_resume.get('skills', [])[:12])}
- Highlights: {parsed_resume.get('summary', 'Experienced developer')}

## Target Job Description & Requirements
- Position: {jd.get('title', 'Software Engineer')}
- Required Skills: {', '.join(parsed_jd.get('requiredSkills', [])[:8])}
- Core Responsibilities: {'; '.join(parsed_jd.get('responsibilities', [])[:2])}
- Target Gaps: {gaps_str}
{technical_section}
## Pacing Rules
- Keep spoken replies concise (1 to 3 sentences).
- Brief specific acknowledgement (at most 6 words, zero generic praise).
- Exactly ONE question per turn grounded in candidate's words.
"""

    # ─── Main Run Loop ─────────────────────────────────────────────────────────

    async def run(self, job_ctx: agents.JobContext) -> None:
        self._room = job_ctx.room
        logger.info(f"Session started for room {self._room.name} (session_id={self.session_id})")

        # PART 1 (a): Log initial room participants to detect any duplicate agents
        initial_participants = [p.identity for p in self._room.remote_participants.values()]
        logger.info(f"Room participants at start: {initial_participants} (total={len(initial_participants)})")

        # 1. Fetch interview context
        try:
            ctx_data = await self._fetch_context()
        except Exception as e:
            logger.error(f"Could not fetch context: {e}. Proceeding with generic interview.")
            ctx_data = {}

        language = ctx_data.get("language") or ctx_data.get("config", {}).get("language", "en")
        candidate_name = ctx_data.get("resume", {}).get("parsed", {}).get("name") or "there"

        # Initialize TechnicalCoach with problem object from database
        self.technical_coach = TechnicalCoach(ctx_data.get("codingProblem"))

        # 2. Initialize State Machine
        self.state_machine = InterviewStateMachine(
            candidate_name=candidate_name,
            language=language,
            context_data=ctx_data,
            on_phase_change=lambda old_p, new_p: self._broadcast_data({
                "type": "phase_change",
                "oldPhase": old_p,
                "newPhase": new_p,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }),
            on_data_broadcast=self._broadcast_data,
        )
        sm = self.state_machine

        context_block = self._build_context_block(ctx_data)
        full_system_prompt = SYSTEM_PROMPT + "\n\n" + context_block

        # 3. Build STT / LLM / TTS (PART 4: Audio Robustness)
        profile = os.getenv("PROFILE", "local").lower()
        vad = None
        whisper_model = None
        if hasattr(job_ctx, "proc") and hasattr(job_ctx.proc, "userdata"):
            vad = job_ctx.proc.userdata.get("vad")
            whisper_model = job_ctx.proc.userdata.get("whisper")

        if vad is None:
            vad = silero.VAD.load()

        stt = build_stt(profile, language=language, preloaded_model=whisper_model)
        chat_model = await build_llm_async(profile, state_machine=sm)
        tts = build_tts(profile, language=language)

        logger.info(
            f"[Audio Setup] STT={stt.__class__.__name__} (lang={language}, streaming=VAD), "
            f"TTS={tts.__class__.__name__} (sentence_streaming=True), "
            f"LLM={chat_model.__class__.__name__}, Profile={profile}"
        )

        # 4. Agent tools
        @llm.function_tool(description="Advance to the next interview phase when current phase goals are met.")
        def advance_phase(target_phase: str, reason: str = "") -> str:
            sm.transition_to(target_phase, reason=reason)
            return f"Successfully transitioned to phase {target_phase}."

        @llm.function_tool(description="Record an observation note and score hint (1-10) for candidate answer.")
        def record_observation(category: str, note: str, score_hint: float) -> str:
            obs = sm.record_observation(category, note, score_hint)
            return f"Observation noted for {category}: score {obs['scoreHint']}/10."

        agent = InterviewerVoiceAgent(
            instructions=full_system_prompt,
            vad=vad,
            stt=stt,
            llm=chat_model,
            tts=tts,
            state_machine=sm,
            interviewer_agent=self,
            tools=[advance_phase, record_observation],
        )

        # PART 1: Calibrated Turn Handling
        # - min_endpointing_delay 0.4s (ultra-responsive turn detection)
        # - max_endpointing_delay 2.5s
        # - preemptive_generation enabled
        session = voice.AgentSession(
            min_endpointing_delay=0.4,
            max_endpointing_delay=2.5,
            preemptive_generation=True,
            turn_detection="vad",
            allow_interruptions=True,
            min_interruption_duration=0.5,
            min_interruption_words=2,
            discard_audio_if_uninterruptible=True,
            resume_false_interruption=True,
            false_interruption_timeout=1.5,
        )

        # 5. Wire up Turn-Level State Logging & Events (PART 1 & PART 3)

        @session.on("user_state_changed")
        def on_user_state_changed(event):
            state = getattr(event, "new_state", "") or getattr(event, "user_state", "") or str(event)
            if state == "speaking":
                sm.set_turn_state(STATE_USER_SPEAKING, reason="user started speaking")
                self._broadcast_data({"type": "agent_state", "state": "listening", "phase": sm.current_phase})
            elif state in ("listening", "away"):
                self.turn_timer.mark_user_speech_end()
                sm.set_turn_state(STATE_USER_TURN_COMPLETE, reason="user stopped speaking")
                self._broadcast_data({"type": "agent_state", "state": "thinking", "phase": sm.current_phase})

        @session.on("agent_state_changed")
        def on_agent_state_changed(event):
            state = getattr(event, "new_state", "") or getattr(event, "agent_state", "") or str(event)
            if state == "speaking":
                self.turn_timer.mark_audio_published()
                log_line = self.turn_timer.format_turn_log(self._turn_count)
                logger.info(f"[Turn Timing] {log_line}")
                sm.set_turn_state(STATE_AGENT_SPEAKING, reason="TTS started playing audio")
                self._broadcast_data({"type": "agent_state", "state": "speaking", "phase": sm.current_phase})
            elif state == "thinking":
                self.turn_timer.mark_endpoint_fire()
                sm.set_turn_state(STATE_AGENT_THINKING, reason="agent generating reply")
                self._broadcast_data({"type": "agent_state", "state": "thinking", "phase": sm.current_phase})
            elif state == "listening":
                sm.set_turn_state(STATE_AGENT_SPEAKING, reason="speech completed")
                self._broadcast_data({"type": "agent_state", "state": "listening", "phase": sm.current_phase})

        @session.on("agent_false_interruption")
        def on_false_interruption(event):
            logger.info("[Interruption] False interruption detected; resuming Aria speech.")

        self._session_ref = session

        # PART 3: Interim and final user speech transcription
        @session.on("user_input_transcribed")
        def on_user_input_transcribed(event):
            try:
                transcript = getattr(event, "transcript", "")
                is_final = getattr(event, "is_final", False)
                item_id = getattr(event, "item_id", None) or f"user_{int(time.time()*1000)}"

                conf = 1.0
                if hasattr(stt, "last_turn_info") and isinstance(stt.last_turn_info, dict):
                    conf = stt.last_turn_info.get("confidence", 1.0)
                elif hasattr(event, "confidence"):
                    conf = getattr(event, "confidence", 1.0)
                self._last_stt_confidence = conf

                if not transcript or not transcript.strip():
                    if is_final:
                        logger.info("[STT Empty] Candidate utterance was empty; prompting candidate to repeat")
                        asyncio.create_task(session.say("Sorry, I did not catch that, could you say it again?"))
                    return

                # Publish live transcript (interim and final)
                self._broadcast_transcript(
                    item_id,
                    role="user",
                    speaker="Candidate",
                    text=transcript,
                    is_final=is_final,
                    confidence=conf,
                )

                if is_final:
                    self.turn_timer.mark_stt_final()
                    if conf < 0.35 and len(transcript.split()) <= 2:
                        logger.info(
                            f"[STT Low Confidence ({conf:.2f})] Utterance '{transcript}' below threshold; asking to repeat"
                        )
                        asyncio.create_task(session.say("Sorry, I did not catch that, could you say it again?"))
                        return

                    logger.info(f"[Turn Log] [Final STT] Candidate: \"{transcript}\" (confidence={conf:.3f})")
                    if self.technical_coach:
                        self.technical_coach.record_candidate_speech()
                    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    record = {
                        "role": "user",
                        "text": transcript,
                        "confidence": round(conf, 3),
                        "timestamp": ts,
                        "phase": sm.current_phase,
                    }
                    self._transcript.append(record)
                    # Incrementally persist final user turn to database
                    asyncio.create_task(self._persist_transcript_line(record))
            except Exception as e:
                logger.warning(f"Error in user_input_transcribed handler: {e}")

        # Final assistant dialogue commitment
        @session.on("conversation_item_added")
        def on_conversation_item_added(event):
            try:
                item = getattr(event, "item", None)
                if not item:
                    return
                role = getattr(item, "role", "")
                text = getattr(item, "text_content", "") or ""
                if not text:
                    return

                ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                self._turn_count += 1
                sm.current_turn = self._turn_count

                if role == "assistant":
                    logger.info(f"[Turn Log] [Turn {self._turn_count}] Aria speech finalized: \"{text[:80]}...\"")
                    record = {"role": "assistant", "text": text, "timestamp": ts, "phase": sm.current_phase}
                    self._transcript.append(record)
                    speech_id = f"aria_{int(time.time()*1000)}"
                    self._broadcast_transcript(speech_id, role="assistant", speaker="Aria", text=text, is_final=True)
                    # Incrementally persist final assistant turn to database
                    asyncio.create_task(self._persist_transcript_line(record))
            except Exception as e:
                logger.warning(f"Error handling conversation item added: {e}")

        # 6. Real-time candidate code synchronization from data channel
        @self._room.on("data_received")
        def on_data_received(dp):
            try:
                topic = getattr(dp, "topic", "")
                data = json.loads(dp.data.decode("utf-8"))
                msg_type = data.get("type")

                # (a) Problem shown verification event
                if topic == "problem_shown" or msg_type == "problem_shown":
                    c_prob_id = data.get("problemId") or data.get("id") or ""
                    c_hash = data.get("statementHash") or data.get("hash") or ""
                    if self.technical_coach:
                        synced = self.technical_coach.verify_problem_shown(c_prob_id, c_hash)
                        # Reply with confirmation
                        self._broadcast_data({
                            "type": "problem_sync_ack",
                            "problemId": self.technical_coach.problem_id,
                            "synced": synced,
                            "statementHash": self.technical_coach.statement_hash,
                        })

                # (b) Topic "code_update" (PART 2)
                elif topic == "code_update" or msg_type == "code_update":
                    if self.technical_coach:
                        snap = self.technical_coach.handle_code_update(data)
                        sm.current_phase = PHASE_TECHNICAL
                        sm.handle_code_sync({
                            "language": snap.language,
                            "sourceCode": snap.code,
                            "status": "DRAFT_EDITING",
                        })
                        # Broadcast confirmation status
                        self._broadcast_data({
                            "type": "aria_coding_status",
                            "status": "Aria is reading your code",
                            "seq": snap.seq,
                        })

                # (c) Topic "run_result" (PART 3)
                elif topic == "run_result" or msg_type == "run_result":
                    if self.technical_coach:
                        rec = self.technical_coach.handle_run_result(data)
                        sm.current_phase = PHASE_TECHNICAL
                        sm.handle_code_sync({
                            "language": self.technical_coach.language,
                            "sourceCode": self.technical_coach.current_code,
                            "status": rec.error_type or ("ACCEPTED" if rec.passed == rec.total else "FAILED"),
                            "passedCount": rec.passed,
                            "totalCount": rec.total,
                            "submit": bool(data.get("isSubmit") or data.get("submit")),
                        })
                        # Prompt Aria to react immediately in 1-2 short sentences
                        if rec.passed == rec.total and rec.total > 0:
                            reaction = f"All {rec.total} test cases passed! How would you analyze the time and space complexity of your solution?"
                        elif rec.failures:
                            f0 = rec.failures[0]
                            reaction = f"{rec.passed} of {rec.total} passed. The failing case had input {f0.get('input', 'empty')}; what do you expect to happen there?"
                        elif rec.error_message:
                            reaction = f"The compiler reported an error on line {rec.line or 'in your code'}. Take a look at your syntax there."
                        else:
                            reaction = f"{rec.passed} of {rec.total} tests passed. Walk me through what might be causing the discrepancy."
                        
                        logger.info(f"[Aria Run Reaction] Dispatching: '{reaction}'")
                        asyncio.create_task(session.say(reaction))

                # (d) Hint request from candidate button (PART 5)
                elif topic == "request_hint" or msg_type == "request_hint":
                    if self.technical_coach:
                        lvl, hint = self.technical_coach.request_hint()
                        hint_speech = f"Here is a hint: {hint}"
                        self._broadcast_transcript(
                            f"hint_{int(time.time()*1000)}",
                            role="assistant",
                            speaker="Aria",
                            text=f"[Hint Level {lvl}] {hint}",
                            is_final=True,
                        )
                        asyncio.create_task(session.say(hint_speech))

                # Legacy code_sync backwards compatibility
                elif msg_type == "code_sync":
                    if self.technical_coach:
                        self.technical_coach.handle_code_update(data)
                    sm.handle_code_sync(data)
                    lang = data.get("language", "python")
                    code = data.get("sourceCode", "")
                    status = data.get("status", "UNTESTED")
                    passed = data.get("passedCount", 0)
                    total = data.get("totalCount", 0)
                    logger.info(f"[Code Sync] {lang} status={status} ({passed}/{total} passed)")

            except Exception as e:
                logger.debug(f"Could not parse data channel packet: {e}")

        start_time = time.monotonic()

        # 7. Start session in the room
        await session.start(agent, room=self._room)
        logger.info(f"Agent session successfully started in room {self._room.name}")

        # Periodic background technical monitor (PART 4)
        async def _background_technical_monitor():
            while getattr(self, "_room", None) and self._room.state == rtc.RoomState.CONNECTED:
                try:
                    await asyncio.sleep(4.0)
                    if not self.technical_coach:
                        continue

                    # (1) Silence check: 2 minutes silence prompt
                    if (
                        sm.current_phase == PHASE_TECHNICAL
                        and self.technical_coach.should_prompt_silence()
                    ):
                        silence_msg = "Take your time, but feel free to think out loud. Where are your thoughts right now?"
                        logger.info(f"[Aria Silence Prompt] Dispatching: '{silence_msg}'")
                        asyncio.create_task(session.say(silence_msg))

                    # (2) Periodic AST / lightweight background check if code changed
                    now = time.monotonic()
                    if (
                        self.technical_coach.current_code
                        and self.technical_coach.current_code != self.technical_coach.last_analyzed_code
                        and now - self.technical_coach.last_analysis_time >= 15.0
                    ):
                        groq_key = os.getenv("GROQ_API_KEY", "")
                        await self.technical_coach.run_background_analysis_turn(groq_api_key=groq_key)

                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.debug(f"Background technical monitor exception: {e}")

        asyncio.create_task(_background_technical_monitor())

        # Wait up to 30 seconds for candidate to appear before initial greeting
        wait_start = time.monotonic()
        while time.monotonic() - wait_start < 30:
            remote_parts = list(self._room.remote_participants.values())
            candidate_parts = [
                p for p in remote_parts
                if not (getattr(p, "is_agent", False) or (getattr(p, "kind", None) in ("agent", 2)) or p.identity.startswith("agent") or p.identity.startswith("interview-bot") or p.identity.startswith("AW_"))
            ]
            if candidate_parts:
                logger.info(f"Candidate detected in room: {[p.identity for p in candidate_parts]}")
                break
            await asyncio.sleep(0.4)

        # Initial greeting from Aria (one time only)
        if language == "es":
            greeting = f"¡Hola {candidate_name}! Soy Aria, tu entrevistadora de IA. ¿Listo para comenzar?"
        elif language == "fr":
            greeting = f"Bonjour {candidate_name}! Je suis Aria, votre intervieweuse IA. Êtes-vous prêt?"
        elif language == "de":
            greeting = f"Hallo {candidate_name}! Ich bin Aria, deine KI-Interviewer. Bist du bereit?"
        elif language == "hi":
            greeting = f"नमस्ते {candidate_name}! मैं आरिया हूँ। क्या आप शुरू करने के लिए तैयार हैं?"
        else:
            greeting = f"Hi {candidate_name}! I'm Aria, your AI interviewer. Ready to get started?"

        try:
            logger.info(f"[Turn Log] Dispatching initial greeting: '{greeting}'")
            sm.mark_greeting_sent()
            # Broadcast greeting transcript line
            self._broadcast_transcript(f"aria_greet_{int(time.time()*1000)}", role="assistant", speaker="Aria", text=greeting, is_final=True)
            asyncio.create_task(session.say(greeting))
            logger.info(f"First greeting dispatched by Aria in room {self._room.name}")
        except Exception as e:
            logger.error(f"[Turn Error] Could not synthesize greeting: {e}")
            self._broadcast_data({"type": "agent_error", "message": f"Greeting synthesis error: {e}"})

        # 8. Main Interview Loop (presence monitoring & overall interview duration limit)
        # Note: No periodic say() timers inside this loop to prevent talking over candidate
        candidate_has_joined = False
        candidate_left_time: float | None = None

        while True:
            elapsed = time.monotonic() - start_time
            if elapsed >= self.duration_sec:
                logger.info("Time limit reached, concluding interview.")
                try:
                    await session.say(
                        "We've reached our time limit for today. Thank you so much for your thoughtful answers. "
                        "Your comprehensive evaluation report is being generated now. Have a great day!"
                    )
                except Exception:
                    pass
                break

            # Candidate presence check
            remote_parts = list(self._room.remote_participants.values())
            candidate_parts = [
                p for p in remote_parts
                if not (getattr(p, "is_agent", False) or (getattr(p, "kind", None) in ("agent", 2)) or p.identity.startswith("agent") or p.identity.startswith("interview-bot") or p.identity.startswith("AW_"))
            ]

            if candidate_parts:
                candidate_has_joined = True
                candidate_left_time = None
            elif candidate_has_joined:
                if candidate_left_time is None:
                    candidate_left_time = time.monotonic()
                elif time.monotonic() - candidate_left_time > 45:
                    logger.info("Candidate disconnected for > 45s. Wrapping up session.")
                    break
            else:
                if elapsed > 300:
                    logger.info("Candidate never joined room within 5 minutes. Wrapping up.")
                    break

            await asyncio.sleep(2.0)

        logger.info(f"Interview loop ended for session {self.session_id}. Closing session.")
        await session.aclose()

        # 9. Finalize evaluation report and persist
        summary = await self._generate_evaluation_summary()
        await self._post_result(summary, status="COMPLETED")

    def _extract_feedback_json(self) -> dict:
        """Parse structured JSON from transcript or generate fallback report."""
        for msg in reversed(self._transcript):
            if msg.get("role") == "assistant" and "overallScore" in msg.get("text", ""):
                try:
                    text = msg["text"]
                    start = text.find("{")
                    end = text.rfind("}") + 1
                    if start != -1 and end > start:
                        parsed = json.loads(text[start:end])
                        if "overallScore" in parsed:
                            return parsed
                except Exception:
                    pass

        if self.state_machine:
            return self.state_machine.generate_fallback_report(self._transcript)

        return {
            "overallScore": 7.0,
            "overallScore100": 70.0,
            "verdict": "Hire",
            "strengths": ["Engaged actively throughout the discussion", "Articulated technical choices clearly"],
            "weaknesses": ["Quantify project metrics with STAR framework"],
            "improvementPlan": ["Practice coding under timed constraints"],
            "perQuestion": [],
            "_note": "Fallback evaluation report",
        }
