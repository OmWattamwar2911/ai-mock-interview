import assert from "node:assert";
import { SandboxDriver, MAX_OUTPUT_BYTES } from "./sandbox.js";

async function testSandboxDriver() {
  console.log("Running Compiler Sandbox verification tests...");
  const driver = new SandboxDriver();

  // Test 1: Python execution with stdin and stdout
  console.log("  Testing Python basic execution...");
  const pyCode = `
import sys
data = sys.stdin.read().strip()
print(f"Hello, {data}!")
`;
  const resPy = await driver.execute("python", pyCode, "World", { cpuTimeSec: 2, memoryKb: 128_000 });
  assert.strictEqual(resPy.status, "ACCEPTED", `Expected ACCEPTED, got ${resPy.status} (${resPy.stderr})`);
  assert.strictEqual(resPy.stdout.trim(), "Hello, World!");
  assert(resPy.timeMs >= 0, "timeMs should be non-negative");
  console.log("  ✓ Python execution passed (stdout:", resPy.stdout.trim(), ")");

  // Test 2: JavaScript execution
  console.log("  Testing JavaScript basic execution...");
  const jsCode = `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
const num = parseInt(input, 10);
console.log(num * 2);
`;
  const resJs = await driver.execute("javascript", jsCode, "21", { cpuTimeSec: 2, memoryKb: 128_000 });
  assert.strictEqual(resJs.status, "ACCEPTED", `Expected ACCEPTED, got ${resJs.status} (${resJs.stderr})`);
  assert.strictEqual(resJs.stdout.trim(), "42");
  console.log("  ✓ JavaScript execution passed (stdout:", resJs.stdout.trim(), ")");

  // Test 3: Time limit enforcement (infinite loop)
  console.log("  Testing Time Limit enforcement...");
  const pyLoop = `
while True:
    pass
`;
  const resTimeout = await driver.execute("python", pyLoop, "", { cpuTimeSec: 1, memoryKb: 128_000 });
  assert.strictEqual(resTimeout.status, "TIME_LIMIT", `Expected TIME_LIMIT, got ${resTimeout.status}`);
  console.log("  ✓ Time Limit enforcement passed (status:", resTimeout.status, ")");

  // Test 4: Output size cap enforcement (> 64KB)
  console.log("  Testing Output Size Cap enforcement (>64KB)...");
  const pyFlood = `
# Print 200KB of text
print("X" * 200000)
`;
  const resFlood = await driver.execute("python", pyFlood, "", { cpuTimeSec: 2, memoryKb: 128_000 });
  assert(Buffer.byteLength(resFlood.stdout, "utf8") <= MAX_OUTPUT_BYTES + 100, "Output must be capped at 64KB");
  assert(resFlood.stdout.includes("[Output capped at 64KB]"), "Output must contain cap warning banner");
  console.log("  ✓ Output Size Cap enforcement passed (size:", Buffer.byteLength(resFlood.stdout), "bytes)");

  // Test 5: Syntax / Compile error
  console.log("  Testing Syntax / Compile error...");
  const pySyntaxErr = `
def broken(
`;
  const resErr = await driver.execute("python", pySyntaxErr, "", { cpuTimeSec: 2, memoryKb: 128_000 });
  assert(resErr.status === "COMPILE_ERROR" || resErr.status === "RUNTIME_ERROR");
  assert(resErr.stderr.length > 0, "Must return error message in stderr");
  console.log("  ✓ Error reporting passed (status:", resErr.status, ")");

  console.log("✅ All Compiler Sandbox tests passed successfully!");
}

testSandboxDriver().catch((err) => {
  console.error("❌ Compiler Sandbox test failed:", err);
  process.exit(1);
});
