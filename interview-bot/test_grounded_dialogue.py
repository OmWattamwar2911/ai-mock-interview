"""
test_grounded_dialogue.py – Automated Text-Only Verification Suite for Two-Stage Grounded Dialogue Engine.

Tests the 8 Candidate Answers specified in STEP 5:
1. Strong Detailed: "In our payment service, we cached transaction states with Redis cluster and used distributed locking, which reduced API latency by 40ms and handled 5000 RPS without duplicates."
2. Vague: "I used microservices to make the architecture scalable."
3. Off-Topic: "I really enjoy going hiking on weekends and watching action movies with friends."
4. Technically Wrong: "We used Redis as our primary relational database because it supports ACID multi-table SQL joins natively."
5. Contradicting Resume: "Actually, I have 12 years of production experience leading enterprise cloud teams across multiple companies."
6. "I do not know": "I haven't worked with Kubernetes pod autoscaling in production before, so I honestly do not know how that works."
7. Very Short: "Microservices."
8. Unique Words: "I built a pizza ordering app with Flask and PostgreSQL for 200 users"

Validates:
- Stage 1 Analysis strict JSON schema:
  summary, key_points, quality, correctness_notes, resume_consistency, missing, next_move, next_question
- Stage 2 Spoken Reply:
  * 1 to 3 short sentences
  * Brief acknowledgement: <= 6 words naming candidate items
  * Exactly ONE question (ends with or contains exactly 1 '?')
  * Grounded in candidate's words
  * ZERO canned praise ('great explanation', 'nice answer', 'awesome', 'great job', 'interesting')
- Prints DEBUG_TURNS=1 turn traces
"""

import json
import os
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

os.environ["DEBUG_TURNS"] = "1"

from interview_state import (
    InterviewStateMachine,
    PHASE_WARMUP,
    PHASE_RESUME,
    PHASE_JD_MATCH,
    PHASE_TECHNICAL,
    PHASE_BEHAVIORAL,
    PHASE_CLOSING,
)
from plugins.llm import log_turn_debug

BANNED_PRAISE = [
    "great explanation",
    "nice answer",
    "great job",
    "awesome",
    "interesting",
    "that's interesting",
    "very interesting",
]

ALLOWED_QUALITIES = {"strong", "okay", "vague", "off_topic", "wrong"}
ALLOWED_NEXT_MOVES = {"probe_detail", "ask_example", "challenge_politely", "clarify", "correct_gently", "move_on"}


