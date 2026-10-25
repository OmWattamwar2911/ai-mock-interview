"""
test_structured_interview.py – Automated Unit Test Suite for Aria's Structured Personal Interview Flow.

Verifies:
1. Greeting flow & silence timer (8s gentle reprompt, 16s auto-advance to intro).
2. Multilingual name extraction & low-confidence handling (English, Hindi, Spanish, etc.).
3. Name-in-every-reply enforcement & position variation.
4. Walkthrough explanation & affirmative readiness check.
5. 9-Phase state machine transitions & progress tracking.
6. Partial interview evaluation (1/4, 2/4, 3/4, 4/4 parts, skipped phases as 'Not attempted').
7. Insufficient data (< 2 turns) honest evaluation report.
"""

import re
import time
import unittest

from interview_state import (
    InterviewStateMachine,
    PHASE_GREETING,
    PHASE_SMALL_TALK,
    PHASE_INTRODUCTION,
    PHASE_WALKTHROUGH,
    PHASE_RESUME_JD,
    PHASE_TECHNICAL_CODING,
    PHASE_BEHAVIOURAL,
    PHASE_CLOSING,
    PHASE_EVALUATION,
    extract_candidate_name,
    enforce_name_in_reply,
)


class TestCandidateNameExtraction(unittest.TestCase):
    def test_english_intro_variations(self):
        cases = [
            ("Hi, I am Om Wattamwar, a full stack developer.", "Om", "Om Wattamwar"),
            ("Hello, my name is Kavya.", "Kavya", "Kavya"),
            ("You can call me Alex.", "Alex", "Alex"),
            ("This is Rahul speaking.", "Rahul", "Rahul"),
            ("I'm Priya.", "Priya", "Priya"),
            ("Om", "Om", "Om"),
        ]
        for utterance, exp_first, exp_full in cases:
            res = extract_candidate_name(utterance, fallback_name="there")
            self.assertEqual(res["first_name"].lower(), exp_first.lower(), f"Failed on: {utterance}")
            self.assertIn(exp_first.lower(), res["full_name"].lower())
            self.assertGreaterEqual(res["confidence"], 0.75)

    def test_multilingual_name_extraction(self):
        # Hindi
        res_hi = extract_candidate_name("नमस्ते, मेरा नाम अमित है।")
        self.assertEqual(res_hi["first_name"], "अमित")
        self.assertGreaterEqual(res_hi["confidence"], 0.85)

        # Spanish
        res_es = extract_candidate_name("Hola, me llamo Carlos Gómez.")
        self.assertEqual(res_es["first_name"], "Carlos")

        # French
        res_fr = extract_candidate_name("Bonjour, je m'appelle Pierre.")
        self.assertEqual(res_fr["first_name"], "Pierre")

    def test_fallback_when_name_omitted(self):
        # Candidate omits name and discusses experience directly
        res = extract_candidate_name("I have worked as a backend developer for 4 years.", fallback_name="Om")
        self.assertEqual(res["first_name"], "Om")
        self.assertTrue(res["needs_correction"])


class TestNameInEveryReplyEnforcement(unittest.TestCase):
    def test_enforce_name_opening_middle_closing(self):
        name = "Om"

        def count_name_words(text: str, n: str) -> int:
            return len(re.findall(rf"\b{re.escape(n)}\b", text, re.IGNORECASE))

        # Mode 0 (turn 0): Opening position
        r0 = enforce_name_in_reply("How did you approach caching in PostgreSQL?", name, turn_index=0)
        self.assertTrue(r0.startswith("Om,"), f"Expected opening position, got: {r0}")
        self.assertEqual(count_name_words(r0, name), 1)

        # Mode 2 (turn 2): Closing position before question mark
        r2 = enforce_name_in_reply("What was the throughput bottleneck you monitored?", name, turn_index=2)
        self.assertTrue(r2.endswith("Om?"), f"Expected closing position, got: {r2}")
        self.assertEqual(count_name_words(r2, name), 1)

        # Mode 1 (turn 1): Middle position
        r1 = enforce_name_in_reply("That makes complete sense. Could you elaborate on transaction isolation?", name, turn_index=1)
        self.assertIn("Om", r1)
        self.assertEqual(count_name_words(r1, name), 1)

    def test_deduplication_if_name_repeated(self):
        name = "Om"
        repeated = "Om, thank you for clarifying, Om. Could you walk me through the schema design?"
        clean = enforce_name_in_reply(repeated, name, turn_index=0)
        words = len(re.findall(rf"\b{re.escape(name)}\b", clean, re.IGNORECASE))
        self.assertEqual(words, 1, f"Expected 1 occurrence, got: {clean}")

    def test_already_present_exact_single(self):
        name = "Om"
        exact = "Nice work, Om, on handling that query optimization."
        result = enforce_name_in_reply(exact, name, turn_index=1)
        words = len(re.findall(rf"\b{re.escape(name)}\b", result, re.IGNORECASE))
        self.assertEqual(words, 1)


