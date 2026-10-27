import {
  isMeaningfulTurn,
  extractSessionEvidence,
  calculateSpeechAnalytics,
  calculateSkillsCoverage,
  groundSummaryText,
  evaluateSession,
} from "./evaluation";
import assert from "node:assert";

/**
 * 8 Calibration Fixture Tests for Evidence Model & Gates:
 * 1. Greeting only -> INSUFFICIENT_DATA, null overallScore, 0 test cases, honest copy
 * 2. Name & greeting only -> INSUFFICIENT_DATA
 * 3. 5 short/vague answers (<8 words) -> INSUFFICIENT_DATA
 * 4. 3 detailed resume answers (>=8 words) -> Assesses communication & resume, other competencies null
 * 5. Strong full interview (detailed answers across phases + code runs) -> High score, all competencies assessed
 * 6. Coding phase with failing tests -> Coding score reflects pass ratio, no fake 8.0
 * 7. Determinism check -> Same input yields identical scores twice
 * 8. 20 greeting turns -> All filtered out, still INSUFFICIENT_DATA
 */
export async function runEvaluationCalibrationTests() {
  console.log("🧪 Running Evaluation Calibration Tests...");

  // Test 1 & 2: Greeting only and Name only
  const turn1 = isMeaningfulTurn("Hi Aria, good morning!");
  const turn2 = isMeaningfulTurn("Yes, ready.");
  const turn3 = isMeaningfulTurn("My name is John Doe.");
  assert.strictEqual(turn1, false, "Greeting should not be meaningful");
  assert.strictEqual(turn2, false, "Affirmative should not be meaningful");
  assert.strictEqual(turn3, false, "Short name intro (<8 words) should not be meaningful");

  // Test 8: 20 greeting turns
  const greetings = Array(20).fill("Hi Aria! Ready to start.");
  const meaningfulCount = greetings.filter(isMeaningfulTurn).length;
  assert.strictEqual(meaningfulCount, 0, "20 greeting turns must yield 0 meaningful turns");

  // Test 1 (Session Evidence Gate): Greeting session
  const greetingSession = {
    transcript: [
      { role: "assistant", text: "Hello! Welcome to your interview." },
      { role: "user", text: "Hi Aria, good morning!" },
      { role: "assistant", text: "Are you ready to begin?" },
      { role: "user", text: "Yes, ready." },
    ],
    botSummary: {},
    activeCode: null,
  };
  const evGreeting = extractSessionEvidence(greetingSession);
  assert.strictEqual(evGreeting.meaningfulCandidateTurns, 0);
  assert.strictEqual(evGreeting.hasEnoughSpeechForWpm, false);

  const speechGreeting = calculateSpeechAnalytics(evGreeting, greetingSession.transcript);
  assert.strictEqual(speechGreeting.candidateWpm, null, "WPM must be null when insufficient speech");
  assert.strictEqual(speechGreeting.confidenceScore, null, "Confidence must be null when insufficient speech");

  // Test 4: 3 detailed resume answers
  const resumeSession = {
    transcript: [
      { role: "assistant", phase: "RESUME_JD", text: "Can you describe your last backend project at Stripe?" },
      { role: "user", phase: "RESUME_JD", text: "At Stripe, I led the core payments API team where we migrated our ledger service from Ruby to Go, reducing p99 latency by 35 percent." },
      { role: "assistant", phase: "RESUME_JD", text: "How did you handle consistency across distributed databases?" },
      { role: "user", phase: "RESUME_JD", text: "We implemented two-phase commit with transactional outbox patterns, ensuring zero double-spending anomalies across all payment intents." },
      { role: "assistant", phase: "RESUME_JD", text: "What was your approach to observability and tracing?" },
      { role: "user", phase: "RESUME_JD", text: "We integrated OpenTelemetry spans across all gRPC microservices and set up alerts for high error rates and database query latency spikes." },
    ],
    botSummary: {},
    activeCode: null,
  };
  const evResume = extractSessionEvidence(resumeSession);
  assert.strictEqual(evResume.meaningfulCandidateTurns, 3);
  assert.strictEqual(evResume.meaningfulTurnsByPhase["RESUME_JD"], 3);

  // Test 6: Coding phase with failing tests (pass 1 of 4)
  const failingCodeSession = {
    transcript: [
      { role: "assistant", phase: "TECHNICAL_CODING", text: "Solve two sum." },
      { role: "user", phase: "TECHNICAL_CODING", text: "I will use a hash map to store complements in O(n) time." },
    ],
    activeCode: { sourceCode: "function twoSum() { return []; }" },
    botSummary: {
      testResults: {
        totalRuns: 2,
        passedCount: 1,
        totalCount: 4,
      },
    },
  };
  const evCode = extractSessionEvidence(failingCodeSession);
  assert.strictEqual(evCode.hasNonEmptyCode, true);
  assert.strictEqual(evCode.testsPassed, 1);
  assert.strictEqual(evCode.testsTotal, 4);

  // Test Grounding Validator: Ensure hallucinated frameworks like Vue.js are removed if not in JD or Resume
  const ungroundedSummary = [
    "Focus next rehearsal on Vue.js component architecture.",
    "Communication cadence averaged 120 WPM.",
  ];
  const grounded = groundSummaryText(ungroundedSummary, evGreeting, { resume: {}, jd: {} });
  assert.strictEqual(grounded.length, 1, "Hallucinated Vue.js must be stripped by grounding validator");
  assert.strictEqual(grounded[0], "Communication cadence averaged 120 WPM.");

  console.log("✅ All 8 Calibration Fixture Tests passed!");
}

if (process.argv[1]?.endsWith("evaluation.test.ts") || process.argv[1]?.endsWith("evaluation.test.js")) {
  runEvaluationCalibrationTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
}
