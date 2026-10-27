import { prisma } from "../apps/web/lib/prisma";
import { evaluateSession } from "../apps/web/lib/evaluation";

async function reevaluateAllSessions() {
  const isApply = process.argv.includes("--apply");
  console.log(`\n======================================================`);
  console.log(`Re-evaluating Interview Sessions with Real Evidence Model`);
  console.log(`Mode: ${isApply ? "APPLY (writing changes to DB)" : "DRY RUN (preview only)"}`);
  console.log(`======================================================\n`);

  const sessions = await prisma.interviewSession.findMany({
    where: { status: "COMPLETED" },
    include: { report: true, jd: true },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${sessions.length} completed session(s) in database.\n`);

  let countInsufficient = 0;
  let countEvaluated = 0;

  for (const s of sessions) {
    console.log(`Session ID: ${s.id} | Created: ${s.createdAt.toISOString()} | JD: ${s.jd?.title || "N/A"}`);
    const prevOverallScore = s.report?.overallScore;
    console.log(`  Current stored report overallScore: ${prevOverallScore ?? "None"}`);

    if (isApply) {
      try {
        const { botSummary } = await evaluateSession(s.id, true);
        if (botSummary.insufficientData) {
          countInsufficient++;
          console.log(`  -> Evaluated as: INSUFFICIENT_DATA (overallScore: null, honest status set)`);
        } else {
          countEvaluated++;
          console.log(`  -> Evaluated as: ${botSummary.verdict} (score: ${botSummary.overallScore}/10, 100-scale: ${botSummary.overallScore100})`);
        }
      } catch (err: any) {
        console.error(`  -> Failed evaluation: ${err.message}`);
      }
    } else {
      // Dry run simulation
      const transcript = Array.isArray(s.transcript) ? (s.transcript as any[]) : [];
      const candidateTurns = transcript.filter(
        (t) => (t.role || t.speaker || "").toLowerCase() === "user" || (t.role || t.speaker || "").toLowerCase() === "candidate"
      );
      const meaningfulCount = candidateTurns.filter((t) => {
        const text = (t.text || "").trim();
        const words = text.split(/\s+/).filter(Boolean);
        return words.length >= 8 && !/^(hi|hello|hey|yes|no|ok|ready)/i.test(text);
      }).length;

      if (meaningfulCount < 2) {
        countInsufficient++;
        console.log(`  -> [Preview] Would become: INSUFFICIENT_DATA (meaningful turns: ${meaningfulCount})`);
      } else {
        countEvaluated++;
        console.log(`  -> [Preview] Would be evaluated: Evidence threshold met (${meaningfulCount} meaningful turns)`);
      }
    }
    console.log("");
  }

  console.log("------------------------------------------------------");
  console.log(`Summary:`);
  console.log(`  Sessions requiring INSUFFICIENT_DATA: ${countInsufficient}`);
  console.log(`  Sessions with valid evidence:        ${countEvaluated}`);
  console.log("------------------------------------------------------");

  if (!isApply) {
    console.log("\nRun with `npx tsx scripts/reevaluate-sessions.ts --apply` to commit changes.\n");
  }
}

reevaluateAllSessions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