class TestGreetingSilenceAndFlow(unittest.TestCase):
    def test_silence_timeouts(self):
        sm = InterviewStateMachine(candidate_name="Om")
        sm.mark_greeting_sent()

        # At start: no timeout
        self.assertIsNone(sm.check_greeting_silence())

        # Simulate 8s elapsed
        sm.greeting_sent_time = time.monotonic() - 9.0
        reprompt = sm.check_greeting_silence()
        self.assertIsNotNone(reprompt)
        self.assertIn("checking in", reprompt.lower())

        # Second check before 16s: does not loop reprompt
        self.assertIsNone(sm.check_greeting_silence())

        # Simulate 16s elapsed -> auto advances to intro
        sm.greeting_sent_time = time.monotonic() - 17.0
        advance = sm.check_greeting_silence()
        self.assertIsNotNone(advance)
        self.assertEqual(sm.current_phase, PHASE_INTRODUCTION)
        self.assertIn("introduce yourself", advance.lower())

    def test_candidate_walkthrough_confirmation(self):
        sm = InterviewStateMachine(candidate_name="Om")
        sm.candidate_first_name = "Om"
        sm.name_captured = True

        speech = sm.get_walkthrough_speech()
        self.assertIn("Om", speech)
        self.assertIn("Ready to start with your resume", speech)


class TestPartialEvaluationAndScaling(unittest.TestCase):
    def test_insufficient_data_report_under_two_turns(self):
        sm = InterviewStateMachine(candidate_name="Om")
        transcript = [
            {"role": "assistant", "text": "Hi, welcome to Rehearse! How are you doing today?"},
            {"role": "user", "text": "Hello, I am ready."},
        ]
        # Only 1 candidate turn
        report = sm.generate_fallback_report(transcript)
        self.assertTrue(report["insufficientData"])
        self.assertIsNone(report["overallScore"])
        self.assertEqual(report["verdict"], "Not Evaluated")

    def test_partial_interview_scaling_resume_only(self):
        sm = InterviewStateMachine(candidate_name="Om")
        sm.attempted_phases = {PHASE_GREETING, PHASE_INTRODUCTION, PHASE_WALKTHROUGH, PHASE_RESUME_JD}

        transcript = [
            {"role": "assistant", "text": "Hi, welcome!"},
            {"role": "user", "text": "Hi, I am Om."},
            {"role": "assistant", "text": "Could you walk me through your Flask and PostgreSQL system?"},
            {"role": "user", "text": "I built a high-throughput pizza ordering app with Flask and PostgreSQL with 50k DAU."},
            {"role": "assistant", "text": "How did you manage connection pooling?"},
            {"role": "user", "text": "We configured PgBouncer and optimized slow query indexes."},
        ]

        report = sm.generate_fallback_report(transcript)
        self.assertFalse(report["insufficientData"])
        self.assertTrue(report["isPartial"])
        self.assertEqual(report["completedParts"], 2)
        self.assertEqual(report["totalParts"], 4)

        # Attempted parts scored
        self.assertIsNotNone(report["categoryScores"]["communication"])
        self.assertIsNotNone(report["categoryScores"]["resumeKnowledge"])

        # Unattempted parts marked None (not zero!)
        self.assertIsNone(report["categoryScores"]["coding"])
        self.assertIsNone(report["categoryScores"]["behavioralSTAR"])

        # Overall score is valid float between 5 and 10
        self.assertGreaterEqual(report["overallScore"], 5.0)
        self.assertLessEqual(report["overallScore"], 10.0)

    def test_full_interview_all_parts_attempted(self):
        sm = InterviewStateMachine(candidate_name="Om")
        sm.attempted_phases = {
            PHASE_GREETING,
            PHASE_INTRODUCTION,
            PHASE_WALKTHROUGH,
            PHASE_RESUME_JD,
            PHASE_TECHNICAL_CODING,
            PHASE_BEHAVIOURAL,
            PHASE_CLOSING,
        }
        sm.last_test_results = {"passedCount": 5, "totalCount": 5}

        transcript = [
            {"role": "assistant", "text": "Hi, welcome!"},
            {"role": "user", "text": "I am Om Wattamwar."},
            {"role": "assistant", "text": "Tell me about your Flask microservices."},
            {"role": "user", "text": "I built microservices with Flask, Redis, and PostgreSQL handling 50k DAU."},
            {"role": "assistant", "text": "Let's code two sum."},
            {"role": "user", "text": "I implemented an O(n) hash map approach with single pass lookup."},
            {"role": "assistant", "text": "Tell me about a technical disagreement."},
            {"role": "user", "text": "I disagreed with our lead on Kafka partitioning, so I ran a benchmark and we agreed on 12 partitions."},
        ]

        report = sm.generate_fallback_report(transcript)
        self.assertFalse(report["isPartial"])
        self.assertEqual(report["completedParts"], 4)
        self.assertIsNotNone(report["categoryScores"]["coding"])
        self.assertIsNotNone(report["categoryScores"]["behavioralSTAR"])
        self.assertGreaterEqual(report["overallScore"], 7.5)


if __name__ == "__main__":
    unittest.main()
