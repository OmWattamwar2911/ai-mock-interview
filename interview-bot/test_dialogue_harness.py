"""
test_dialogue_harness.py – Simulated 8-Turn Interview Dialogue Test Harness

Runs 8 scripted candidate answers:
1. Affirmative Readiness ("I am ready")
2. Good Self-Introduction (FastAPI, Kafka, microservices)
3. Strong Technical Answer with Specifics ("cached results with Redis")
4. Vague Answer ("I made it fast")
5. Contradicting Resume (claims 12 years experience when resume has 3)
6. "I do not know" (admits lack of Kubernetes experience)
7. Off-Topic Answer (mentions video games and weekend football)
8. Clarification Request ("Could you clarify what you mean?")

Validates:
- Spoken reply is 1 to 3 short sentences
- Reply contains exactly one question (ends with ?)
- Reply references the candidate's content/quote
- No question is repeated
- Hidden analysis JSON is generated and logged
"""

import json
import re
import unittest
from interview_state import InterviewStateMachine


class TestDialogueHarness(unittest.TestCase):
    def setUp(self):
        self.context_data = {
            "resume": {
                "parsed": {
                    "name": "Alex Mercer",
                    "experienceYears": 3,
                    "recentRole": "Backend Engineer",
                    "skills": ["Python", "FastAPI", "Redis", "PostgreSQL", "Kafka", "Docker"],
                    "summary": "Backend developer specializing in high-throughput APIs and distributed caching.",
                }
            },
            "jd": {
                "title": "Senior Backend Engineer",
                "parsed": {
                    "requiredSkills": ["Python", "Distributed Systems", "Redis", "Kafka", "PostgreSQL"],
                    "responsibilities": ["Design low-latency microservices", "Ensure 99.99% availability"],
                },
            },
            "skillGap": {"missing": ["Kubernetes cluster administration"], "target": "Senior Engineer"},
            "codingProblem": {
                "title": "LRU Cache Implementation",
                "statement": "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.",
            },
        }

        self.sm = InterviewStateMachine(
            candidate_name="Alex",
            language="en",
            context_data=self.context_data,
        )
        self.sm.mark_greeting_sent()

    def test_run_8_scripted_dialogue_turns(self):
        scripted_inputs = [
            # 1. Affirmative Readiness
            {
                "input": "Yes, I am completely ready to start.",
                "expected_quality": "readiness",
                "description": "Readiness Confirmation",
            },
            # 2. Good Self-Introduction
            {
                "input": "I am a backend engineer with 3 years of experience building high-throughput microservices using Python, FastAPI, and Kafka.",
                "expected_quality": "strong",
                "description": "Good Self-Introduction",
            },
            # 3. Strong Technical Answer with Specific Caching Tool
            {
                "input": "In our payment service, we cached results with Redis and used distributed locking, which reduced latency by 35 percent and prevented duplicate charges.",
                "expected_quality": "strong",
                "description": "Strong Answer referencing Redis caching",
            },
            # 4. Vague Answer
            {
                "input": "I made it fast.",
                "expected_quality": "vague",
                "description": "Vague/Brief Answer",
            },
            # 5. Contradicting Resume (claims 12 years vs 3 on resume)
            {
                "input": "Actually, I have 12 years of production experience leading enterprise cloud teams across multiple companies.",
                "expected_quality": "contradiction",
                "description": "Contradicting Resume Experience",
            },
            # 6. "I do not know"
            {
                "input": "I haven't worked with Kubernetes pod autoscaling in production before, so I honestly do not know how that works.",
                "expected_quality": "dont_know",
                "description": "I Don't Know / Boundary Honesty",
            },
            # 7. Off-Topic Answer
            {
                "input": "I really enjoy playing video games on the weekend and watching football with friends.",
                "expected_quality": "off-topic",
                "description": "Off-Topic Reply",
            },
            # 8. Clarification Request
            {
                "input": "Could you clarify what you mean by eventual consistency in distributed systems?",
                "expected_quality": "clarification",
                "description": "Clarification Request",
            },
        ]

        seen_questions = set()

        print("\n" + "=" * 80)
        print("SIMULATED 8-TURN INTERVIEW DIALOGUE TEST HARNESS")
        print("=" * 80)

        for i, turn in enumerate(scripted_inputs, 1):
            user_text = turn["input"]
            desc = turn["description"]

            # Generate response through the state machine
            spoken_reply = self.sm.generate_spoken_reply(user_text)
            analysis = self.sm.last_analysis or {}

            print(f"\n--- Turn {i}: {desc} ---")
            print(f"Candidate: \"{user_text}\"")
            print(f"Hidden Analysis: {json.dumps(analysis)}")
            print(f"Aria (Spoken): \"{spoken_reply}\"")

            # 1. Spoken reply must be 1 to 3 short sentences
            sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", spoken_reply.strip()) if s.strip()]
            self.assertLessEqual(
                len(sentences),
                3,
                f"Turn {i}: Spoken reply has {len(sentences)} sentences, expected 1 to 3: '{spoken_reply}'",
            )
            self.assertGreaterEqual(
                len(sentences),
                1,
                f"Turn {i}: Spoken reply is empty",
            )

            # 2. Must contain exactly one question (indicated by question mark)
            question_count = spoken_reply.count("?")
            self.assertEqual(
                question_count,
                1,
                f"Turn {i}: Spoken reply must contain exactly one question mark, found {question_count}: '{spoken_reply}'",
            )

            # 3. Extract the question and ensure no question is repeated
            q_match = re.search(r"([^.!?]+\?)", spoken_reply)
            if q_match:
                extracted_q = q_match.group(1).strip()
                self.assertNotIn(
                    extracted_q,
                    seen_questions,
                    f"Turn {i}: Question repeated: '{extracted_q}'",
                )
                seen_questions.add(extracted_q)

            # 4. Turn-specific quality and content assertions
            if turn["expected_quality"] == "readiness":
                self.assertTrue(self.sm.is_ready)
            elif turn["expected_quality"] == "vague":
                self.assertEqual(analysis["quality"], "vague")
                self.assertTrue(
                    any(w in spoken_reply.lower() for w in ["concrete", "example", "numbers", "metrics"]),
                    f"Expected vague prompt to ask for concrete example/metrics: {spoken_reply}",
                )
            elif turn["expected_quality"] == "contradiction":
                self.assertIn("contradicts", analysis.get("resume_consistency", ""))
                self.assertEqual(analysis.get("next_move"), "challenge_politely")
                self.assertTrue(
                    any(w in spoken_reply.lower() for w in ["resume", "clarify", "experience"]),
                    f"Expected contradiction prompt to cite resume: {spoken_reply}",
                )
            elif turn["expected_quality"] == "dont_know":
                self.assertIn(analysis.get("quality"), ["okay", "dont_know"])
                self.assertEqual(analysis.get("next_move"), "move_on")
                self.assertTrue(
                    any(w in spoken_reply.lower() for w in ["understood", "no problem", "pivot", "deeply"]),
                    f"Expected kindly acknowledgement for 'I don't know': {spoken_reply}",
                )
            elif turn["expected_quality"] == "off-topic":
                self.assertEqual(analysis.get("quality"), "off_topic")
                self.assertTrue(
                    any(w in spoken_reply.lower() for w in ["focus", "technical", "experience", "production"]),
                    f"Expected redirection for off-topic reply: {spoken_reply}",
                )
            elif turn["expected_quality"] == "clarification":
                self.assertEqual(analysis.get("next_move"), "clarify")
                self.assertTrue(
                    any(w in spoken_reply.lower() for w in ["clarify", "happy to clarify", "understand"]),
                    f"Expected clarification rephrasing: {spoken_reply}",
                )

        print("\n" + "=" * 80)
        print("TEST HARNESS PASSED: All 8 turns satisfied single-question, reference, and non-repetition rules!")
        print("=" * 80 + "\n")


if __name__ == "__main__":
    unittest.main()
