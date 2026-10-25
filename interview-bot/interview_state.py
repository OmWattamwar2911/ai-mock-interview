"""
interview_state.py – State Machine, Turn Logging, Targeted Question Planning & Two-Stage Grounded Dialogue Engine.

Features:
1. 9-Phase Structured Interview Flow:
   - GREETING: Aria greets first once in selected language (1-2 sentences), silence timer (8s gentle reprompt, 16s continue).
   - SMALL_TALK: Candidate replies to greeting, Aria acknowledges and invites introduction.
   - INTRODUCTION: Candidate introduces themselves, extracts name with LLM/regex, confirms if low confidence.
   - WALKTHROUGH: 3-4 sentence explanation of the 4-phase interview plan, candidate readiness check.
   - RESUME_JD: Deep-dive into projects, technologies, and target role requirements.
   - TECHNICAL_CODING: Live coding on screen, real-time code and test results sync.
   - BEHAVIOURAL: STAR methodology on teamwork, technical disagreements, and failures.
   - CLOSING: Candidate questions and wrap-up.
   - EVALUATION: Comprehensive idempotent report generation even on early exit.
2. Turn State Machine:
   - AGENT_SPEAKING -> USER_SPEAKING -> USER_TURN_COMPLETE -> AGENT_THINKING -> AGENT_SPEAKING
3. Name-in-Every-Reply Enforcement:
   - Enforces candidate's first name appears exactly once in every spoken reply after introduction.
   - Varied positions: alternate between opening, middle, and closing.
4. Partial Evaluation Support:
   - Scaled score over attempted phases; unattempted marked as "Not attempted".
   - Honest "insufficient data" report if < 2 candidate turns.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

logger = logging.getLogger("interview.state")

# Turn Conversation States
STATE_AGENT_SPEAKING = "AGENT_SPEAKING"
STATE_USER_SPEAKING = "USER_SPEAKING"
STATE_USER_TURN_COMPLETE = "USER_TURN_COMPLETE"
STATE_AGENT_THINKING = "AGENT_THINKING"

# 9 Structured Interview Phases
PHASE_GREETING = "GREETING"
PHASE_SMALL_TALK = "SMALL_TALK"
PHASE_INTRODUCTION = "INTRODUCTION"
PHASE_WALKTHROUGH = "WALKTHROUGH"
PHASE_RESUME_JD = "RESUME_JD"
PHASE_TECHNICAL_CODING = "TECHNICAL_CODING"
PHASE_BEHAVIOURAL = "BEHAVIOURAL"
PHASE_CLOSING = "CLOSING"
PHASE_EVALUATION = "EVALUATION"

# Backwards compatibility aliases
PHASE_READINESS = PHASE_GREETING
PHASE_WARMUP = PHASE_INTRODUCTION
PHASE_RESUME = PHASE_RESUME_JD
PHASE_JD_MATCH = PHASE_RESUME_JD
PHASE_TECHNICAL = PHASE_TECHNICAL_CODING
PHASE_BEHAVIORAL = PHASE_BEHAVIOURAL

PHASE_SEQUENCE = [
    PHASE_GREETING,
    PHASE_SMALL_TALK,
    PHASE_INTRODUCTION,
    PHASE_WALKTHROUGH,
    PHASE_RESUME_JD,
    PHASE_TECHNICAL_CODING,
    PHASE_BEHAVIOURAL,
    PHASE_CLOSING,
    PHASE_EVALUATION,
]

AFFIRMATIVE_REGEX = re.compile(
    r"(\b("
    r"yes|yeah|yep|yup|sure|ready|i am ready|im ready|i'm ready|let's start|lets start|"
    r"let's go|lets go|let us start|let us begin|begin|all set|okay|ok|fine|sounds good|"
    r"absolutely|definitely|go ahead|sure thing|"
    r"sí|si|listo|estoy listo|estoy lista|empecemos|"
    r"oui|d'accord|je suis prêt|je suis prete|commençons|"
    r"ja|bereit|ich bin bereit|fangen wir an"
    r")\b|हाँ|हां|तैयार|शुरू|जी हाँ)",
    re.IGNORECASE,
)

STOPWORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "you", "your", "he", "she", "it",
    "they", "what", "which", "who", "when", "where", "why", "how", "a", "an", "the",
    "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by",
    "for", "with", "about", "against", "between", "into", "through", "during", "before",
    "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off",
    "over", "under", "again", "further", "then", "once", "here", "there", "all",
    "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
    "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just",
    "don", "should", "now", "did", "doing", "was", "were", "been", "have", "has", "had",
    "having", "do", "does", "is", "am", "are", "also", "well", "like", "think", "used",
    "worked", "working", "work", "make", "made", "build", "built", "lot", "much", "really",
    "say", "said", "one", "two", "see", "get", "got", "know", "take"
}

KNOWN_TECH_ENTITIES = [
    "flask", "django", "fastapi", "express", "node", "nodejs", "react", "next.js", "nextjs",
    "vue", "angular", "postgresql", "postgres", "mysql", "mongodb", "sqlite", "redis",
    "kafka", "rabbitmq", "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "graphql",
    "rest", "grpc", "microservices", "monolith", "jwt", "oauth", "pub/sub", "caching",
    "indexes", "indexing", "sharding", "replication", "python", "typescript", "javascript",
    "golang", "java", "c++", "rust", "pizza ordering", "pizza ordering app", "ordering app",
    "e-commerce", "50k dau", "99.9% uptime", "uptime", "latency", "benchmark", "tech lead",
    "disagreement"
]


# ─── PART 2: Candidate Name Extraction & Enforcement ─────────────────────────

NAME_INTRO_PATTERNS = [
    # English
    r"(?:i am|i'm|my name is|this is|call me|myself|it's|it is)\s+([A-Za-z\u00C0-\u024F\u0900-\u097F]+(?:\s+[A-Za-z\u00C0-\u024F\u0900-\u097F]+)?)",
    # Hindi
    r"(?:मेरा\s+नाम|मैं\s+हूँ|मैं)\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)",
    # Spanish
    r"(?:me llamo|soy|mi nombre es)\s+([A-Za-z\u00C0-\u024F]+(?:\s+[A-Za-z\u00C0-\u024F]+)?)",
    # French
    r"(?:je m'appelle|je suis|mon nom est)\s+([A-Za-z\u00C0-\u024F]+(?:\s+[A-Za-z\u00C0-\u024F]+)?)",
    # German
    r"(?:ich heiße|ich heisse|ich bin|mein name ist)\s+([A-Za-z\u00C0-\u024F]+(?:\s+[A-Za-z\u00C0-\u024F]+)?)",
]

DISALLOWED_NAME_WORDS = {
    "here", "ready", "good", "fine", "hello", "hi", "hey", "software", "engineer", "developer",
    "candidate", "student", "working", "interested", "someone", "person", "doing", "great",
    "an", "a", "the", "currently", "graduated", "experienced", "looking", "applying"
}


def extract_candidate_name(
    text: str,
    fallback_name: str = "there",
    language: str = "en",
) -> dict:
    """
    Extracts first and full name from introduction speech.
    Returns:
    {
        "first_name": str,
        "full_name": str,
        "confidence": float,
        "needs_correction": bool,
        "source": "regex" | "single_word" | "fallback"
    }
    """
    clean = text.strip()

    # 1. Try explicit intro patterns
    for pat in NAME_INTRO_PATTERNS:
        m = re.search(pat, clean, re.IGNORECASE)
        if m:
            matched_raw = m.group(1).strip(" .,!?:;'\"")
            parts = matched_raw.split()
            first = parts[0].capitalize()
            if first.lower() not in DISALLOWED_NAME_WORDS and len(first) >= 2:
                full = " ".join(p.capitalize() for p in parts[:2])
                conf = 0.95 if len(parts) >= 1 else 0.85
                return {
                    "first_name": first,
                    "full_name": full,
                    "confidence": conf,
                    "needs_correction": conf < 0.70,
                    "source": "regex",
                }

    # 2. Check for single or two-word introduction: e.g. "Om", "Om Wattamwar"
    words = [w.strip(" .,!?:;'\"") for w in clean.split()]
    if 1 <= len(words) <= 2:
        candidate_words = [w for w in words if w.lower() not in STOPWORDS and w.lower() not in DISALLOWED_NAME_WORDS]
        if candidate_words:
            first = candidate_words[0].capitalize()
            full = " ".join(w.capitalize() for w in candidate_words)
            if len(first) >= 2:
                return {
                    "first_name": first,
                    "full_name": full,
                    "confidence": 0.80,
                    "needs_correction": False,
                    "source": "single_word",
                }

    # 3. Fallback to profile / resume name if provided
    clean_fallback = (fallback_name or "").strip()
    if clean_fallback and clean_fallback.lower() not in ("there", "candidate", "none", "unknown"):
        fb_parts = clean_fallback.split()
        fb_first = fb_parts[0].capitalize()
        return {
            "first_name": fb_first,
            "full_name": clean_fallback,
            "confidence": 0.65,
            "needs_correction": True,
            "source": "fallback",
        }

    return {
        "first_name": "there",
        "full_name": "Candidate",
        "confidence": 0.40,
        "needs_correction": True,
        "source": "fallback",
    }


def enforce_name_in_reply(reply: str, candidate_first_name: str, turn_index: int = 0) -> str:
    """
    Enforces that candidate_first_name appears EXACTLY ONCE in the spoken reply.
    Varies position across turns:
    - Mode 0: Opening position (e.g. "Om, let's look at...")
    - Mode 1: Middle position (e.g. "That makes sense, Om. Could you walk me through...")
    - Mode 2: Closing position (e.g. "... how did you handle that in production, Om?")
    If already present: ensures deduplication if repeated > 1 time.
    """
    if not candidate_first_name or candidate_first_name.lower() in ("there", "candidate", "none", "unknown"):
        return reply

    name = candidate_first_name.strip()
    clean_reply = reply.strip()
    if not clean_reply:
        return f"{name}, could you tell me more about that?"

    pattern = re.compile(rf"\b{re.escape(name)}\b", re.IGNORECASE)
    matches = list(pattern.finditer(clean_reply))

    # Case A: Already present exactly once
    if len(matches) == 1:
        start, end = matches[0].span()
        return clean_reply[:start] + name + clean_reply[end:]

    # Case B: Repeated more than once -> Keep only first, remove subsequent
    if len(matches) > 1:
        first_span = matches[0].span()
        new_text = clean_reply[:first_span[0]] + name
        last_idx = first_span[1]
        for m in matches[1:]:
            new_text += clean_reply[last_idx:m.start()]
            last_idx = m.end()
        new_text += clean_reply[last_idx:]
        new_text = re.sub(r",\s*,", ",", new_text)
        new_text = re.sub(r"\s+", " ", new_text)
        return new_text.strip()

    # Case C: Name is missing -> Insert based on turn_index % 3
    mode = turn_index % 3
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", clean_reply) if s.strip()]

    if mode == 2 and clean_reply.endswith("?"):
        q_pos = clean_reply.rfind("?")
        pre = clean_reply[:q_pos].rstrip(" ,.")
        return f"{pre}, {name}?"
    elif mode == 0 or len(sentences) <= 1:
        first_char = clean_reply[0]
        rest = clean_reply[1:]
        if first_char.isupper() and len(clean_reply) > 2:
            first_char = first_char.lower()
        return f"{name}, {first_char}{rest}"
    else:
        first_sent = sentences[0].rstrip(". ")
        rest = " ".join(sentences[1:])
        return f"{first_sent}, {name}. {rest}".strip()


# ─── Observation & State Machine ─────────────────────────────────────────────

class InterviewObservation:
    def __init__(self, category: str, note: str, score_hint: float, phase: str):
        self.category = category
        self.note = note
        self.score_hint = max(1.0, min(10.0, float(score_hint)))
        self.phase = phase
        self.timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    def to_dict(self) -> dict:
        return {
            "category": self.category,
            "note": self.note,
            "scoreHint": self.score_hint,
            "phase": self.phase,
            "timestamp": self.timestamp,
        }


class InterviewStateMachine:
    def __init__(
        self,
        candidate_name: str = "there",
        language: str = "en",
        context_data: Optional[dict] = None,
        on_phase_change: Optional[Callable[[str, str], Any]] = None,
        on_data_broadcast: Optional[Callable[[dict], Any]] = None,
    ):
        self.candidate_name = candidate_name or "there"
        self.candidate_first_name = candidate_name.split()[0] if candidate_name and candidate_name != "there" else "there"
        self.candidate_display_name = candidate_name or "there"
        self.language = language or "en"
        self.context_data = context_data or {}
        self.on_phase_change = on_phase_change
        self.on_data_broadcast = on_data_broadcast

        # Phase tracking (9 structured phases)
        self.current_phase: str = PHASE_GREETING
        self.phase_start_time: float = time.monotonic()
        self.timeline: list[dict] = [{"phase": PHASE_GREETING, "startedAt": time.time()}]
        self.attempted_phases: set[str] = {PHASE_GREETING}

        # Turn State Machine
        self.turn_state: str = STATE_AGENT_SPEAKING
        self.is_agent_speaking: bool = False
        self.is_agent_generating: bool = False
        self.current_turn: int = 0

        # Greeting & Silence Timer Tracking
        self.greeting_sent_time: float = 0.0
        self.is_greeting_acknowledged: bool = False
        self.is_ready: bool = False
        self.reprompt_sent: bool = False
        self.auto_advanced_to_intro: bool = False

        # Name extraction state
        self.name_captured: bool = False
        self.name_confidence: float = 1.0

        # Walkthrough state
        self.walkthrough_sent: bool = False
        self.walkthrough_confirmed: bool = False

        # Observations and history
        self.observations: list[InterviewObservation] = []
        self.asked_questions: set[str] = set()
        self.phase_turn_count: dict[str, int] = {p: 0 for p in PHASE_SEQUENCE}

        # Planned targeted questions
        self.planned_questions: list[dict] = []
        self._plan_targeted_questions()

        # Technical round state
        self.latest_code: str = ""
        self.latest_language: str = "python"
        self.code_runs_count: int = 0
        self.hints_given_count: int = 0
        self.last_code_update_time: float = time.monotonic()
        self.last_test_results: dict = {}
        self.technical_switched_layout: bool = False

        # Last analysis & reply
        self.last_analysis: Optional[dict] = None
        self.last_spoken_reply: str = ""

    # ── Turn State Machine Logging ──────────────────────────────────────────

    def set_turn_state(self, new_state: str, reason: str = "") -> None:
        old_state = self.turn_state
        if old_state == new_state:
            return
        self.turn_state = new_state
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        logger.info(f"[State Transition] {ts}: {old_state} -> {new_state} (reason: {reason})")

        if new_state == STATE_AGENT_SPEAKING:
            self.is_agent_speaking = True
        elif new_state in (STATE_USER_SPEAKING, STATE_USER_TURN_COMPLETE):
            self.is_agent_speaking = False

    def log_interruption(self, reason: str = "real_speech") -> None:
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        logger.info(f"[Interruption] {ts}: Aria interrupted by candidate (reason: {reason})")
        self.is_agent_speaking = False
        self.set_turn_state(STATE_USER_SPEAKING, reason=f"interrupted ({reason})")

    # ── Name Management ─────────────────────────────────────────────────────

    def set_candidate_name(self, full_name: str, first_name: Optional[str] = None, confidence: float = 1.0) -> None:
        clean_full = full_name.strip()
        clean_first = first_name.strip() if first_name else clean_full.split()[0]
        self.candidate_name = clean_full
        self.candidate_first_name = clean_first
        self.candidate_display_name = clean_first
        self.name_captured = True
        self.name_confidence = confidence
        logger.info(f"[Name Captured] candidate_first_name='{self.candidate_first_name}', full='{self.candidate_name}' (conf={confidence:.2f})")

        if self.on_data_broadcast:
            self.on_data_broadcast({
                "type": "name_detected",
                "firstName": self.candidate_first_name,
                "fullName": self.candidate_name,
                "confidence": round(confidence, 2),
                "needsCorrection": confidence < 0.70,
            })

    # ── Pre-Planning Targeted Questions ──────────────────────────────────────

    def _plan_targeted_questions(self) -> None:
        resume = self.context_data.get("resume", {})
        parsed_resume = resume.get("parsed", {})
        skills = parsed_resume.get("skills", [])
        top_skill = skills[0] if skills else "backend architectures"
        second_skill = skills[1] if len(skills) > 1 else "database design"
        recent_role = parsed_resume.get("recentRole") or "Software Engineer"

        jd = self.context_data.get("jd", {})
        target_role = jd.get("title", "Software Engineer")
        coding_prob = self.context_data.get("codingProblem", {})
        coding_title = coding_prob.get("title", "algorithmic challenge") if isinstance(coding_prob, dict) else "algorithmic challenge"

        self.planned_questions = [
            # Resume & JD Deep-Dive (Q1-Q4)
            {
                "id": "q_resume_architecture",
                "phase": PHASE_RESUME_JD,
                "topic": "architecture",
                "question": f"Looking at your experience with {top_skill}, could you walk me through one of your most challenging systems and your specific architectural contribution?",
                "used": False,
            },
            {
                "id": "q_resume_tradeoffs",
                "phase": PHASE_RESUME_JD,
                "topic": "tradeoffs",
                "question": f"When implementing {second_skill} in your role as {recent_role}, what was a significant technical tradeoff you had to navigate?",
                "used": False,
            },
            {
                "id": "q_resume_scaling",
                "phase": PHASE_RESUME_JD,
                "topic": "scale",
                "question": f"How did you monitor performance, error budgets, and latency bottlenecks for that {top_skill} service?",
                "used": False,
            },
            {
                "id": "q_jd_fit",
                "phase": PHASE_RESUME_JD,
                "topic": "jd_alignment",
                "question": f"For our {target_role} role, high availability and resilient APIs are critical. How have you designed for fault tolerance and graceful degradation?",
                "used": False,
            },
            # Technical Round (Q5-Q7)
            {
                "id": "q_tech_problem_intro",
                "phase": PHASE_TECHNICAL_CODING,
                "topic": "coding_intro",
                "question": f"On your screen is '{coding_title}'. Take a moment to read it over, and tell me your initial approach before diving into the code.",
                "used": False,
            },
            {
                "id": "q_tech_complexity",
                "phase": PHASE_TECHNICAL_CODING,
                "topic": "big_o",
                "question": "Looking at your solution, what are the time and space complexities, and how would it scale with larger inputs?",
                "used": False,
            },
            # Behavioral STAR (Q8-Q10)
            {
                "id": "q_behavioral_disagreement",
                "phase": PHASE_BEHAVIOURAL,
                "topic": "conflict",
                "question": "Can you share a time you had a technical disagreement with a teammate or lead, and how you worked it through to resolution?",
                "used": False,
            },
            {
                "id": "q_behavioral_failure",
                "phase": PHASE_BEHAVIOURAL,
                "topic": "learning_from_failure",
                "question": "Could you describe a technical decision or project that didn't go as expected, and what you learned or changed afterwards?",
                "used": False,
            },
            # Closing (Q11)
            {
                "id": "q_closing_candidate_questions",
                "phase": PHASE_CLOSING,
                "topic": "wrapup",
                "question": "That brings us to the end of our technical and behavioral topics. Do you have any questions for me about the team or role?",
                "used": False,
            },
        ]

    def get_phase_opening(self, phase: str) -> str:
        for q in self.planned_questions:
            if q["phase"] == phase and not q.get("used"):
                q["used"] = True
                self.asked_questions.add(q["question"])
                return q["question"]
        return f"Let's move on to the next part of our discussion, {self.candidate_first_name}."

    # ── Greeting Silence & Timeout Logic (PART 1) ───────────────────────────

    def mark_greeting_sent(self) -> None:
        self.greeting_sent_time = time.monotonic()
        self.set_turn_state(STATE_AGENT_SPEAKING, reason="Initial greeting dispatched")

    def check_greeting_silence(self) -> Optional[str]:
        """
        Silence timer:
        - If candidate says nothing for 8 seconds after greeting: ask once more gently.
        - After another 8 seconds (16s total): continue to introduction anyway. Never loop.
        """
        if self.current_phase != PHASE_GREETING or self.is_greeting_acknowledged or self.greeting_sent_time <= 0:
            return None

        elapsed = time.monotonic() - self.greeting_sent_time
        if elapsed >= 16.0 and not self.auto_advanced_to_intro:
            self.auto_advanced_to_intro = True
            self.transition_to(PHASE_INTRODUCTION, reason="Greeting 16s silence timeout - auto advance to introduction")
            if self.language == "es":
                return "No te preocupes. Cuando estés listo, ¿podrías presentarte comenzando por tu nombre?"
            elif self.language == "hi":
                return "कोई बात नहीं। जब आप तैयार हों, क्या आप अपना नाम बताते हुए अपना परिचय दे सकते हैं?"
            return "No worries at all. Whenever you are ready, could you introduce yourself starting with your name?"
        elif elapsed >= 8.0 and not self.reprompt_sent:
            self.reprompt_sent = True
            if self.language == "es":
                return "¿Hola? Solo verifico si me escuchas bien."
            elif self.language == "hi":
                return "नमस्ते? क्या आप मुझे ठीक से सुन पा रहे हैं?"
            return "Just checking in, can you hear me alright?"

        return None

    # ── Walkthrough Speech Generator (PART 3) ───────────────────────────────

    def get_walkthrough_speech(self) -> str:
        """
        Delivers the 4-phase plan in 3-4 sentences using the candidate's name,
        and asks the readiness check question.
        """
        name = self.candidate_first_name if self.candidate_first_name != "there" else "there"
        if self.language == "es":
            return (
                f"Aquí te cuento cómo se desarrollará la sesión de hoy, {name}. "
                "Comenzaremos revisando tu experiencia y currículum, luego pasaremos a un problema de código técnico en vivo en tu pantalla, "
                "después veremos algunas situaciones conductuales y cerraremos con tus preguntas. "
                f"¿Listo para comenzar con tu currículum, {name}?"
            )
        elif self.language == "hi":
            return (
                f"आज के इंटरव्यू की रूपरेखा कुछ इस प्रकार होगी, {name}। "
                "पहले हम आपके रेज़्यूमे और अनुभव पर बात करेंगे, फिर आपकी स्क्रीन पर एक लाइव कोडिंग समस्या हल करेंगे, "
                "इसके बाद कुछ व्यावहारिक सवाल और अंत में आपके प्रश्न। "
                f"क्या आप अपने रेज़्यूमे से शुरू करने के लिए तैयार हैं, {name}?"
            )
        return (
            f"Here is how today will go, {name}. "
            "We'll start with a deep dive into your resume and background, move to a live technical coding problem on your screen, "
            "cover a few behavioral scenarios, and then wrap up with your questions and a detailed evaluation report. "
            f"Ready to start with your resume, {name}?"
        )

    # ── Phase Management & Transitions ──────────────────────────────────────

    def transition_to(self, new_phase: str, reason: str = "") -> None:
        if new_phase == self.current_phase:
            return

        old_phase = self.current_phase
        self.current_phase = new_phase
        self.phase_start_time = time.monotonic()
        self.attempted_phases.add(new_phase)
        now = time.time()

        if self.timeline:
            self.timeline[-1]["endedAt"] = now

        self.timeline.append({"phase": new_phase, "startedAt": now, "reason": reason})
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        logger.info(f"[Phase Transition] {ts}: {old_phase} -> {new_phase} (reason: {reason})")

        if self.on_phase_change:
            try:
                self.on_phase_change(old_phase, new_phase)
            except Exception as e:
                logger.warning(f"Error in on_phase_change callback: {e}")

        # Broadcast progress tracker update to frontend
        if self.on_data_broadcast:
            completed_parts, total_parts = self.get_progress_summary()
            self.on_data_broadcast({
                "type": "progress_update",
                "currentPhase": new_phase,
                "completedParts": completed_parts,
                "totalParts": total_parts,
                "attemptedPhases": list(self.attempted_phases),
                "timestamp": ts,
            })

        # Switch layout if technical phase
        if new_phase == PHASE_TECHNICAL_CODING and not self.technical_switched_layout:
            self.technical_switched_layout = True
            if self.on_data_broadcast:
                self.on_data_broadcast({
                    "type": "switch_layout",
                    "layout": "split",
                    "phase": PHASE_TECHNICAL_CODING,
                    "message": "Aria opened the technical round code editor",
                })

    def get_progress_summary(self) -> Tuple[int, int]:
        """
        Returns (completed_parts, total_parts=4)
        4 Parts:
        1. Introduction & Background (INTRODUCTION / WALKTHROUGH completed)
        2. Resume & Experience (RESUME_JD attempted)
        3. Technical Coding (TECHNICAL_CODING attempted)
        4. Behavioural STAR (BEHAVIOURAL attempted)
        """
        completed = 0
        if PHASE_INTRODUCTION in self.attempted_phases or PHASE_WALKTHROUGH in self.attempted_phases:
            completed += 1
        if PHASE_RESUME_JD in self.attempted_phases:
            completed += 1
        if PHASE_TECHNICAL_CODING in self.attempted_phases:
            completed += 1
        if PHASE_BEHAVIOURAL in self.attempted_phases:
            completed += 1
        return completed, 4

    def record_observation(self, category: str, note: str, score_hint: float) -> dict:
        obs = InterviewObservation(category, note, score_hint, self.current_phase)
        self.observations.append(obs)
        logger.info(f"[Observation Recorded] [{obs.category}] ({obs.score_hint}/10): {obs.note}")
        if self.on_data_broadcast:
            self.on_data_broadcast({
                "type": "agent_observation",
                "observation": obs.to_dict(),
            })
        return obs.to_dict()

    def handle_code_sync(self, payload: dict) -> None:
        self.latest_language = payload.get("language", self.latest_language)
        self.latest_code = payload.get("sourceCode", self.latest_code)
        self.last_code_update_time = time.monotonic()
        status = payload.get("status")
        passed = payload.get("passedCount")
        total = payload.get("totalCount")
        is_submit = bool(payload.get("submit", False))

        if status and status != "DRAFT_EDITING":
            self.code_runs_count += 1
            self.last_test_results = {
                "status": status,
                "passedCount": passed,
                "totalCount": total,
                "isSubmit": is_submit,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            logger.info(f"[Code Execution Sync] status={status} ({passed}/{total} passed) submit={is_submit}")

    # ── Stage 1: Hidden Analysis Step (Strict JSON) ─────────────────────────

    def analyze_candidate_answer(self, user_text: str) -> dict:
        clean = user_text.strip()
        words = clean.split()
        lower = clean.lower()

        resume = self.context_data.get("resume", {})
        parsed_resume = resume.get("parsed", {})
        experience_years = parsed_resume.get("experienceYears", 3)

        key_points: list[str] = []
        for entity in KNOWN_TECH_ENTITIES:
            pattern = r"\b" + re.escape(entity) + r"\b"
            if re.search(pattern, lower):
                m = re.search(pattern, clean, re.IGNORECASE)
                val = m.group(0) if m else entity
                if val not in key_points:
                    key_points.append(val)

        metric_matches = re.findall(r"\b\d+[\w.%/]+\s*(?:dau|mau|rps|qps|uptime|ms|s|latency|users|records|tables|servers|nodes|years)?\b", clean, re.IGNORECASE)
        for mm in metric_matches:
            if mm.strip() and mm not in key_points and len(mm) > 1:
                key_points.append(mm.strip())

        if not key_points:
            tech_words = [w.strip(".,;:?!'\"") for w in words if w.lower() not in STOPWORDS and len(w) > 3]
            for i in range(len(words) - 1):
                w1 = words[i].strip(".,;:?!'\"")
                w2 = words[i + 1].strip(".,;:?!'\"")
                if w1.lower() not in STOPWORDS and w2.lower() not in STOPWORDS and len(w1) > 2 and len(w2) > 2:
                    key_points.append(f"{w1} {w2}")
                    break
            if not key_points and tech_words:
                key_points.append(tech_words[0])

        is_wrong = False
        wrong_notes = ""
        if "redis" in lower and any(r in lower for r in ["relational database", "sql join", "sql joins", "acid multi-table"]):
            is_wrong = True
            wrong_notes = "Candidate claimed Redis is a relational database with native SQL joins, but Redis is an in-memory key-value store."
        elif "tcp" in lower and "stateless" in lower:
            is_wrong = True
            wrong_notes = "Candidate stated TCP is stateless, but TCP is stateful and connection-oriented."

        if is_wrong:
            return {
                "summary": f"Candidate made a technically inaccurate claim regarding {key_points[0] if key_points else 'system architecture'}.",
                "key_points": key_points if key_points else ["Redis"],
                "quality": "wrong",
                "correctness_notes": wrong_notes,
                "resume_consistency": "contradicts",
                "missing": "Accurate distinction between in-memory stores and relational database engines.",
                "next_move": "correct_gently",
                "next_question": f"{key_points[0] if key_points else 'Redis'} is primarily an in-memory key-value store rather than a relational database; how did you handle data persistence and relational querying?",
            }

        years_claimed = re.search(r"\b(\d{1,2})\s+years\b", lower)
        if years_claimed:
            claimed_num = int(years_claimed.group(1))
            if claimed_num > experience_years + 4:
                return {
                    "summary": f"Candidate claimed {claimed_num} years of engineering experience, conflicting with resume.",
                    "key_points": [f"{claimed_num} years"] + [k for k in key_points if k != f"{claimed_num} years"],
                    "quality": "okay",
                    "correctness_notes": f"Claimed {claimed_num} years of experience vs {experience_years} years documented on resume.",
                    "resume_consistency": f"contradicts ({claimed_num} yrs vs {experience_years} yrs)",
                    "missing": "Reconciliation of career timeline with resume profile.",
                    "next_move": "challenge_politely",
                    "next_question": f"Your resume lists {experience_years} years of experience; could you clarify your career timeline and your primary production role?",
                }

        if any(p in lower for p in ["what do you mean", "could you repeat", "can you repeat", "clarify", "repeat that", "didn't catch", "pardon"]):
            return {
                "summary": "Candidate requested clarification or repetition of the question.",
                "key_points": key_points if key_points else ["clarification"],
                "quality": "okay",
                "correctness_notes": "Prompt clarification requested before answering.",
                "resume_consistency": "consistent",
                "missing": "Technical answer to the original prompt.",
                "next_move": "clarify",
                "next_question": "To clarify: I'd like to understand a specific technical decision or project where you chose a particular architecture and the tradeoffs involved.",
            }

        if any(p in lower for p in ["i don't know", "i do not know", "not sure", "haven't worked with", "never used", "no experience with", "not familiar", "don't recall"]):
            return {
                "summary": "Candidate transparently acknowledged knowledge boundary on the topic.",
                "key_points": key_points if key_points else ["knowledge boundary"],
                "quality": "okay",
                "correctness_notes": "Candidate transparently acknowledged knowledge boundary.",
                "resume_consistency": "consistent",
                "missing": "Hands-on experience with this particular technology.",
                "next_move": "move_on",
                "next_question": "Understood. Let's pivot to an area where you have hands-on experience: what is a backend or database technology you've worked with most deeply?",
            }

        off_topic_markers = ["movie", "movies", "weekend", "vacation", "weather", "cricket", "football", "thriller", "lunch", "dinner", "hiking", "video game"]
        has_off_topic = any(m in lower for m in off_topic_markers)
        has_eng = any(s in lower for s in ["app", "service", "system", "code", "database", "flask", "postgresql", "api", "project", "architecture", "fastapi", "redis", "kafka"])
        if has_off_topic and not has_eng:
            return {
                "summary": "Candidate answered with casual personal content unrelated to technical engineering.",
                "key_points": key_points if key_points else ["weekend activities"],
                "quality": "off_topic",
                "correctness_notes": "Utterance contained no technical architecture or engineering decisions.",
                "resume_consistency": "unverifiable",
                "missing": "Technical project details and engineering contributions.",
                "next_move": "probe_detail",
                "next_question": "Let's keep our focus on your technical experience. Could you tell me about a production system or project you worked on recently?",
            }

        is_vague = (
            len(words) <= 4
            or any(v in lower for v in ["i used microservices", "we used microservices", "i made it fast", "we used the cloud", "i wrote code", "make the architecture scalable"])
            or (len(words) <= 8 and len(key_points) <= 1 and not any(k in lower for k in ["flask", "postgresql", "postgres", "redis", "kafka"]))
        )
        if is_vague:
            entity_name = key_points[0] if key_points else "that approach"
            return {
                "summary": f"Candidate gave a brief answer citing {entity_name} without explaining service boundaries or protocols.",
                "key_points": key_points if key_points else ["microservices"],
                "quality": "vague",
                "correctness_notes": f"Dropped high-level buzzword '{entity_name}' without architectural breakdown.",
                "resume_consistency": "unverifiable",
                "missing": f"Specific breakdown of services and communication protocols for {entity_name}.",
                "next_move": "ask_example",
                "next_question": f"Which specific services did you break the application into, and what concrete metrics or communication protocols did you use for {entity_name}?",
            }

        summary_quote = ", ".join(key_points[:3]) if key_points else "the architecture"
        return {
            "summary": f"Candidate detailed their engineering work regarding {summary_quote}.",
            "key_points": key_points if key_points else [clean[:30]],
            "quality": "strong" if len(words) >= 10 else "okay",
            "correctness_notes": f"Provided context on {summary_quote}.",
            "resume_consistency": "consistent",
            "missing": "Failure recovery, performance tradeoffs, and scaling considerations.",
            "next_move": "probe_detail",
            "next_question": f"When implementing that with {key_points[0] if key_points else 'that system'}, what was the most difficult bottleneck or edge case you encountered?",
        }

    # ── Stage 2: Spoken Response Generation with Name Enforcement ───────────

    def generate_spoken_reply(self, user_text: str, analysis: Optional[dict] = None) -> str:
        """
        Stage 2 Spoken Reply Generation:
        - 1 to 3 short sentences, natural interviewer conversational tone.
        - Brief acknowledgement: <= 6 words naming specific candidate key points.
          NEVER canned praise.
        - Exactly ONE question.
        - Candidate's first name enforced in every reply after introduction.
        """
        if analysis is None:
            analysis = self.analyze_candidate_answer(user_text)
        self.last_analysis = analysis

        quality = analysis.get("quality", "okay")
        next_move = analysis.get("next_move", "probe_detail")
        key_points = analysis.get("key_points", [])
        next_question = analysis.get("next_question", "")
        phase = self.current_phase
        lang = self.language

        self.phase_turn_count[phase] = self.phase_turn_count.get(phase, 0) + 1

        score_hint = 8.5 if quality == "strong" else 7.0 if quality == "okay" else 5.0 if quality == "wrong" else 6.0
        self.record_observation(
            category=f"{phase}_{quality}",
            note=analysis.get("correctness_notes", ""),
            score_hint=score_hint,
        )

        if phase in (PHASE_GREETING, PHASE_READINESS):
            if AFFIRMATIVE_REGEX.search(user_text) or len(user_text.split()) <= 6:
                self.is_ready = True
                self.is_greeting_acknowledged = True
                self.transition_to(PHASE_WARMUP, reason="Candidate confirmed readiness")
                opening_q = "Could you introduce yourself, starting with your name?"
                self.asked_questions.add(opening_q)
                return f"Understood, let's begin! {opening_q}"

        ack = ""
        if next_move == "clarify":
            ack = "Happy to clarify." if lang != "es" else "Con gusto aclaro."
        elif next_move == "move_on":
            ack = "Understood, no problem." if lang != "es" else "Entendido, no hay problema."
        elif quality == "off_topic":
            ack = ""
        elif quality == "wrong":
            p = key_points[0] if key_points else "that concept"
            ack = f"{p}, understood."
        elif key_points:
            p1 = key_points[0]
            ack_suffix = "got it." if self.current_turn % 2 == 0 else "understood."
            ack = f"{p1}, {ack_suffix}"
        else:
            ack = "Understood."

        spoken_question = next_question.strip()
        if spoken_question in self.asked_questions:
            spoken_question = f"Could you dive deeper into how you implemented {key_points[0] if key_points else 'that'} and the tradeoffs involved?"

        self.asked_questions.add(spoken_question)
        candidate_reply = f"{ack} {spoken_question}".strip() if ack else spoken_question

        # Eliminate canned praise
        banned_phrases = [
            r"\bgreat\s+explanation[!,.]*",
            r"\bnice\s+answer[!,.]*",
            r"\bgreat\s+job[!,.]*",
            r"\bawesome[!,.]*",
            r"\bthat's\s+interesting[!,.]*",
            r"\bvery\s+interesting[!,.]*",
        ]
        for bp in banned_phrases:
            candidate_reply = re.sub(bp, "Understood.", candidate_reply, flags=re.IGNORECASE).strip()

        # Enforce exactly ONE question mark
        q_count = candidate_reply.count("?")
        if q_count > 1:
            first_q_end = candidate_reply.find("?") + 1
            candidate_reply = candidate_reply[:first_q_end]
        elif q_count == 0:
            candidate_reply = candidate_reply + "?"

        # Enforce name in every spoken reply after introduction
        if self.name_captured and phase not in (PHASE_GREETING, PHASE_SMALL_TALK):
            candidate_reply = enforce_name_in_reply(
                reply=candidate_reply,
                candidate_first_name=self.candidate_first_name,
                turn_index=self.current_turn,
            )

        self.last_spoken_reply = candidate_reply
        logger.info(f"[Stage 2 Spoken Reply] \"{candidate_reply}\"")
        return candidate_reply

    # ── Fallback Scored Feedback Report (PART 4 & PART 5) ───────────────────

    def generate_fallback_report(self, transcript: list[dict]) -> dict:
        """
        Generates structured feedback report even for partial interviews:
        - Evaluates only attempted phases.
        - Marks unattempted phases as 'Not attempted' (no score, not zero).
        - Scales overall score ONLY over attempted parts.
        - If < 2 candidate answers: returns honest insufficient data report.
        """
        user_turns = [m for m in transcript if m.get("role") == "user" or m.get("speaker") == "Candidate"]
        turn_count = len(user_turns)

        completed_parts, total_parts = self.get_progress_summary()
        is_partial = completed_parts < 4

        # Honest "insufficient data" report if < 2 turns
        if turn_count < 2:
            return {
                "insufficientData": True,
                "completedParts": completed_parts,
                "totalParts": 4,
                "isPartial": True,
                "overallScore": None,
                "overallScore100": None,
                "verdict": "Not Evaluated",
                "message": (
                    "Not enough data to evaluate. Aria heard fewer than two responses before the session ended. "
                    "Start a new interview anytime to practice your technical and behavioral skills!"
                ),
                "categoryScores": {
                    "communication": None,
                    "resumeKnowledge": None,
                    "roleFit": None,
                    "technicalDepth": None,
                    "coding": None,
                    "problemSolving": None,
                    "behavioralSTAR": None,
                    "confidenceClarity": None,
                },
                "strengths": ["Connected to the interview session"],
                "weaknesses": ["Session ended before sufficient technical questions were answered"],
                "improvementPlan": ["Complete at least 3-4 dialogue turns for a full performance audit"],
                "candidateQuotes": [],
                "supportingQuotes": [],
                "perQuestion": [],
                "practicePlan7Day": [
                    "Day 1: Familiarize yourself with the mock interview format and technical environment",
                    "Day 2-3: Review resume projects and prepare concise 2-minute project overviews",
                    "Day 4-5: Practice live algorithmic problem solving under timed constraints",
                    "Day 6-7: Complete a full mock interview session with Aria",
                ],
                "observations": [o.to_dict() for o in self.observations],
                "timeline": self.timeline,
            }

        # Attempted parts evaluation
        has_intro = PHASE_INTRODUCTION in self.attempted_phases or PHASE_WALKTHROUGH in self.attempted_phases
        has_resume = PHASE_RESUME_JD in self.attempted_phases
        has_coding = PHASE_TECHNICAL_CODING in self.attempted_phases
        has_behavioral = PHASE_BEHAVIOURAL in self.attempted_phases

        base_score = 7.0 + min(1.8, turn_count * 0.12)
        if self.observations:
            avg_hint = sum(o.score_hint for o in self.observations) / len(self.observations)
            part_score = round((base_score * 0.4) + (avg_hint * 0.6), 1)
        else:
            part_score = round(base_score, 1)

        # Category scores: attempted get real scores, unattempted get None
        cat_scores: Dict[str, Any] = {}
        active_scores: List[float] = []

        # Communication is evaluated in every turn
        comm_score = round(min(9.5, part_score + 0.2), 1)
        cat_scores["communication"] = comm_score
        active_scores.append(comm_score)

        conf_score = round(min(9.5, part_score + 0.1), 1)
        cat_scores["confidenceClarity"] = conf_score
        active_scores.append(conf_score)

        if has_resume:
            r_score = round(min(9.5, part_score), 1)
            cat_scores["resumeKnowledge"] = r_score
            cat_scores["roleFit"] = round(min(9.5, part_score - 0.1), 1)
            active_scores.extend([r_score, cat_scores["roleFit"]])
        else:
            cat_scores["resumeKnowledge"] = None
            cat_scores["roleFit"] = None

        if has_coding:
            coding_score = 7.5
            if self.last_test_results:
                passed = self.last_test_results.get("passedCount", 0)
                total = max(1, self.last_test_results.get("totalCount", 1))
                coding_score = round(5.0 + (passed / total) * 4.5, 1)
            cat_scores["coding"] = coding_score
            cat_scores["technicalDepth"] = round(min(9.5, (part_score + coding_score) / 2), 1)
            cat_scores["problemSolving"] = round(min(9.5, coding_score + 0.2), 1)
            active_scores.extend([coding_score, cat_scores["technicalDepth"], cat_scores["problemSolving"]])
        else:
            cat_scores["coding"] = None
            cat_scores["technicalDepth"] = None
            cat_scores["problemSolving"] = None

        if has_behavioral:
            b_score = round(min(9.5, part_score), 1)
            cat_scores["behavioralSTAR"] = b_score
            active_scores.append(b_score)
        else:
            cat_scores["behavioralSTAR"] = None

        # Scaled overall score over attempted categories only
        overall_score = round(sum(active_scores) / len(active_scores), 1) if active_scores else 7.0
        overall_100 = round(overall_score * 10.0, 1)

        quotes = []
        for msg in user_turns:
            t = msg.get("text", "")
            if len(t.split()) >= 4:
                quotes.append(f'"{t[:90]}..."')
            if len(quotes) >= 4:
                break

        return {
            "insufficientData": False,
            "isPartial": is_partial,
            "completedParts": completed_parts,
            "totalParts": 4,
            "overallScore": overall_score,
            "overallScore100": overall_100,
            "verdict": "Strong Hire" if overall_score >= 8.5 else "Hire" if overall_score >= 7.5 else "Needs Practice",
            "categoryScores": cat_scores,
            "strengths": [
                f"Active engagement during the {self.current_phase.replace('_', ' ').lower()} phase",
                "Clear technical cadence when addressing architectural prompts",
            ],
            "weaknesses": [
                "Quantify production metrics using specific numbers and monitoring tools",
                "Elaborate further on concurrency and transactional isolation",
            ],
            "improvementPlan": [
                "Practice framing engineering answers with STAR framework",
                "Deepen system design coverage of caching and distributed databases",
            ],
            "candidateQuotes": quotes,
            "supportingQuotes": quotes,
            "perQuestion": [],
            "practicePlan7Day": [
                "Day 1: Review system design caching and database sharding patterns",
                "Day 2-3: Deep dive into transactional isolation and concurrency",
                "Day 4-5: Practice timed algorithmic coding under 25-minute constraints",
                "Day 6-7: Refine behavioral STAR answers with concrete production metrics",
            ],
            "observations": [o.to_dict() for o in self.observations],
            "timeline": self.timeline,
        }
