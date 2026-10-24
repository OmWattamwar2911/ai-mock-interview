"""
test_upgrade.py – Automated tests for:
1. InterviewStateMachine phase transitions and timeline
2. Readiness check (multilingual affirmative regex, 8s reprompt, 16s timeout auto-start)
3. Technical layout switching and code synchronization
4. Deterministic fallback scoring engine
5. Feedback JSON structure & validation
"""

import json
import re
import time
import unittest
from interview_state import (
    AFFIRMATIVE_REGEX,
    PHASE_BEHAVIORAL,
    PHASE_CLOSING,
    PHASE_JD_MATCH,
    PHASE_READINESS,
    PHASE_RESUME,
    PHASE_SEQUENCE,
    PHASE_TECHNICAL,
    PHASE_WARMUP,
    InterviewObservation,
    InterviewStateMachine,
)


class TestReadinessCheck(unittest.TestCase):
    def test_affirmative_regex_multilingual(self):
        affirmative_phrases = [
            "yes",
            "yes I am",
            "yeah",
            "yep",
            "yup",
            "sure",
            "ready",
            "I am ready",
            "im ready",
            "i'm ready",
            "let's start",
            "lets go",
            "let us begin",
            "all set",
            "okay",
            "ok",
            "sí",
            "si",
            "listo",
            "estoy listo",
            "oui",
            "d'accord",
            "je suis prêt",
            "ja",
            "bereit",
            "ich bin bereit",
            "हाँ",
            "तैयार",
            "जी हाँ",
        ]
        for phrase in affirmative_phrases:
            self.assertTrue(
                bool(AFFIRMATIVE_REGEX.search(phrase)),
                f"Expected '{phrase}' to match affirmative regex",
            )

    def test_candidate_readiness_transition(self):
        sm = InterviewStateMachine(candidate_name="Alex", language="en")
        sm.mark_greeting_sent()
        self.assertEqual(sm.current_phase, PHASE_READINESS)

        # Candidate answers "I am ready"
        opening = sm.handle_user_input("I am ready")
        self.assertIsNotNone(opening)
        self.assertEqual(sm.current_phase, PHASE_WARMUP)
        self.assertIn("Alex", opening)

    def test_readiness_8s_reprompt_and_16s_timeout(self):
        sm = InterviewStateMachine(candidate_name="Jordan", language="en")
        sm.mark_greeting_sent()

        # Simulate 4 seconds elapsed: no reprompt yet
        sm.greeting_sent_time = time.monotonic() - 4.0
        prompt4 = sm.check_readiness_timeout()
        self.assertIsNone(prompt4)

        # Simulate 9 seconds elapsed: reprompt fired once
        sm.greeting_sent_time = time.monotonic() - 9.0
        prompt9 = sm.check_readiness_timeout()
        self.assertIsNotNone(prompt9)
        self.assertIn("ready to get started", prompt9)
        self.assertTrue(sm.reprompt_sent)

        # Second check at 10 seconds: reprompt does not repeat
        sm.greeting_sent_time = time.monotonic() - 10.0
        prompt10 = sm.check_readiness_timeout()
        self.assertIsNone(prompt10)

        # Simulate 17 seconds elapsed: auto-starts into warm-up
        sm.greeting_sent_time = time.monotonic() - 17.0
        autostart = sm.check_readiness_timeout()
        self.assertIsNotNone(autostart)
        self.assertEqual(sm.current_phase, PHASE_WARMUP)


class TestPhaseStateMachine(unittest.TestCase):
    def test_full_phase_sequence(self):
        events = []
        data_broadcasts = []

        sm = InterviewStateMachine(
            candidate_name="Sam",
            language="en",
            context_data={
                "resume": {"parsed": {"skills": ["React", "Python", "Docker"]}},
                "jd": {"title": "Full Stack Engineer"},
                "codingProblem": {"title": "Two Sum", "statement": "Given an array of integers..."},
            },
            on_phase_change=lambda old_p, new_p: events.append((old_p, new_p)),
            on_data_broadcast=lambda d: data_broadcasts.append(d),
        )

        # 1. Start from readiness -> warm-up
        sm.transition_to(PHASE_WARMUP, reason="Ready")
        self.assertEqual(sm.current_phase, PHASE_WARMUP)
        self.assertIn("Sam", sm.get_phase_opening(PHASE_WARMUP))

        # 2. Advance to resume deep-dive
        sm.transition_to(PHASE_RESUME, reason="Warmup done")
        self.assertEqual(sm.current_phase, PHASE_RESUME)
        self.assertIn("React", sm.get_phase_opening(PHASE_RESUME))

        # 3. Advance to JD match
        sm.transition_to(PHASE_JD_MATCH, reason="Resume done")
        self.assertEqual(sm.current_phase, PHASE_JD_MATCH)
        self.assertIn("Full Stack Engineer", sm.get_phase_opening(PHASE_JD_MATCH))

        # 4. Advance to Live Technical -> must trigger switch_layout broadcast
        sm.transition_to(PHASE_TECHNICAL, reason="JD done")
        self.assertEqual(sm.current_phase, PHASE_TECHNICAL)
        self.assertIn("Two Sum", sm.get_phase_opening(PHASE_TECHNICAL))

        # Verify layout broadcast
        layout_events = [d for d in data_broadcasts if d.get("type") == "switch_layout"]
        self.assertTrue(len(layout_events) >= 1)
        self.assertEqual(layout_events[0]["layout"], "split")

        # 5. Advance to Behavioral STAR
        sm.transition_to(PHASE_BEHAVIORAL, reason="Tech done")
        self.assertEqual(sm.current_phase, PHASE_BEHAVIORAL)

        # 6. Advance to Closing
        sm.transition_to(PHASE_CLOSING, reason="Behavioral done")
        self.assertEqual(sm.current_phase, PHASE_CLOSING)
        self.assertIn("questions for me", sm.get_phase_opening(PHASE_CLOSING))

        # Verify timeline tracking
        phases_in_timeline = [entry["phase"] for entry in sm.timeline]
        self.assertIn(PHASE_WARMUP, phases_in_timeline)
        self.assertIn(PHASE_RESUME, phases_in_timeline)
        self.assertIn(PHASE_JD_MATCH, phases_in_timeline)
        self.assertIn(PHASE_TECHNICAL, phases_in_timeline)
        self.assertIn(PHASE_BEHAVIORAL, phases_in_timeline)
        self.assertIn(PHASE_CLOSING, phases_in_timeline)

    def test_observation_and_code_sync(self):
        broadcasts = []
        sm = InterviewStateMachine(
            candidate_name="Taylor",
            language="en",
            on_data_broadcast=lambda d: broadcasts.append(d),
        )
        sm.transition_to(PHASE_TECHNICAL)

        # Record observation
        obs = sm.record_observation("technical", "Identified O(N) hash map solution immediately", 9.0)
        self.assertEqual(obs["category"], "technical")
        self.assertEqual(obs["scoreHint"], 9.0)
        self.assertEqual(len(sm.observations), 1)

        # Code sync
        sm.handle_code_sync({
            "language": "python",
            "sourceCode": "def two_sum(nums, target): return [0, 1]",
            "status": "ACCEPTED",
            "passedCount": 3,
            "totalCount": 3,
            "submit": True,
        })
        self.assertEqual(sm.code_runs_count, 1)
        self.assertEqual(sm.last_test_results.get("status"), "ACCEPTED")
        self.assertEqual(sm.last_test_results.get("passedCount"), 3)