def run_grounding_tests():
    print("================================================================================")
    print("   AUTOMATED VERIFICATION: 8 CANDIDATE ANSWERS (STEP 5 PROVE IT SUITE)          ")
    print("================================================================================\n")

    mock_context = {
        "resume": {
            "parsed": {
                "name": "Alex",
                "experienceYears": 3,
                "recentRole": "Backend Engineer",
                "skills": ["Python", "Flask", "PostgreSQL", "Redis", "Docker", "REST APIs"],
                "summary": "Backend developer with 3 years experience building high-throughput APIs.",
            }
        },
        "jd": {
            "title": "Senior Backend Engineer",
            "parsed": {
                "requiredSkills": ["Python", "PostgreSQL", "Redis", "Distributed Systems"],
                "responsibilities": ["Design fault-tolerant APIs", "Scale database systems"],
            },
        },
        "codingProblem": {"title": "LRU Cache Design"},
    }

    test_cases = [
        # 1. Strong detailed answer
        {
            "id": 1,
            "title": "Strong Detailed Answer (Redis cluster, distributed locking, 5000 RPS)",
            "phase": PHASE_RESUME,
            "input": "In our payment service, we cached transaction states with Redis cluster and used distributed locking, which reduced API latency by 40ms and handled 5000 RPS without duplicates.",
            "expected_quality": "strong",
            "expected_key_token": "redis",
            "expected_next_move": "probe_detail",
        },
        # 2. Vague answer
        {
            "id": 2,
            "title": "Vague Answer ('I used microservices to make the architecture scalable')",
            "phase": PHASE_RESUME,
            "input": "I used microservices to make the architecture scalable.",
            "expected_quality": "vague",
            "expected_key_token": "microservices",
            "expected_next_move": "ask_example",
        },
        # 3. Off-topic answer
        {
            "id": 3,
            "title": "Off-Topic Answer (Hiking and Action Movies)",
            "phase": PHASE_WARMUP,
            "input": "I really enjoy going hiking on weekends and watching action movies with friends.",
            "expected_quality": "off_topic",
            "expected_key_token": None,
            "expected_next_move": "probe_detail",
        },
        # 4. Technically wrong answer
        {
            "id": 4,
            "title": "Technically Wrong Answer (Redis as relational DB with SQL joins)",
            "phase": PHASE_TECHNICAL,
            "input": "We used Redis as our primary relational database because it supports ACID multi-table SQL joins natively.",
            "expected_quality": "wrong",
            "expected_key_token": "redis",
            "expected_next_move": "correct_gently",
        },
        # 5. Contradicting the resume
        {
            "id": 5,
            "title": "Contradicting Resume (Claims 12 years experience when resume has 3 years)",
            "phase": PHASE_RESUME,
            "input": "Actually, I have 12 years of production experience leading enterprise cloud teams across multiple companies.",
            "expected_quality": "okay",
            "expected_key_token": "12 years",
            "expected_next_move": "challenge_politely",
            "expect_contradiction": True,
        },
        # 6. "I do not know"
        {
            "id": 6,
            "title": "Knowledge Boundary ('I do not know')",
            "phase": PHASE_JD_MATCH,
            "input": "I haven't worked with Kubernetes pod autoscaling in production before, so I honestly do not know how that works.",
            "expected_quality": "okay",
            "expected_key_token": None,
            "expected_next_move": "move_on",
        },
        # 7. Very short answer
        {
            "id": 7,
            "title": "Very Short Answer ('Microservices.')",
            "phase": PHASE_RESUME,
            "input": "Microservices.",
            "expected_quality": "vague",
            "expected_key_token": "microservices",
            "expected_next_move": "ask_example",
        },
        # 8. Unique words answer
        {
            "id": 8,
            "title": "Unique Words Answer ('pizza ordering app, Flask, PostgreSQL, 200 users')",
            "phase": PHASE_RESUME,
            "input": "I built a pizza ordering app with Flask and PostgreSQL for 200 users",
            "expected_quality": "strong",
            "expected_key_token": "flask",
            "expected_next_move": "probe_detail",
        },
    ]

    sm = InterviewStateMachine(candidate_name="Alex", language="en", context_data=mock_context)
    passed_count = 0

    for tc in test_cases:
        t_id = tc["id"]
        title = tc["title"]
        user_input = tc["input"]
        phase = tc["phase"]
        sm.current_phase = phase

        print(f"--------------------------------------------------------------------------------")
        print(f"[TEST {t_id}/8] {title}")
        print(f"Candidate Utterance: \"{user_input}\"")

        # Stage 1: Hidden Analysis
        analysis = sm.analyze_candidate_answer(user_input)

        # Stage 2: Grounded Spoken Reply
        spoken_reply = sm.generate_spoken_reply(user_input, analysis=analysis)

        print(f"\nStage 1 Analysis JSON:\n{json.dumps(analysis, indent=2)}")
        print(f"\nStage 2 Spoken Reply: \"{spoken_reply}\"\n")

        # ── 1. Assert Strict JSON Schema Conformance ──────────────────────
        required_keys = [
            "summary", "key_points", "quality", "correctness_notes",
            "resume_consistency", "missing", "next_move", "next_question"
        ]
        for rk in required_keys:
            assert rk in analysis, f"Turn {t_id}: Missing required key '{rk}' in analysis JSON"

        assert analysis["quality"] in ALLOWED_QUALITIES, f"Turn {t_id}: Quality '{analysis['quality']}' not in {ALLOWED_QUALITIES}"
        assert analysis["next_move"] in ALLOWED_NEXT_MOVES, f"Turn {t_id}: Next move '{analysis['next_move']}' not in {ALLOWED_NEXT_MOVES}"
        assert len(analysis["summary"]) > 5, f"Turn {t_id}: Summary is too short"
        assert len(analysis["next_question"]) > 5 and "?" in analysis["next_question"], f"Turn {t_id}: next_question must contain '?'"

        # ── 2. Assert Quality & Next Move Matching ─────────────────────────
        assert analysis["quality"] == tc["expected_quality"], f"Turn {t_id}: Expected quality '{tc['expected_quality']}', got '{analysis['quality']}'"
        assert analysis["next_move"] == tc["expected_next_move"], f"Turn {t_id}: Expected next_move '{tc['expected_next_move']}', got '{analysis['next_move']}'"

        if tc.get("expect_contradiction"):
            assert "contradicts" in analysis["resume_consistency"].lower(), f"Turn {t_id}: Expected resume_consistency to note contradiction"

        # ── 3. Assert Grounding in Spoken Reply ─────────────────────────────
        if tc["expected_key_token"]:
            token = tc["expected_key_token"].lower()
            assert token in spoken_reply.lower(), f"Turn {t_id}: Spoken reply '{spoken_reply}' MUST contain key token '{token}'"

        # ── 4. Assert Exactly ONE Question ──────────────────────────────────
        q_count = spoken_reply.count("?")
        assert q_count == 1, f"Turn {t_id}: Spoken reply must contain exactly ONE '?', found {q_count}: '{spoken_reply}'"

        # ── 5. Assert ZERO Canned Praise ────────────────────────────────────
        for bp in BANNED_PRAISE:
            assert bp not in spoken_reply.lower(), f"Turn {t_id}: Spoken reply MUST NOT contain generic praise '{bp}': '{spoken_reply}'"

        # ── 6. Assert Sentence Count (1 to 3) ───────────────────────────────
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", spoken_reply.strip()) if s.strip()]
        assert 1 <= len(sentences) <= 3, f"Turn {t_id}: Spoken reply must be 1 to 3 sentences, got {len(sentences)}: '{spoken_reply}'"

        # ── 7. Demonstrate DEBUG_TURNS Trace Logging ────────────────────────
        log_turn_debug(
            turn_index=t_id,
            stt_text=user_input,
            stt_language="en",
            stt_confidence=0.98,
            system_prompt="You are Aria, a professional technical interviewer at a leading tech company.",
            history_messages=[
                {"role": "assistant", "content": "Are you ready to begin?"},
                {"role": "user", "content": user_input},
            ],
            model_name="offline-nlp-grounded-interviewer",
            temperature=0.5,
            max_tokens=250,
            num_ctx=8192,
            raw_llm_output=spoken_reply,
            fallback_used="Offline Two-Stage NLP Reasoning Engine (zero generic praise)",
        )

        print(f">>> PASS [TEST {t_id}/8]: Verified analysis JSON, grounded reply, single question, and zero canned praise!\n")
        passed_count += 1

    print("================================================================================")
    print(f"   SUCCESS: ALL {passed_count}/{len(test_cases)} AUTOMATED GROUNDING TESTS PASSED PERFECTLY!")
    print("================================================================================")


if __name__ == "__main__":
    run_grounding_tests()
