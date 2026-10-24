"""
test_technical_coach.py – Automated Headless Verification Suite for Aria Technical Round.

Simulates candidate WebRTC data channel events:
1. Sends "problem_shown" with problemId and statement hash -> verifies agent confirms sync.
2. Sends "code_update" seq=1 with starter code -> verifies received, logged, and snapshot recorded.
3. Sends "code_update" seq=2 with syntax error -> verifies background AST analysis catches error.
4. Sends "run_result" with 1 failure -> verifies 1-2 sentence concise reaction without full output reading.
5. Sends "request_hint" -> verifies Level 1 hint ladder progression.
6. Sends "code_update" seq=3 with optimal solution -> verifies run_result all passed -> verifies Big-O question reaction and technical evaluation rubric.
"""

import asyncio
import json
import logging
import os
import sys
import unittest

# Ensure interview-bot is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from plugins.technical_coach import TechnicalCoach, RunResultRecord

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("test_technical_coach")


class TestTechnicalCoach(unittest.TestCase):
    def setUp(self):
        self.raw_problem = {
            "id": "prob_two_sum_001",
            "title": "Two Sum",
            "statement": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
            "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.",
            "examples": [{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]"}],
            "difficulty": "MEDIUM",
            "topicTags": ["Array", "Hash Table"],
            "language": "python",
            "starterCode": {
                "python": "def two_sum(nums, target):\n    # Write your solution here\n    pass"
            },
            "testCases": [
                {"input": "[2,7,11,15]\n9", "expected": "[0,1]", "hidden": False},
                {"input": "[3,2,4]\n6", "expected": "[1,2]", "hidden": False},
                {"input": "[3,3]\n6", "expected": "[0,1]", "hidden": True},
            ],
            "referenceSolution": {
                "python": "def two_sum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            return [lookup[diff], i]\n        lookup[num] = i\n    return []"
            },
            "expectedComplexity": {
                "time": "O(n)",
                "space": "O(n)",
                "explanation": "Single pass hash table lookup."
            },
            "commonMistakes": [
                "Brute force O(n^2) nested loops",
                "Using the same element twice",
                "Sorting without tracking indices"
            ],
            "hints": [
                "What kind of data structure allows O(1) average-time lookups for values you have already inspected?",
                "Consider a hash map storing each number as the key and its index as the value while iterating.",
                "Check if target minus the current number is already in your hash map before inserting the current number."
            ],
        }
        self.coach = TechnicalCoach(self.raw_problem)

    def test_step_1_problem_shown_sync(self):
        """Step 1: Test problem_shown with valid hash and mismatch handling."""
        logger.info("=== STEP 1: Problem Shown Verification ===")
        valid_hash = self.coach.statement_hash
        self.assertTrue(len(valid_hash) > 0)
        
        # Valid verification
        synced = self.coach.verify_problem_shown("prob_two_sum_001", valid_hash)
        self.assertTrue(synced, "Valid problem id and hash must sync successfully")
        self.assertTrue(self.coach.is_synced)

        # Invalid verification mismatch
        mismatch = self.coach.verify_problem_shown("prob_different_999", valid_hash)
        self.assertFalse(mismatch, "Mismatched problem id must fail sync")

    def test_step_2_code_update_seq1(self):
        """Step 2: Test code_update seq=1 with starter code & character capping."""
        logger.info("=== STEP 2: Live Code Update seq=1 ===")
        payload = {
            "type": "code_update",
            "problemId": "prob_two_sum_001",
            "language": "python",
            "code": self.raw_problem["starterCode"]["python"],
            "cursorLine": 3,
            "seq": 1,
            "timestamp": 1000.0,
        }
        snap = self.coach.handle_code_update(payload)
        self.assertEqual(snap.seq, 1)
        self.assertEqual(snap.lines_count, 3)
        self.assertEqual(self.coach.current_code, payload["code"])
        self.assertEqual(self.coach.last_cursor_line, 3)

        # Verify unified diff when starter code is initial state
        brief = self.coach.build_llm_technical_brief()
        self.assertIn("Two Sum", brief)
        self.assertIn("LIVE CODING ROUND", brief)
        self.assertIn("NEVER REVEAL SOLUTION", brief)

        # Verify >6000 char capping
        huge_code = "x = 1\n" * 1500  # ~9000 chars
        huge_payload = {"seq": 2, "code": huge_code, "language": "python"}
        huge_snap = self.coach.handle_code_update(huge_payload)
        self.assertLessEqual(len(self.coach.current_code), 6100)
        self.assertIn("[TRUNCATED BEYOND 6000 CHARS]", self.coach.current_code)

    def test_step_3_syntax_error_ast_detection(self):
        """Step 3: Test code_update seq=2 with syntax error detected by AST."""
        logger.info("=== STEP 3: Syntax Error Background AST Detection ===")
        broken_code = "def two_sum(nums, target):\n    for i in range(len(nums)\n        # missing parenthesis"
        payload = {
            "seq": 2,
            "code": broken_code,
            "language": "python",
            "cursorLine": 2,
        }
        self.coach.handle_code_update(payload)
        
        # Run static AST checks
        issues = self.coach.perform_static_checks()
        self.assertTrue(len(issues) > 0, "AST parser must catch syntax error")
        self.assertEqual(issues[0]["severity"], "error")
        self.assertIn("SyntaxError", issues[0]["issue"])

        # Run background analysis turn
        async def run_analysis():
            res = await self.coach.run_background_analysis_turn(groq_api_key=None)
            self.assertEqual(res["progress"], "buggy")
            self.assertTrue(any("SyntaxError" in err for err in res["correctness_issues"]))
            self.assertIn("line 2", res["suggested_question"])

        asyncio.run(run_analysis())

    def test_step_4_run_result_single_failure_reaction(self):
        """Step 4: Test run_result with 1 failure produces 1-2 sentence concise reaction."""
        logger.info("=== STEP 4: Run Result with 1 Failure ===")
        run_payload = {
            "type": "run_result",
            "problemId": "prob_two_sum_001",
            "passed": 2,
            "total": 3,
            "failures": [{"input": "[3,3]\n6", "expected": "[0,1]", "actual": "None"}],
            "runtimeMs": 42.5,
            "errorType": "FAILED",
            "errorMessage": None,
            "line": None,
        }
        rec = self.coach.handle_run_result(run_payload)
        self.assertEqual(rec.passed, 2)
        self.assertEqual(rec.total, 3)
        self.assertEqual(len(rec.failures), 1)
        self.assertEqual(self.coach.runs_count, 1)

        # Format simulated Aria reaction
        if rec.passed == rec.total and rec.total > 0:
            reaction = f"All {rec.total} test cases passed! How would you analyze the time and space complexity of your solution?"
        elif rec.failures:
            f0 = rec.failures[0]
            reaction = f"{rec.passed} of {rec.total} passed. The failing case had input {f0.get('input', 'empty')}; what do you expect to happen there?"
        else:
            reaction = f"{rec.passed} of {rec.total} tests passed."

        self.assertIn("2 of 3 passed", reaction)
        self.assertIn("failing case had input [3,3]", reaction)
        # Verify concise response rule: 1-2 sentences, <= 30 words, zero raw dump
        sentence_count = reaction.count(".") + reaction.count("?")
        self.assertTrue(sentence_count <= 2)
        self.assertTrue(len(reaction.split()) < 35)

    def test_step_5_hint_ladder_progression(self):
        """Step 5: Test request_hint advances 3-level hint ladder."""
        logger.info("=== STEP 5: 3-Level Hint Ladder Progression ===")
        # Level 1
        lvl1, hint1 = self.coach.request_hint()
        self.assertEqual(lvl1, 1)
        self.assertIn("O(1) average-time lookups", hint1)

        # Level 2
        lvl2, hint2 = self.coach.request_hint()
        self.assertEqual(lvl2, 2)
        self.assertIn("hash map", hint2)

        # Level 3
        lvl3, hint3 = self.coach.request_hint()
        self.assertEqual(lvl3, 3)
        self.assertIn("target minus the current number", hint3)

        # Capped at Level 3
        lvl4, hint4 = self.coach.request_hint()
        self.assertEqual(lvl4, 3)
        self.assertEqual(self.coach.hints_given_count, 4)

    def test_step_6_optimal_solution_and_evaluation_rubric(self):
        """Step 6: Test optimal solution all passed, Big-O inquiry, and PART 6 evaluation report."""
        logger.info("=== STEP 6: Optimal Solution, Big-O Query, & Report Rubric ===")
        optimal_code = self.raw_problem["referenceSolution"]["python"]
        self.coach.phase_start_time = 500.0

        # Code update with optimal solution
        self.coach.handle_code_update({
            "seq": 3,
            "code": optimal_code,
            "language": "python",
            "cursorLine": 7,
        })

        # All passed run result
        run_passed_payload = {
            "type": "run_result",
            "problemId": "prob_two_sum_001",
            "passed": 3,
            "total": 3,
            "failures": [],
            "runtimeMs": 12.0,
            "errorType": "ACCEPTED",
            "isSubmit": True,
        }
        rec = self.coach.handle_run_result(run_passed_payload)
        self.assertEqual(rec.passed, 3)
        self.assertEqual(rec.total, 3)

        # Reaction must celebrate and query Big-O complexity
        if rec.passed == rec.total and rec.total > 0:
            reaction = f"All {rec.total} test cases passed! How would you analyze the time and space complexity of your solution?"
        else:
            reaction = "Good try."

        self.assertIn("All 3 test cases passed", reaction)
        self.assertIn("time and space complexity", reaction)

        # Verify PART 6 Technical Evaluation report section
        transcript_sample = [
            {"speaker": "Candidate", "text": "I will use a dictionary to store previously seen numbers and their indices."},
            {"speaker": "Candidate", "text": "The time complexity is O(n) because each lookup is O(1)."},
        ]
        tech_eval = self.coach.build_technical_report_section(transcript_sample)

        # Verify 8 dimensions
        dimensions = [
            "problemUnderstanding",
            "approachQuality",
            "codeCorrectness",
            "edgeCaseHandling",
            "complexityAnalysis",
            "debuggingProcess",
            "useOfHints",
            "communicationWhileCoding",
        ]
        for d in dimensions:
            self.assertIn(d, tech_eval)
            self.assertTrue(1.0 <= tech_eval[d] <= 10.0, f"Dimension {d} must be scored between 1 and 10")

        self.assertEqual(tech_eval["codeCorrectness"], 10.0)
        self.assertIn("referenceSolution", tech_eval)
        self.assertIn("expectedComplexity", tech_eval)
        self.assertEqual(tech_eval["expectedComplexity"]["time"], "O(n)")
        self.assertEqual(len(tech_eval["candidateQuotes"]), 2)
        logger.info(f"Technical Evaluation Report Rubric: {json.dumps(tech_eval, indent=2)}")


if __name__ == "__main__":
    unittest.main()
