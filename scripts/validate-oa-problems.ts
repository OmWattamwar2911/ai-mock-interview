import { runAudit } from "./audit-oa-problems";

async function validate() {
  console.log("Running CI OA Problems Validation Check...");
  const result = await runAudit();

  let hasError = false;

  if (result.total === 0) {
    console.error("❌ Validation Failed: No OA problems found in database.");
    hasError = true;
  }

  if (result.emptyTitle.length > 0) {
    console.error(`❌ Validation Failed: Found ${result.emptyTitle.length} problems with empty/null title.`);
    hasError = true;
  }

  if (result.emptyDescription.length > 0) {
    console.error(`❌ Validation Failed: Found ${result.emptyDescription.length} problems with empty statement.`);
    hasError = true;
  }

  if (result.zeroTestCases.length > 0) {
    console.error(`❌ Validation Failed: Found ${result.zeroTestCases.length} problems with ZERO test cases.`);
    hasError = true;
  }

  if (result.noStarterCode.length > 0) {
    console.error(`❌ Validation Failed: Found ${result.noStarterCode.length} problems with NO starter code.`);
    hasError = true;
  }

  if (result.conceptualType.length > 0) {
    console.error(`❌ Validation Failed: Found ${result.conceptualType.length} conceptual/non-coding problems in OA bank.`);
    hasError = true;
  }

  if (result.duplicates.length > 0) {
    console.error(`❌ Validation Failed: Found ${result.duplicates.length} duplicate problem groups.`);
    hasError = true;
  }

  if (hasError) {
    console.error("❌ OA Problems validation failed with errors.");
    process.exit(1);
  }

  console.log(`✓ All ${result.total} OA problems in database passed validation cleanly.`);
}

validate().catch((err) => {
  console.error("Validation execution error:", err);
  process.exit(1);
});
