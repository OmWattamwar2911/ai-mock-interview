import assert from "node:assert/strict";
import { validateOaCodingProblem, oaCodingProblemSchema } from "@rehearse/shared";

async function runValidatorTests() {
  console.log("Running OA Coding Problem Validator unit tests...");

  // 1. Valid Problem passes
  const validProblem = {
    type: "CODING",
    title: "Binary Tree Inversion",
    text: "Given the root of a binary tree, invert the tree, and return its root.",
    difficulty: "EASY",
    skillTags: ["Trees", "Recursion"],
    companyTags: ["Google"],
    roleTags: ["Backend", "Fullstack"],
    constraints: "The number of nodes in the tree is in the range [0, 100].",
    examples: [
      { input: "[4,2,7,1,3,6,9]", output: "[4,7,2,9,6,3,1]" },
    ],
    starterCode: {
      python: "def invert_tree(root):\n    pass",
      javascript: "function invertTree(root) {\n    return root;\n}",
    },
    testCases: [
      { input: "4 2 7 1 3 6 9", expected: "4 7 2 9 6 3 1", hidden: false },
      { input: "2 1 3", expected: "2 3 1", hidden: true },
    ],
  };

  const parsed = validateOaCodingProblem(validProblem);
  assert.equal(parsed.title, "Binary Tree Inversion");
  console.log("  ✓ Valid problem parsed successfully.");

  // 2. Missing title fails loudly
  assert.throws(
    () => {
      validateOaCodingProblem({
        ...validProblem,
        title: "",
      });
    },
    /Problem title must be at least 3 characters/,
    "Expected failure when title is empty"
  );
  console.log("  ✓ Empty title fails validation loudly.");

  // 3. Null or whitespace title fails
  assert.throws(
    () => {
      validateOaCodingProblem({
        ...validProblem,
        title: "   ",
      });
    },
    /Problem title must be at least 3 characters/,
    "Expected failure when title is whitespace"
  );
  console.log("  ✓ Whitespace title fails validation loudly.");

  // 4. Missing statement/text fails
  assert.throws(
    () => {
      validateOaCodingProblem({
        ...validProblem,
        text: "Too short",
      });
    },
    /Problem statement\/description must be at least 10 characters/,
    "Expected failure when statement is too short"
  );
  console.log("  ✓ Short/empty statement fails validation.");

  // 5. Zero test cases fails
  assert.throws(
    () => {
      validateOaCodingProblem({
        ...validProblem,
        testCases: [],
      });
    },
    /At least one test case is required/,
    "Expected failure with 0 test cases"
  );
  console.log("  ✓ Zero test cases fails validation.");

  // 6. Only hidden test cases (no visible sample) fails
  assert.throws(
    () => {
      validateOaCodingProblem({
        ...validProblem,
        testCases: [{ input: "1", expected: "1", hidden: true }],
      });
    },
    /At least one visible sample test case \(hidden: false\) is required/,
    "Expected failure without any visible test case"
  );
  console.log("  ✓ All-hidden test cases fails validation.");

  // 7. Missing starter code for javascript or python fails
  assert.throws(
    () => {
      validateOaCodingProblem({
        ...validProblem,
        starterCode: { python: "pass" }, // Missing javascript
      });
    },
    /Starter code must provide implementations for at least python and javascript/,
    "Expected failure when javascript starter code is missing"
  );
  console.log("  ✓ Incomplete language starter code fails validation.");

  console.log("✅ All OA Problem Validator unit tests passed successfully!");
}

runValidatorTests().catch((err) => {
  console.error("❌ Validator unit test failed:", err);
  process.exit(1);
});
