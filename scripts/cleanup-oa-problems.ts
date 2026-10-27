import { resolve } from "node:path";
import * as fs from "node:fs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), "apps/web/.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CleanupCandidate {
  id: string;
  title: string | null;
  type: string;
  text: string;
  difficulty: string;
  skillTags: string[];
  companyTags: string[];
  roleTags: string[];
  reason: string;
  hasReferences: boolean;
  action: "DELETE" | "DEACTIVATE";
  refCounts: {
    submissions: number;
    sessions: number;
  };
}

async function findCandidates(): Promise<CleanupCandidate[]> {
  const problems = await prisma.question.findMany({
    where: { source: "BANK" },
    include: {
      oaSubmissions: true,
      sessions: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const candidates: CleanupCandidate[] = [];

  for (const q of problems) {
    const reasons: string[] = [];
    const titleEmpty = !q.title || q.title.trim().length === 0;
    const textEmpty = !q.text || q.text.trim().length === 0;

    const testArray = Array.isArray(q.testCases) ? (q.testCases as any[]) : [];
    const zeroTests = testArray.length === 0;

    const starterKeys = q.starterCode && typeof q.starterCode === "object" ? Object.keys(q.starterCode as object) : [];
    const noStarter = starterKeys.length === 0;

    if (titleEmpty) reasons.push("Missing/empty title");
    if (textEmpty) reasons.push("Missing/empty statement");
    if (zeroTests) reasons.push("Zero test cases");
    if (noStarter) reasons.push("No starter code");
    if (q.type !== "CODING") reasons.push(`Non-coding question type (${q.type})`);

    // An OA challenge must be CODING, have a title, statement, test cases, and starter code
    if (titleEmpty || textEmpty || zeroTests || noStarter || q.type !== "CODING") {
      const subCount = q.oaSubmissions.length;
      const sessCount = q.sessions.length;
      const hasReferences = subCount > 0 || sessCount > 0;

      candidates.push({
        id: q.id,
        title: q.title,
        type: q.type,
        text: q.text,
        difficulty: q.difficulty,
        skillTags: q.skillTags,
        companyTags: q.companyTags,
        roleTags: q.roleTags,
        reason: reasons.join("; "),
        hasReferences,
        action: hasReferences ? "DEACTIVATE" : "DELETE",
        refCounts: {
          submissions: subCount,
          sessions: sessCount,
        },
      });
    }
  }

  return candidates;
}

async function main() {
  const isApply = process.argv.includes("--apply");
  const isDryRun = !isApply || process.argv.includes("--dry-run");

  console.log("================================================================================");
  console.log(`            REHEARSE OA PROBLEMS CLEANUP SCRIPT [${isApply ? "APPLY MODE" : "DRY-RUN MODE"}]`);
  console.log("================================================================================\n");

  const candidates = await findCandidates();

  console.log(`Found ${candidates.length} candidate problems to clean up out of all bank questions.\n`);

  if (candidates.length === 0) {
    console.log("No unusable problems found. Database is already clean!");
    return;
  }

  const toDelete = candidates.filter((c) => c.action === "DELETE");
  const toDeactivate = candidates.filter((c) => c.action === "DEACTIVATE");

  console.log("CANDIDATE BREAKDOWN:");
  console.log(` - To HARD DELETE (0 foreign key references):    ${toDelete.length}`);
  console.log(` - To DEACTIVATE (referenced by history/sessions): ${toDeactivate.length}`);
  console.log("--------------------------------------------------------------------------------\n");

  candidates.forEach((c, idx) => {
    console.log(`[${idx + 1}] ID: ${c.id} | Action: ${c.action} | Type: ${c.type} | Diff: ${c.difficulty}`);
    console.log(`    Title:  ${c.title ? `"${c.title}"` : "(EMPTY TITLE)"}`);
    console.log(`    Tags:   [${c.skillTags.join(", ")}]`);
    console.log(`    Reason: ${c.reason}`);
    console.log(`    Refs:   submissions=${c.refCounts.submissions}, sessions=${c.refCounts.sessions}\n`);
  });

  if (isDryRun) {
    console.log("================================================================================");
    console.log("DRY RUN COMPLETE. No changes were made to the database.");
    console.log("To execute the cleanup, run with the --apply flag:");
    console.log("  .\\apps\\web\\node_modules\\.bin\\tsx scripts/cleanup-oa-problems.ts --apply");
    console.log("================================================================================");
    return;
  }

  // --- APPLY MODE ---
  console.log("Preparing export backup before applying changes...");
  const backupDir = resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilePath = resolve(backupDir, `oa-problems-${timestamp}.json`);

  // Fetch full records of all affected candidates for backup
  const fullRecords = await prisma.question.findMany({
    where: { id: { in: candidates.map((c) => c.id) } },
  });

  fs.writeFileSync(backupFilePath, JSON.stringify(fullRecords, null, 2), "utf8");
  console.log(`✓ Backup successfully written to: ${backupFilePath} (${fullRecords.length} records)\n`);

  console.log("Executing cleanup inside database transaction...");

  await prisma.$transaction(async (tx) => {
    // 1. Deactivate referenced records
    if (toDeactivate.length > 0) {
      const deactIds = toDeactivate.map((c) => c.id);
      await tx.question.updateMany({
        where: { id: { in: deactIds } },
        data: { isActive: false },
      });
      console.log(`✓ Deactivated ${deactIds.length} referenced problems.`);
    }

    // 2. Delete unreferenced records
    if (toDelete.length > 0) {
      const delIds = toDelete.map((c) => c.id);
      const res = await tx.question.deleteMany({
        where: { id: { in: delIds } },
      });
      console.log(`✓ Deleted ${res.count} unusable problems with 0 references.`);
    }
  });

  console.log("\n================================================================================");
  console.log("CLEANUP APPLIED SUCCESSFULLY.");
  console.log("================================================================================");
}

main()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
