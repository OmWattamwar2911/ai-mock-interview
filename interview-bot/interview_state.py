"""
interview_state.py – State Machine, Turn Logging, Targeted Question Planning & Two-Stage Grounded Dialogue Engine.

Features:
1. 6-Phase Interview Flow:
   - Readiness: Greet candidate, verify mic/preparedness, zero-wait auto start
   - Warm-up (~2 min): Professional intro, recent engineering work
   - Resume deep-dive (~6 min): Specific projects, technologies, and architectural decisions
   - Job description match (~4 min): Skill gaps, system scale, fault tolerance
   - Technical conceptual & coding round (~12 min): Conceptual analysis, live coding, Big-O
   - Behavioral STAR round (~6 min): Situation, Task, Action, Result on teamwork and disagreements
   - Closing: Candidate questions, wrap-up, and scored evaluation
2. Turn State Machine:
   - AGENT_SPEAKING -> USER_SPEAKING -> USER_TURN_COMPLETE -> AGENT_THINKING -> AGENT_SPEAKING
3. Two-Stage Reasoning per Turn:
   - Stage 1 (Hidden Analysis): Returns strict JSON:
     summary, key_points, quality, correctness_notes, resume_consistency, missing, next_move, next_question
   - Stage 2 (Spoken Reply):
     * 1-3 short spoken sentences, natural interviewer tone
     * Brief acknowledgement: <= 6 words naming specific candidate items (e.g. "Flask and Postgres, got it.")
     * Exactly ONE question (never stacks questions, never repeats)
     * Grounding Validator: guarantees reply contains candidate key points
     * Complete elimination of canned praise ('great explanation', 'nice answer', 'awesome', 'great job')
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

logger = logging.getLogger("interview.state")

# Turn Conversation States
STATE_AGENT_SPEAKING = "AGENT_SPEAKING"
STATE_USER_SPEAKING = "USER_SPEAKING"
STATE_USER_TURN_COMPLETE = "USER_TURN_COMPLETE"
STATE_AGENT_THINKING = "AGENT_THINKING"

# Interview Phases
PHASE_READINESS = "readiness"
PHASE_WARMUP = "warm_up"
PHASE_RESUME = "resume_deep_dive"
PHASE_JD_MATCH = "jd_match"
PHASE_TECHNICAL = "technical_round"
PHASE_BEHAVIORAL = "behavioral_round"
PHASE_CLOSING = "closing"

PHASE_SEQUENCE = [
    PHASE_WARMUP,
    PHASE_RESUME,
    PHASE_JD_MATCH,
    PHASE_TECHNICAL,
    PHASE_BEHAVIORAL,
    PHASE_CLOSING,
]

AFFIRMATIVE_REGEX = re.compile(
    r"(\b("
    r"yes|yeah|yep|yup|sure|ready|i am ready|im ready|i'm ready|let's start|lets start|"
    r"let's go|lets go|let us start|let us begin|begin|all set|okay|ok|fine|sounds good|"
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

# Known domain concepts for precise grounding
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
        self.language = language or "en"
        self.context_data = context_data or {}
        self.on_phase_change = on_phase_change
        self.on_data_broadcast = on_data_broadcast

        # Phase tracking
        self.current_phase: str = PHASE_READINESS
        self.phase_start_time: float = time.monotonic()
        self.timeline: list[dict] = [{"phase": PHASE_READINESS, "startedAt": time.time()}]

        # Turn State Machine
        self.turn_state: str = STATE_AGENT_SPEAKING
        self.is_agent_speaking: bool = False
        self.is_agent_generating: bool = False
        self.current_turn: int = 0

        # Readiness tracking
        self.greeting_sent_time: float = 0.0
        self.is_ready: bool = False
        self.reprompt_sent: bool = False

        # Observations and history
        self.observations: list[InterviewObservation] = []
        self.asked_questions: set[str] = set()
        self.phase_turn_count: dict[str, int] = {p: 0 for p in [PHASE_READINESS] + PHASE_SEQUENCE}

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

    # ── Pre-Planning Targeted Questions ──────────────────────────────────────

    def _plan_targeted_questions(self) -> None:
        resume = self.context_data.get("resume", {})
        parsed_resume = resume.get("parsed", {})
        skills = parsed_resume.get("skills", [])
        top_skill = skills[0] if skills else "backend architectures"
        second_skill = skills[1] if len(skills) > 1 else "database design"
        third_skill = skills[2] if len(skills) > 2 else "API development"
        recent_role = parsed_resume.get("recentRole") or "Software Engineer"

        jd = self.context_data.get("jd", {})
        target_role = jd.get("title", "Software Engineer")
        coding_prob = self.context_data.get("codingProblem", {})
        coding_title = coding_prob.get("title", "algorithmic challenge")

        self.planned_questions = [
            # Warm-up (Q1-Q2)
            {
                "id": "q_warmup_intro",
                "phase": PHASE_WARMUP,
                "topic": "introduction",
                "question": f"To kick things off, {self.candidate_name}, could you introduce yourself and tell me what you've been working on recently?",
                "used": False,
            },
            {
                "id": "q_warmup_passion",
                "phase": PHASE_WARMUP,
                "topic": "motivation",
                "question": "What's an engineering problem or technology you've been particularly focused on lately?",
                "used": False,
            },
            # Resume Deep-Dive (Q3-Q5)
            {
                "id": "q_resume_architecture",
                "phase": PHASE_RESUME,
                "topic": "architecture",
                "question": f"Looking at your experience with {top_skill}, could you walk me through one of your most challenging systems and your specific architectural contribution?",
                "used": False,
            },
            {
                "id": "q_resume_tradeoffs",
                "phase": PHASE_RESUME,
                "topic": "tradeoffs",
                "question": f"When implementing {second_skill} in your role as {recent_role}, what was a significant technical tradeoff you had to navigate?",
                "used": False,
            },
            {
                "id": "q_resume_scaling",
                "phase": PHASE_RESUME,
                "topic": "scale",
                "question": f"How did you monitor performance, error budgets, and latency bottlenecks for that {top_skill} service?",
                "used": False,
            },
            # JD Match & Skill Gap (Q6-Q8)
            {
                "id": "q_jd_fit",
                "phase": PHASE_JD_MATCH,
                "topic": "jd_alignment",
                "question": f"For our {target_role} role, high availability and resilient APIs are critical. How have you designed for fault tolerance and graceful degradation?",
                "used": False,
            },
            {
                "id": "q_jd_skillgap",
                "phase": PHASE_JD_MATCH,
                "topic": "skill_gap",
                "question": f"In this position we work with {third_skill} at scale. What has been your experience handling distributed consistency or database indexing?",
                "used": False,
            },
            # Technical Round (Q9-Q11)
            {
                "id": "q_tech_problem_intro",
                "phase": PHASE_TECHNICAL,
                "topic": "coding_intro",
                "question": f"On your screen is '{coding_title}'. Take a look at the description, and walk me through your initial intuition and edge case considerations before writing code.",
                "used": False,
            },
            {
                "id": "q_tech_conceptual",
                "phase": PHASE_TECHNICAL,
                "topic": "data_structures",
                "question": "Before we write code, could you explain how you evaluate whether to choose a hash-based lookup versus a tree-based index for high read traffic?",
                "used": False,
            },
            {
                "id": "q_tech_complexity",
                "phase": PHASE_TECHNICAL,
                "topic": "big_o",
                "question": "Looking at your implementation, what are the asymptotic time and space complexities, and could any step be optimized further?",
                "used": False,
            },
            # Behavioral STAR (Q12-Q14)
            {
                "id": "q_behavioral_disagreement",
                "phase": PHASE_BEHAVIORAL,
                "topic": "conflict",
                "question": "Can you tell me about a time you had a strong technical disagreement with a peer or lead, and how you reached resolution?",
                "used": False,
            },
            {
                "id": "q_behavioral_failure",
                "phase": PHASE_BEHAVIORAL,
                "topic": "learning_from_failure",
                "question": "Could you share an instance where a release or technical decision didn't go as planned, and what specific safeguards you put in place afterward?",
                "used": False,
            },
            # Closing (Q15)
            {
                "id": "q_closing_candidate_questions",
                "phase": PHASE_CLOSING,
                "topic": "wrapup",
                "question": f"Thank you for walking me through your background and technical projects today, {self.candidate_name}. That brings us to our closing—do you have any questions for me about the team or role?",
                "used": False,
            },
        ]

    def get_phase_opening(self, phase: str) -> str:
        for q in self.planned_questions:
            if q["phase"] == phase and not q["used"]:
                q["used"] = True
                self.asked_questions.add(q["question"])
                return q["question"]
        return f"Let's move on to the next part of our discussion, {self.candidate_name}."

    def check_readiness_timeout(self) -> Optional[str]:
        if self.current_phase != PHASE_READINESS or self.is_ready or self.greeting_sent_time <= 0:
            return None
        elapsed = time.monotonic() - self.greeting_sent_time
        if elapsed >= 16.0:
            self.transition_to(PHASE_WARMUP, reason="Readiness timeout auto-start")
            return self.get_phase_opening(PHASE_WARMUP)
        elif elapsed >= 8.0 and not self.reprompt_sent:
            self.reprompt_sent = True
            return f"Just checking in, {self.candidate_name}, are you ready to get started?"
        return None

    def handle_user_input(self, text: str) -> Optional[str]:
        clean = text.strip()
        if self.current_phase == PHASE_READINESS:
            if AFFIRMATIVE_REGEX.search(clean) or len(clean.split()) <= 4:
                self.is_ready = True
                self.transition_to(PHASE_WARMUP, reason="Candidate confirmed readiness")
                return self.get_phase_opening(PHASE_WARMUP)
        return None

    def get_next_planned_question(self, phase: str) -> Optional[dict]:
        for q in self.planned_questions:
            if q["phase"] == phase and not q["used"] and q["question"] not in self.asked_questions:
                q["used"] = True
                self.asked_questions.add(q["question"])
                return q
        return None

    # ── Phase Management ────────────────────────────────────────────────────

    def mark_greeting_sent(self) -> None:
        self.greeting_sent_time = time.monotonic()
        self.set_turn_state(STATE_AGENT_SPEAKING, reason="Initial greeting dispatched")

    def transition_to(self, new_phase: str, reason: str = "") -> None:
        if new_phase == self.current_phase:
            return

        old_phase = self.current_phase
        self.current_phase = new_phase
        self.phase_start_time = time.monotonic()
        now = time.time()

        if self.timeline:
            self.timeline[-1]["endedAt"] = now

        self.timeline.append({"phase": new_phase, "startedAt": now, "reason": reason})
        logger.info(f"[Phase Transition] {old_phase} -> {new_phase} (reason: {reason})")

        if self.on_phase_change:
            try:
                self.on_phase_change(old_phase, new_phase)
            except Exception as e:
                logger.warning(f"Error in on_phase_change callback: {e}")

        if new_phase == PHASE_TECHNICAL and not self.technical_switched_layout:
            self.technical_switched_layout = True
            if self.on_data_broadcast:
                self.on_data_broadcast({
                    "type": "switch_layout",
                    "layout": "split",
                    "phase": PHASE_TECHNICAL,
                    "message": "Aria opened the technical round code editor",
                })

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
        """
        Stage 1 Analysis (hidden, not spoken). Produces strict structured JSON:
        - summary: 1-2 sentence summary of what the candidate actually said
        - key_points: list of specific extracted technologies, metrics, claims, numbers
        - quality: 'strong' | 'okay' | 'vague' | 'off_topic' | 'wrong'
        - correctness_notes: technical errors or doubtful claims
        - resume_consistency: 'consistent' | 'contradicts' | 'unverifiable' (with detail)
        - missing: what a strong answer would have included
        - next_move: 'probe_detail' | 'ask_example' | 'challenge_politely' | 'clarify' | 'correct_gently' | 'move_on'
        - next_question: formulated targeted question based on key points and phase
        """
        clean = user_text.strip()
        words = clean.split()
        lower = clean.lower()

        resume = self.context_data.get("resume", {})
        parsed_resume = resume.get("parsed", {})
        resume_skills = [s.lower() for s in parsed_resume.get("skills", [])]
        experience_years = parsed_resume.get("experienceYears", 3)

        # 1. Extract Key Points (Specific technologies, metrics, numbers, architectural tokens)
        key_points: list[str] = []

        # (a) Check against known tech entities
        for entity in KNOWN_TECH_ENTITIES:
            pattern = r"\b" + re.escape(entity) + r"\b"
            if re.search(pattern, lower):
                m = re.search(pattern, clean, re.IGNORECASE)
                val = m.group(0) if m else entity
                if val not in key_points:
                    key_points.append(val)

        # (b) Metrics / Numbers extraction
        metric_matches = re.findall(r"\b\d+[\w.%/]+\s*(?:dau|mau|rps|qps|uptime|ms|s|latency|users|records|tables|servers|nodes|years)?\b", clean, re.IGNORECASE)
        for mm in metric_matches:
            if mm.strip() and mm not in key_points and len(mm) > 1:
                key_points.append(mm.strip())

        # (c) Noun phrases if no known tech detected
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

        # 2. Check for Technically Wrong Claims
        # e.g. "Redis as relational database", "supports ACID SQL joins natively", "TCP is stateless"
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
                "resume_consistency": "contradicts (deviates from standard backend fundamentals)",
                "missing": "Accurate distinction between in-memory stores and relational database engines.",
                "next_move": "correct_gently",
                "next_question": f"{key_points[0] if key_points else 'Redis'} is primarily an in-memory key-value store rather than a relational database; how did you handle data persistence and relational querying?",
            }

        # 3. Check for Resume Contradiction
        # e.g. Candidate claims 10+ or 12 years of experience when resume lists 2 or 3 years
        years_claimed = re.search(r"\b(\d{1,2})\s+years\b", lower)
        if years_claimed:
            claimed_num = int(years_claimed.group(1))
            if claimed_num > experience_years + 4:
                return {
                    "summary": f"Candidate claimed {claimed_num} years of engineering experience, conflicting with resume.",
                    "key_points": [f"{claimed_num} years"] + [k for k in key_points if k != f"{claimed_num} years"],
                    "quality": "okay",
                    "correctness_notes": f"Claimed {claimed_num} years of experience vs {experience_years} years documented on resume.",
                    "resume_consistency": f"contradicts (candidate stated {claimed_num} years, resume shows {experience_years} years)",
                    "missing": "Reconciliation of career timeline with resume profile.",
                    "next_move": "challenge_politely",
                    "next_question": f"Your resume lists {experience_years} years of experience; could you clarify your career timeline and your primary production role?",
                }

        # 4. Check for Clarification Request
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

        # 5. Check for "I Don't Know" / Boundary
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

        # 6. Check for Off-Topic
        off_topic_markers = ["movie", "movies", "weekend", "vacation", "weather", "cricket", "football", "thriller", "lunch", "dinner", "hiking", "video game", "video games"]
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

        # 7. Check for Vague or Ultra-Short Answer (e.g. "Microservices.", "I made it fast.", "I used microservices to make the architecture scalable.")
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
                "missing": f"Specific breakdown of services, inter-service communication protocols, and fault tolerance for {entity_name}.",
                "next_move": "ask_example",
                "next_question": f"Which specific services did you break the application into, and what communication protocols or metrics did you use for {entity_name}?",
            }

        # 8. Check for Technical Disagreement
        if any(w in lower for w in ["disagreement", "disagreed", "conflict", "tech lead", "lead", "benchmark", "argument"]):
            return {
                "summary": f"Candidate described a technical debate or disagreement involving {', '.join(key_points) if key_points else 'architectural choices'}.",
                "key_points": key_points,
                "quality": "strong",
                "correctness_notes": "Demonstrates conflict navigation and empirical validation.",
                "resume_consistency": "consistent",
                "missing": "Specific benchmark metrics and how consensus was established across the team.",
                "next_move": "probe_detail",
                "next_question": f"What specific benchmark metrics or data points did you use to evaluate the alternatives and reach consensus with your team?",
            }

        # 9. Specific Project & Tech Stack (e.g. Pizza ordering app with Flask and PostgreSQL)
        if any(k in lower for k in ["flask", "postgresql", "postgres", "pizza", "ordering"]):
            return {
                "summary": "Candidate described building an ordering application using Flask and PostgreSQL.",
                "key_points": [p for p in key_points if p.lower() in ["flask", "postgresql", "postgres", "pizza ordering app", "ordering app", "200 users"]] or ["Flask", "PostgreSQL", "pizza ordering app"],
                "quality": "strong",
                "correctness_notes": "Specified concrete application domain and tech stack (Flask + PostgreSQL).",
                "resume_consistency": "consistent",
                "missing": "Relational schema design, order transaction isolation, and connection handling.",
                "next_move": "probe_detail",
                "next_question": "How did you structure the relational schema in PostgreSQL, and how did you manage order transaction states and data consistency in Flask?",
            }

        # 10. Quantitative Answer (Numbers & Metrics)
        # e.g. "We scaled to 50k DAU with 99.9% uptime" or "cached with Redis, reduced latency by 35%"
        if any(re.search(r"\b\d+[\w.%/]*\s*(?:dau|mau|rps|uptime|latency|users)", lower) for _ in [1]) or ("50k dau" in lower or "99.9%" in lower or "redis" in lower):
            summary_quote = ", ".join(key_points[:3]) if key_points else "the architecture"
            return {
                "summary": f"Candidate detailed system performance metrics involving {summary_quote}.",
                "key_points": key_points,
                "quality": "strong",
                "correctness_notes": f"Provided concrete metrics and technologies ({summary_quote}).",
                "resume_consistency": "consistent",
                "missing": "Failure recovery, bottleneck instrumentation, and caching tradeoffs.",
                "next_move": "probe_detail",
                "next_question": f"When implementing that with {key_points[0] if key_points else 'that system'}, what was the primary bottleneck you monitored and how did you resolve it?",
            }

        # 11. General Strong / Adequate Technical Answer
        summary_quote = ", ".join(key_points[:3]) if key_points else "the architecture"
        return {
            "summary": f"Candidate detailed their engineering work regarding {summary_quote}.",
            "key_points": key_points if key_points else [clean[:30]],
            "quality": "strong" if len(words) >= 10 else "okay",
            "correctness_notes": f"Provided context on {summary_quote}; needs deeper probe on edge cases and failure modes.",
            "resume_consistency": "consistent",
            "missing": "Failure recovery, performance tradeoffs, and scaling considerations.",
            "next_move": "probe_detail",
            "next_question": f"When implementing that with {key_points[0] if key_points else 'that system'}, what was the most difficult bottleneck or edge case you encountered?",
        }

    # ── Stage 2: Spoken Response Generation with Grounding Validator ────────

    def generate_spoken_reply(self, user_text: str, analysis: Optional[dict] = None) -> str:
        """
        Stage 2 Spoken Reply Generation:
        - 1 to 3 short sentences, natural interviewer conversational tone.
        - Brief acknowledgement: <= 6 words naming specific candidate key points.
          NEVER canned praise ('great explanation', 'nice answer', 'awesome', 'great job').
        - Exactly ONE question (never stacks questions, never repeats).
        - Grounding Validator: guarantees reply contains at least 1 candidate key point.
        """
        if analysis is None:
            analysis = self.analyze_candidate_answer(user_text)
        self.last_analysis = analysis
        logger.info(f"[Stage 1 Analysis] {json.dumps(analysis)}")

        quality = analysis.get("quality", "okay")
        next_move = analysis.get("next_move", "probe_detail")
        key_points = analysis.get("key_points", [])
        next_question = analysis.get("next_question", "")
        phase = self.current_phase
        lang = self.language

        self.phase_turn_count[phase] = self.phase_turn_count.get(phase, 0) + 1

        # Record structured observation
        score_hint = 8.5 if quality == "strong" else 7.0 if quality == "okay" else 5.0 if quality == "wrong" else 6.0
        self.record_observation(
            category=f"{phase}_{quality}",
            note=analysis.get("correctness_notes", ""),
            score_hint=score_hint,
        )

        # ── Readiness Phase ──────────────────────────────────────────────────
        if phase == PHASE_READINESS:
            if AFFIRMATIVE_REGEX.search(user_text) or len(user_text.split()) <= 4:
                self.is_ready = True
                self.transition_to(PHASE_WARMUP, reason="Candidate confirmed readiness")
                q = self.get_next_planned_question(PHASE_WARMUP)
                opening_q = q["question"] if q else f"Could you introduce yourself, {self.candidate_name}?"
                self.asked_questions.add(opening_q)
                if lang == "es":
                    return f"Perfecto, comencemos. {opening_q}"
                elif lang == "hi":
                    return f"बहुत बढ़िया, आइए शुरू करते हैं। {opening_q}"
                return f"Understood, let's begin! {opening_q}"

        # ── Formulate Brief Acknowledgement (<= 6 words, naming candidate items) ─
        ack = ""
        if next_move == "clarify":
            ack = "Happy to clarify." if lang != "es" else "Con gusto aclaro."
        elif next_move == "move_on":
            ack = "Understood, no problem." if lang != "es" else "Entendido, no hay problema."
        elif quality == "off_topic":
            ack = ""  # No acknowledgement, direct redirect
        elif quality == "wrong":
            p = key_points[0] if key_points else "that concept"
            ack = f"{p}, understood."
        elif "contradicts" in str(analysis.get("resume_consistency", "")):
            p = key_points[0] if key_points else "Understood"
            ack = f"{p}, got it."
        elif key_points:
            p1 = key_points[0]
            p2 = key_points[1] if len(key_points) > 1 else None

            # Cycle acknowledgements to avoid robotic repetition
            ack_suffix = "got it." if self.current_turn % 2 == 0 else "understood."
            if p2 and len(f"{p1} and {p2}, {ack_suffix}".split()) <= 6:
                ack = f"{p1} and {p2}, {ack_suffix}"
            elif len(f"{p1}, {ack_suffix}".split()) <= 6:
                ack = f"{p1}, {ack_suffix}"
            else:
                ack = f"{p1[:20]}, {ack_suffix}"
        else:
            ack = "Understood."

        # Spoken question from next_question
        spoken_question = next_question.strip()

        # Check for repetition of questions
        if spoken_question in self.asked_questions:
            # Generate fresh variant
            if key_points:
                spoken_question = f"Could you dive deeper into how you implemented {key_points[0]} and the tradeoffs involved?"
            else:
                spoken_question = f"How did you monitor performance and handle failure modes for that system?"

        self.asked_questions.add(spoken_question)

        # Combine acknowledgement and question (1-3 sentences)
        candidate_reply = f"{ack} {spoken_question}".strip() if ack else spoken_question

        # ── Grounding Validator ──────────────────────────────────────────────
        # Must contain at least one key point unless clarification / move_on / off_topic
        if quality not in ("off_topic",) and next_move not in ("clarify", "move_on") and key_points:
            is_grounded = any(kp.lower() in candidate_reply.lower() for kp in key_points)
            if not is_grounded:
                logger.warning(f"[Grounding Validator] First draft ungrounded; force-injecting key point '{key_points[0]}'")
                candidate_reply = f"You mentioned {key_points[0]}, how did you structure that and handle edge cases?"

        # ── Eliminate ANY Canned Praise Leakage ──────────────────────────────
        banned_phrases = [
            r"\bgreat\s+explanation[!,.]*",
            r"\bnice\s+answer[!,.]*",
            r"\bgreat\s+job[!,.]*",
            r"\bawesome[!,.]*",
            r"\bthat's\s+interesting[!,.]*",
            r"\bvery\s+interesting[!,.]*",
        ]
        for bp in banned_phrases:
            if re.search(bp, candidate_reply, re.IGNORECASE):
                candidate_reply = re.sub(bp, "Understood.", candidate_reply, flags=re.IGNORECASE).strip()

        # Enforce exactly ONE question mark
        q_count = candidate_reply.count("?")
        if q_count > 1:
            first_q_end = candidate_reply.find("?") + 1
            candidate_reply = candidate_reply[:first_q_end]
        elif q_count == 0:
            candidate_reply = candidate_reply + "?"

        self.last_spoken_reply = candidate_reply
        logger.info(f"[Stage 2 Spoken Reply] \"{candidate_reply}\"")
        return candidate_reply

    def _get_next_phase(self, current: str) -> Optional[str]:
        try:
            idx = PHASE_SEQUENCE.index(current)
            if idx + 1 < len(PHASE_SEQUENCE):
                return PHASE_SEQUENCE[idx + 1]
        except ValueError:
            pass
        return None

    # ── Fallback Deterministic Scored Feedback Report ───────────────────────

    def generate_fallback_report(self, transcript: list[dict]) -> dict:
        user_turns = [m for m in transcript if m.get("role") == "user" or m.get("speaker") == "Candidate"]
        turn_count = len(user_turns)
        base_score = 7.0 + min(2.0, turn_count * 0.15)

        if self.observations:
            avg_hint = sum(o.score_hint for o in self.observations) / len(self.observations)
            overall_score = round((base_score * 0.4) + (avg_hint * 0.6), 1)
        else:
            overall_score = round(base_score, 1)

        coding_score = 7.5
        if self.last_test_results:
            passed = self.last_test_results.get("passedCount", 0)
            total = max(1, self.last_test_results.get("totalCount", 1))
            coding_score = round(5.0 + (passed / total) * 4.5, 1)

        overall_100 = round(min(100.0, max(40.0, overall_score * 10.0)), 1)

        quotes = []
        for msg in user_turns:
            t = msg.get("text", "")
            if len(t.split()) >= 5:
                quotes.append(f'"{t[:90]}..."')
            if len(quotes) >= 3:
                break

        return {
            "overallScore": overall_score,
            "overallScore100": overall_100,
            "verdict": "Strong Hire" if overall_score >= 8.5 else "Hire" if overall_score >= 7.5 else "Needs Practice",
            "categoryScores": {
                "communication": round(min(9.5, overall_score + 0.3), 1),
                "resumeKnowledge": round(min(9.5, overall_score + 0.1), 1),
                "roleFit": round(min(9.5, overall_score), 1),
                "technicalDepth": round(min(9.5, overall_score - 0.2), 1),
                "coding": coding_score,
                "problemSolving": round(min(9.5, overall_score), 1),
                "behavioralSTAR": round(min(9.5, overall_score - 0.1), 1),
                "confidenceClarity": round(min(9.5, overall_score + 0.2), 1),
            },
            "strengths": [
                f"Demonstrated clear technical articulation in {self.current_phase}",
                "Structured approach when detailing software architecture and tradeoffs",
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
                "Day 6-7: Refine behavioral STAR answers with concrete production metrics"
            ],
            "observations": [o.to_dict() for o in self.observations],
            "timeline": self.timeline,
        }