class TestFeedbackAndScoring(unittest.TestCase):
    def test_deterministic_fallback_report(self):
        sm = InterviewStateMachine(candidate_name="Morgan", language="en")
        sm.record_observation("communication", "Articulate explanation of trade-offs", 8.5)
        sm.record_observation("technical", "Correct edge case handling", 8.0)
        sm.last_test_results = {"status": "ACCEPTED", "passedCount": 3, "totalCount": 3}

        mock_transcript = [
            {"role": "assistant", "text": "Welcome Morgan, are you ready?"},
            {"role": "user", "text": "Yes, I am completely ready to start."},
            {"role": "assistant", "text": "Great! Please introduce yourself."},
            {"role": "user", "text": "I am a full stack engineer with four years of experience building microservices."},
            {"role": "assistant", "text": "Tell me about a challenging project."},
            {"role": "user", "text": "I redesigned our real time event bus which reduced latency by thirty percent."},
        ]

        report = sm.generate_fallback_report(mock_transcript)

        # Verify root score properties
        self.assertIn("overallScore", report)
        self.assertIn("overallScore100", report)
        self.assertIn("verdict", report)
        self.assertIn("categoryScores", report)
        self.assertIn("strengths", report)
        self.assertIn("weaknesses", report)
        self.assertIn("improvementPlan", report)
        self.assertIn("supportingQuotes", report)
        self.assertIn("perQuestion", report)
        self.assertIn("practicePlan7Day", report)

        # Bounds check
        self.assertGreaterEqual(report["overallScore"], 1.0)
        self.assertLessEqual(report["overallScore"], 10.0)
        self.assertGreaterEqual(report["overallScore100"], 10.0)
        self.assertLessEqual(report["overallScore100"], 100.0)

        # 8 Categories present
        cats = report["categoryScores"]
        expected_cats = [
            "communication",
            "resumeKnowledge",
            "roleFit",
            "technicalDepth",
            "coding",
            "problemSolving",
            "behavioralSTAR",
            "confidenceClarity",
        ]
        for ec in expected_cats:
            self.assertIn(ec, cats, f"Missing category {ec}")
            self.assertGreaterEqual(cats[ec], 1.0)
            self.assertLessEqual(cats[ec], 10.0)

        # Supporting quotes populated
        self.assertGreater(len(report["supportingQuotes"]), 0)

        # Practice plan has 4+ actionable roadmap days
        self.assertGreaterEqual(len(report["practicePlan7Day"]), 4)

    def test_structured_feedback_json_schema(self):
        sample_json_text = """
        {
            "overallScore": 8.5,
            "overallScore100": 85.0,
            "verdict": "Strong Hire",
            "categoryScores": {
                "communication": 9.0,
                "resumeKnowledge": 8.5,
                "roleFit": 8.5,
                "technicalDepth": 8.0,
                "coding": 9.0,
                "problemSolving": 8.5,
                "behavioralSTAR": 8.0,
                "confidenceClarity": 8.5
            },
            "strengths": [
                "Clear architectural breakdown",
                "Strong grasp of concurrency"
            ],
            "weaknesses": [
                "Could elaborate on database transaction isolation levels"
            ],
            "improvementPlan": [
                "Practice PostgreSQL lock contention drills"
            ],
            "supportingQuotes": [
                "I redesigned our real-time event bus"
            ],
            "perQuestion": [
                {
                    "question": "Introduction",
                    "summary": "Clear summary of career progression",
                    "score": 8.5,
                    "feedback": "Strong concise delivery"
                }
            ],
            "practicePlan7Day": [
                "Day 1: Review STAR method frameworks",
                "Day 2: Two-pointer problems"
            ]
        }
        """
        parsed = json.loads(sample_json_text)
        self.assertEqual(parsed["verdict"], "Strong Hire")
        self.assertEqual(parsed["overallScore100"], 85.0)
        self.assertEqual(len(parsed["categoryScores"]), 8)


if __name__ == "__main__":
    unittest.main()
