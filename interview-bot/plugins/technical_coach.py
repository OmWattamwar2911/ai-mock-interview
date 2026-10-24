"""
plugins/technical_coach.py – Live Technical Coding Engine & Aria Guidance Coach.

Handles:
1. TechnicalProblem object storage & hash synchronization ("problem_shown" event).
2. Live code diff tracking, debouncing, snapshot history, and "CODE_UPDATE seq=N lines=M" logging.
3. Test execution results tracking ("run_result" topic).
4. Asynchronous Background Code Analysis (static syntax/ast checks + LLM judgment).
5. 3-Level Hint Ladder & interviewer intervention protocol.
6. Unified diff generation to conserve LLM token budget (<500 tokens).
7. Evaluation report generation with 8-dimension rubric and private reference solution.
"""

from __future__ import annotations

import ast
import difflib
import hashlib
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("plugins.technical_coach")


@dataclass
class CodeSnapshot:
    seq: int
    code: str
    language: str
    cursor_line: int
    timestamp: float
    lines_count: int


@dataclass
class RunResultRecord:
    problem_id: str
    passed: int
    total: int
    failures: list[dict]
    runtime_ms: float
    error_type: Optional[str]
    error_message: Optional[str]
    line: Optional[int]
    timestamp: float


class TechnicalCoach:
    def __init__(self, raw_problem: Optional[dict] = None):
        self.problem: dict = self._normalize_problem(raw_problem)
        self.problem_id: str = self.problem.get("id", "prob_two_sum_001")
        self.statement_hash: str = self._hash_statement(self.problem.get("statement", ""))
        self.is_synced: bool = False

        # Live code tracking
        self.language: str = self.problem.get("language", "python")
        starter = self.problem.get("starterCode", {}).get(self.language, "")
        self.current_code: str = starter
        self.previous_code: str = starter
        self.last_edit_time: float = time.monotonic()
        self.snapshots: list[CodeSnapshot] = []
        self.last_seq: int = 0
        self.last_cursor_line: int = 1
        
        # Interview metrics
        self.hints_given_count: int = 0
        self.hint_level_used: int = 0  # 0, 1, 2, 3
        self.hints_history: list[dict] = []
        self.runs_count: int = 0
        self.run_results_history: list[RunResultRecord] = []
        self.phase_start_time: Optional[float] = None
        self.time_to_first_working_solution: Optional[float] = None
        self.time_to_final_submission: Optional[float] = None
        self.candidate_stated_complexity: Optional[str] = None
        
        # Background analysis state
        self.last_analysis: dict = {
            "approach": "not started",
            "progress": "not_started",
            "correctness_issues": [],
            "missing_edge_cases": [],
            "complexity_estimate": {"time": "unknown", "space": "unknown"},
            "style_notes": "",
            "stuck": False,
            "next_hint_level": 1,
            "suggested_question": "",
        }
        self.last_analysis_time: float = 0
        self.last_analyzed_code: str = ""

        # Tracking silent intervals (2 min check-in)
        self.last_speech_time: float = time.monotonic()
        self.silent_prompt_given: bool = False

    def _normalize_problem(self, raw: Optional[dict]) -> dict:
        if not raw or not isinstance(raw, dict):
            raw = {}
        return {
            "id": raw.get("id", "prob_two_sum_001"),
            "title": raw.get("title", "Two Sum"),
            "statement": raw.get("statement", "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."),
            "constraints": raw.get("constraints", "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists."),
            "examples": raw.get("examples", [{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]"}]),
            "difficulty": raw.get("difficulty", "MEDIUM"),
            "topicTags": raw.get("topicTags", ["Array", "Hash Table"]),
            "language": raw.get("language", "python"),
            "starterCode": raw.get("starterCode", {}),
            "testCases": raw.get("testCases", []),
            "referenceSolution": raw.get("referenceSolution", {
                "python": "def two_sum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            return [lookup[diff], i]\n        lookup[num] = i\n    return []"
            }),
            "expectedComplexity": raw.get("expectedComplexity", {
                "time": "O(n)",
                "space": "O(n)",
                "explanation": "Single pass hash table lookup."
            }),
            "commonMistakes": raw.get("commonMistakes", [
                "Brute force O(n^2) nested loops",
                "Using the same element twice",
                "Sorting without tracking indices"
            ]),
            "hints": raw.get("hints", [
                "What kind of data structure allows O(1) average-time lookups for values you have already inspected?",
                "Consider a hash map storing each number as the key and its index as the value while iterating.",
                "Check if target minus the current number is already in your hash map before inserting the current number."
            ]),
        }

    @staticmethod
    def _hash_statement(stmt: str) -> str:
        norm = re.sub(r"\s+", " ", stmt.strip()).encode("utf-8")
        return hashlib.sha256(norm).hexdigest()[:12]

    def verify_problem_shown(self, client_problem_id: str, client_statement_hash: str) -> bool:
        """
        Confirms the exact problem shown on client editor matches Aria's session state.
        """
        id_match = (self.problem_id == client_problem_id)
        hash_match = (self.statement_hash == client_statement_hash)
        if not id_match or not hash_match:
            logger.error(
                f"[PROBLEM_SYNC MISMATCH] Aria problem_id={self.problem_id} (hash={self.statement_hash}) "
                f"vs Client problem_id={client_problem_id} (hash={client_statement_hash})"
            )
            self.is_synced = False
            return False

        self.is_synced = True
        logger.info(f"[PROBLEM_SYNC OK] Problem verified '{self.problem.get('title')}' id={self.problem_id}")
        return True

    def handle_code_update(self, payload: dict) -> CodeSnapshot:
        """
        Receives {problemId, language, code, cursorLine, timestamp, seq}.
        Caps code size at 6,000 characters and logs CODE_UPDATE seq=N lines=M.
        """
        seq = int(payload.get("seq", self.last_seq + 1))
        self.last_seq = seq
        raw_code = payload.get("code") or payload.get("sourceCode") or ""
        
        # Cap size at 6,000 chars as requested
        if len(raw_code) > 6000:
            logger.warning(f"[Code Update] Truncated code exceeding 6000 chars (len={len(raw_code)})")
            raw_code = raw_code[:6000] + "\n# [TRUNCATED BEYOND 6000 CHARS]"

        self.previous_code = self.current_code
        self.current_code = raw_code
        self.language = payload.get("language", self.language)
        self.last_cursor_line = int(payload.get("cursorLine", 1))
        self.last_edit_time = time.monotonic()
        self.silent_prompt_given = False  # Reset silence check when typing
        
        lines_count = len(self.current_code.splitlines())
        snap = CodeSnapshot(
            seq=seq,
            code=self.current_code,
            language=self.language,
            cursor_line=self.last_cursor_line,
            timestamp=time.time(),
            lines_count=lines_count,
        )
        self.snapshots.append(snap)
        if len(self.snapshots) > 20:
            self.snapshots.pop(0)

        logger.info(f"CODE_UPDATE seq={seq} lines={lines_count}")
        return snap

    def handle_run_result(self, payload: dict) -> RunResultRecord:
        """
        Receives {problemId, passed, total, failures: [...], runtimeMs, errorType, errorMessage, line}.
        """
        self.runs_count += 1
        passed = int(payload.get("passedCount", payload.get("passed", 0)))
        total = int(payload.get("totalCount", payload.get("total", 0)))
        
        rec = RunResultRecord(
            problem_id=payload.get("problemId", self.problem_id),
            passed=passed,
            total=total,
            failures=payload.get("failures", []),
            runtime_ms=float(payload.get("runtimeMs", payload.get("timeMs", 0.0))),
            error_type=payload.get("errorType", payload.get("status")),
            error_message=payload.get("errorMessage", payload.get("stderr") or payload.get("compileError")),
            line=payload.get("line"),
            timestamp=time.time(),
        )
        self.run_results_history.append(rec)
        
        # Track time to first working solution
        if passed == total and total > 0 and self.time_to_first_working_solution is None:
            if self.phase_start_time:
                self.time_to_first_working_solution = time.monotonic() - self.phase_start_time
            logger.info(f"[Technical Milestone] First working solution achieved! ({passed}/{total} passed)")

        if payload.get("isSubmit") or payload.get("submit"):
            if self.phase_start_time:
                self.time_to_final_submission = time.monotonic() - self.phase_start_time

        logger.info(
            f"RUN_RESULT runs={self.runs_count} passed={passed}/{total} "
            f"error={rec.error_type} runtime={rec.runtime_ms}ms"
        )
        return rec

    def get_unified_diff(self) -> str:
        """
        Produces a concise unified diff against previous analyzed snapshot.
        """
        if not self.last_analyzed_code:
            return ""
        old_lines = self.last_analyzed_code.splitlines(keepends=True)
        new_lines = self.current_code.splitlines(keepends=True)
        diff = list(difflib.unified_diff(old_lines, new_lines, fromfile="last_analyzed", tofile="current", n=2))
        return "".join(diff[:25])  # Cap at 25 diff lines

    def perform_static_checks(self) -> list[dict]:
        """
        Runs fast, cheap static checks for Python code.
        """
        issues = []
        if self.language != "python" or not self.current_code.strip():
            return issues

        try:
            tree = ast.parse(self.current_code)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
                        issues.append({"line": node.lineno, "issue": f"Function '{node.name}' has empty pass body.", "severity": "info"})
                    returns = [n for n in ast.walk(node) if isinstance(n, ast.Return)]
                    if not returns and len(node.body) > 2:
                        issues.append({"line": node.lineno, "issue": f"Function '{node.name}' may be missing a return statement.", "severity": "warning"})
        except SyntaxError as e:
            issues.append({"line": e.lineno or 1, "issue": f"SyntaxError: {e.msg}", "severity": "error"})
        except Exception:
            pass

        return issues

    def record_candidate_speech(self) -> None:
        """Resets 2-minute silence timer when candidate speaks."""
        self.last_speech_time = time.monotonic()
        self.silent_prompt_given = False

    def should_prompt_silence(self) -> bool:
        """
        Checks if candidate has been silent for 2 minutes and code hasn't changed.
        """
        now = time.monotonic()
        speech_silent = (now - self.last_speech_time) >= 120
        code_silent = (now - self.last_edit_time) >= 120

        if speech_silent and code_silent and not self.silent_prompt_given:
            self.silent_prompt_given = True
            return True
        return False

    async def run_background_analysis_turn(self, groq_api_key: Optional[str] = None) -> dict:
        """
        PART 4 Background Code Analysis:
        Fast static checks first, followed by lightweight LLM structured evaluation.
        """
        now = time.monotonic()
        self.last_analysis_time = now

        # 1. Fast AST static checks
        static_issues = self.perform_static_checks()
        syntax_errors = [i for i in static_issues if i.get("severity") == "error"]

        if syntax_errors:
            self.last_analysis["progress"] = "buggy"
            self.last_analysis["correctness_issues"] = [e["issue"] for e in syntax_errors]
            self.last_analysis["suggested_question"] = f"I notice a syntax issue on line {syntax_errors[0].get('line')}. Take a look there."
            logger.info(f"[Background Analysis] Static check detected: {syntax_errors[0]['issue']}")
            self.last_analyzed_code = self.current_code
            return self.last_analysis

        # 2. Lightweight LLM call if Groq key is available and code is non-trivial
        key = (groq_api_key or os.getenv("GROQ_API_KEY", "")).strip()
        if not key or key.startswith("<") or len(self.current_code.strip()) < 15:
            self.last_analyzed_code = self.current_code
            return self.last_analysis

        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=key, timeout=4.0)
            
            prompt = (
                "You are an expert technical interviewer evaluating a candidate's code in real time.\n"
                f"Problem: {self.problem.get('title')}: {self.problem.get('statement')}\n"
                "Return JSON with keys:\n"
                '{"approach": string, "progress": "not_started"|"brute_force"|"optimal"|"buggy", '
                '"correctness_issues": [string], "missing_edge_cases": [string], '
                '"complexity_estimate": {"time": string, "space": string}, "style_notes": string, '
                '"stuck": bool, "next_hint_level": 1|2|3, "suggested_question": string}'
            )

            resp = await client.chat.completions.create(
                model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Candidate Code ({self.language}):\n{self.current_code[:1800]}"},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=220,
            )
            raw = resp.choices[0].message.content
            parsed = json.loads(raw)
            self.last_analysis.update(parsed)
            self.last_analyzed_code = self.current_code
            logger.info(f"[Background Analysis LLM] progress={self.last_analysis.get('progress')} stuck={self.last_analysis.get('stuck')}")
        except Exception as e:
            logger.debug(f"Background LLM analysis skipped: {e}")

        return self.last_analysis

    def request_hint(self) -> Tuple[int, str]:
        """
        Advances the 3-level hint ladder and returns (level, hint_text).
        Level 1: Question about failing case or approach
        Level 2: Technique or data structure naming
        Level 3: Specific line / bug location without writing fix
        """
        self.hints_given_count += 1
        self.hint_level_used = min(3, self.hint_level_used + 1)
        hints_list = self.problem.get("hints", [])
        
        idx = self.hint_level_used - 1
        if 0 <= idx < len(hints_list):
            hint_text = hints_list[idx]
        else:
            hint_text = "Think about how saving intermediate computations avoids repeated work."

        self.hints_history.append({
            "level": self.hint_level_used,
            "text": hint_text,
            "timestamp": time.time(),
        })
        logger.info(f"[Hint Ladder] Hint Level {self.hint_level_used} given: '{hint_text}'")
        return self.hint_level_used, hint_text

    def build_llm_technical_brief(self) -> str:
        """
        Builds a compact technical round context under ~500 tokens.
        Includes problem statement, constraints, example, live diff, and private guide marked never reveal.
        """
        p = self.problem
        ex_str = ""
        if p.get("examples") and len(p["examples"]) > 0:
            ex = p["examples"][0]
            ex_str = f"Input: {ex.get('input')} -> Output: {ex.get('output')}"
            
        common_mistakes_str = "; ".join(p.get("commonMistakes", [])[:3])
        hints_str = " | ".join(f"L{i+1}: {h}" for i, h in enumerate(p.get("hints", [])[:3]))
        
        code_diff = self.get_unified_diff()
        code_to_show = self.current_code or self.problem.get("starterCode", {}).get(self.language, "")
        code_context = f"\n### Candidate Code on Screen ({self.language}):\n```{self.language}\n{code_to_show[:2000]}\n```\n"
        if code_diff and code_diff != code_to_show:
            code_context += f"Recent diff:\n```diff\n{code_diff}\n```\n"
            
        run_status = "No runs yet"
        if self.run_results_history:
            last = self.run_results_history[-1]
            run_status = f"{last.passed}/{last.total} passed. Status: {last.error_type or 'OK'}"

        analysis_note = f"Progress: {self.last_analysis.get('progress', 'active')} | Approach: {self.last_analysis.get('approach', 'in-progress')}"
        if self.last_analysis.get("correctness_issues"):
            analysis_note += f" | Identified issues: {', '.join(self.last_analysis['correctness_issues'][:2])}"

        return f"""## LIVE CODING ROUND (Problem & Real-time Vision)
Problem: {p.get('title')} ({p.get('difficulty')})
Statement: {p.get('statement')}
Constraints: {p.get('constraints')}
Sample: {ex_str}
Last Run: {run_status}
Hints Used: {self.hints_given_count}/3 (Current Level: {self.hint_level_used})
Analysis: {analysis_note}{code_context}
[CRITICAL VISUAL CAPABILITY - NEVER REVEAL SOLUTION]:
- You HAVE DIRECT REAL-TIME VISION of the candidate's editor on your screen. You CAN see the code above!
- NEVER say "I cannot see your code", "I can't see your screen", or "As an AI I don't have access to your code".
- If the candidate asks if you can see their code or how it looks, confirm immediately: "Yes, I see your code," and reference a specific function name, line, or variable (e.g. "{p.get('title')}" or "{self.language}").
- Target Complexity: Time {p.get('expectedComplexity', {}).get('time', 'O(n)')}, Space {p.get('expectedComplexity', {}).get('space', 'O(n)')}
- Common Mistakes: {common_mistakes_str}
- Hint Ladder: {hints_str}
- Rule: Refer naturally to specific variables or logic from candidate's code. Spoken reply: 1-3 sentences, at most 1 question.
"""

    def build_technical_report_section(self, transcript: Optional[list[dict]] = None) -> dict:
        """
        Builds the PART 6 Technical Interview evaluation section.
        Scoring 8 dimensions out of 10, timeline, candidate quotes,
        and post-interview revealed reference solution and expected complexity.
        """
        passed_final = 0
        total_final = len(self.problem.get("testCases", []))
        if self.run_results_history:
            last_run = self.run_results_history[-1]
            passed_final = last_run.passed
            total_final = max(total_final, last_run.total)

        # 1. Code correctness (1-10)
        if total_final > 0:
            correctness = round(min(10.0, max(2.0, (passed_final / total_final) * 10.0)), 1)
        else:
            correctness = 6.0 if self.current_code.strip() else 2.0

        # 2. Use of hints penalty: neutral for level 1, penalized for level 2 & 3
        if self.hint_level_used == 0:
            hint_score = 10.0
        elif self.hint_level_used == 1:
            hint_score = 9.0
        elif self.hint_level_used == 2:
            hint_score = 6.5
        else:
            hint_score = 4.5

        # 3. Debugging process score
        if self.runs_count == 0:
            debug_score = 5.0
        elif passed_final == total_final and self.runs_count <= 4:
            debug_score = 9.5
        elif passed_final == total_final:
            debug_score = 8.5
        else:
            debug_score = 6.5

        # Candidate coding quotes from transcript
        coding_quotes = []
        if transcript:
            for item in transcript:
                spk = item.get("speaker", item.get("role", ""))
                txt = item.get("text", "")
                if (spk in ("candidate", "user", "Candidate")) and len(txt.split()) >= 4:
                    coding_quotes.append(txt)
                if len(coding_quotes) >= 4:
                    break

        first_code_t = None
        first_run_t = None
        working_sol_t = self.time_to_first_working_solution

        if self.snapshots and self.phase_start_time:
            first_code_t = max(0.0, round(self.snapshots[0].timestamp - self.phase_start_time, 1))
        if self.run_results_history and self.phase_start_time:
            first_run_t = max(0.0, round(self.run_results_history[0].timestamp - self.phase_start_time, 1))

        return {
            "problemUnderstanding": 8.5,
            "approachQuality": 8.0 if correctness >= 7.0 else 6.0,
            "codeCorrectness": correctness,
            "edgeCaseHandling": 8.0 if correctness >= 8.0 else 6.0,
            "complexityAnalysis": 8.0,
            "debuggingProcess": debug_score,
            "useOfHints": hint_score,
            "communicationWhileCoding": 8.0 if coding_quotes else 6.5,
            "timeline": {
                "timeToFirstCodeSec": first_code_t,
                "timeToFirstRunSec": first_run_t,
                "timeToWorkingSolutionSec": round(working_sol_t, 1) if working_sol_t is not None else None,
                "runsCount": self.runs_count,
                "hintsUsed": self.hints_given_count,
            },
            "candidateQuotes": coding_quotes,
            "referenceSolution": self.problem.get("referenceSolution", {}),
            "expectedComplexity": self.problem.get("expectedComplexity", {}),
        }
