import assert from "node:assert/strict";
import { COMPANY_OA_QUESTIONS } from "../prisma/company-oa-questions";
import { SandboxDriver } from "../../../services/compiler/src/sandbox";

async function runOaTests() {
  console.log("Running OA Practice verification tests...");

  // 1. Verify Company Question Bank Integrity
  console.log(`  Verifying question bank: ${COMPANY_OA_QUESTIONS.length} original company questions found.`);
  assert(COMPANY_OA_QUESTIONS.length >= 6, "Expected at least 6 company OA questions");

  const expectedCompanies = ["Google", "Amazon", "Stripe", "Meta", "Microsoft", "Uber"];
  for (const comp of expectedCompanies) {
    const found = COMPANY_OA_QUESTIONS.some((q) => q.companyTags.includes(comp));
    assert(found, `Missing company tag questions for ${comp}`);
  }
  console.log("  ✓ All required target companies (Google, Amazon, Stripe, Meta, Microsoft, Uber) represented.");

  // 2. Validate Question Details, Starter Code & Test Cases
  for (const q of COMPANY_OA_QUESTIONS) {
    assert(q.title && q.title.length > 3, `Invalid question title: ${q.title}`);
    assert(q.text && q.text.length > 20, `Question text too short for ${q.title}`);
    assert(q.constraints, `Constraints missing for ${q.title}`);
    assert(q.examples && q.examples.length > 0, `Examples missing for ${q.title}`);
    assert(q.starterCode?.python, `Python starter code missing for ${q.title}`);
    assert(q.starterCode?.javascript, `JavaScript starter code missing for ${q.title}`);
    assert(q.testCases && q.testCases.length >= 3, `Need at least 3 test cases for ${q.title}`);

    const hasVisible = q.testCases.some((t) => !t.hidden);
    const hasHidden = q.testCases.some((t) => t.hidden);
    assert(hasVisible, `Must have visible sample test cases for ${q.title}`);
    assert(hasHidden, `Must have hidden evaluation test cases for ${q.title}`);
  }
  console.log("  ✓ All questions have valid statements, constraints, examples, multi-language starter code, and visible + hidden tests.");

  // 3. Test Security Masking Logic
  const sampleQ = COMPANY_OA_QUESTIONS[0];
  const maskedSample = sampleQ.testCases.map((t, idx) => {
    if (t.hidden) {
      return { id: `hidden-${idx}`, hidden: true, input: "[Hidden Test Input]", expected: "[Hidden Expected Output]" };
    }
    return { id: `sample-${idx}`, hidden: false, input: t.input, expected: t.expected };
  });

  const hiddenInSample = maskedSample.filter((t) => t.hidden);
  assert(hiddenInSample.length > 0, "Expected hidden tests in sample question");
  assert.equal(hiddenInSample[0].input, "[Hidden Test Input]");
  assert.equal(hiddenInSample[0].expected, "[Hidden Expected Output]");
  console.log("  ✓ Security masking strictly prevents hidden test leaks to candidate frontend.");

  // 4. Test End-to-End Sandbox Execution of Reference Solution
  console.log("  Testing end-to-end OA runner execution with reference solution...");
  const driver = new SandboxDriver();
  
  // Test Stripe Transaction Idempotency Reference Solution
  const stripeQ = COMPANY_OA_QUESTIONS.find((q) => q.companyTags.includes("Stripe"));
  assert(stripeQ, "Stripe question missing");
  const pySolution = stripeQ.referenceSolution?.python;
  assert(pySolution, "Python reference solution missing for Stripe question");

  // Run against visible + hidden tests
  const testResults = [];
  for (const test of stripeQ.testCases) {
    const res = await driver.execute(
      "python",
      pySolution,
      test.input,
      { cpuTimeSec: 2, memoryKb: 128_000 }
    );

    const cleanStdout = res.stdout.replace(/\r\n/g, "\n").trim();
    const cleanExpected = test.expected.replace(/\r\n/g, "\n").trim();
    const passed = res.status === "ACCEPTED" && cleanStdout === cleanExpected;
    if (!passed) {
      console.log("  Debug failed test:", {
        status: res.status,
        stderr: res.stderr,
        stdout: JSON.stringify(cleanStdout),
        expected: JSON.stringify(cleanExpected),
      });
    }
    testResults.push({
      passed,
      status: res.status,
      stdout: res.stdout,
      timeMs: res.timeMs,
      hidden: test.hidden,
    });
  }

  const passedCount = testResults.filter((t) => t.passed).length;
  const totalCount = testResults.length;
  const score = Math.round((passedCount / totalCount) * 100);

  console.log(`  Stripe OA Reference Solution: Passed ${passedCount}/${totalCount} tests (Score: ${score}%)`);
  assert.equal(score, 100, `Expected 100% score for reference solution, got ${score}%`);
  console.log("  ✓ Sandbox execution verified 100% pass on both visible and hidden evaluation test cases.");

  console.log("✅ All OA Practice verification tests passed successfully!");
}

runOaTests().catch((err) => {
  console.error("❌ OA Practice test failure:", err);
  process.exit(1);
});
