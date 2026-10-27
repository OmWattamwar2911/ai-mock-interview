import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), "apps/web/.env") });

import { PrismaClient } from "@prisma/client";
import { BANK_QUESTIONS } from "../apps/web/prisma/bank-questions";
import { COMPANY_OA_QUESTIONS } from "../apps/web/prisma/company-oa-questions";

const prisma = new PrismaClient();

export interface ProblemAuditResult {
  total: number;
  emptyTitle: any[];
  emptyDescription: any[];
  zeroTestCases: any[];
  noStarterCode: any[];
  conceptualType: any[];
  duplicates: any[];
  references: {
    oaSubmissions: number;
    sessionQuestions: number;
  };
}

export async function runAudit(): Promise<ProblemAuditResult> {
  const problems = await prisma.question.findMany({
    where: { source: "BANK" },
    include: {
      oaSubmissions: true,
      sessions: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const emptyTitle: any[] = [];
  const emptyDescription: any[] = [];
  const zeroTestCases: any[] = [];
  const noStarterCode: any[] = [];
  const conceptualType: any[] = [];

  // Origin map
  const bankQuestionTexts = new Set(BANK_QUESTIONS.map((q) => q.text.trim()));
  const companyQuestionTitles = new Set(COMPANY_OA_QUESTIONS.map((q) => q.title.trim()));

  function getOrigin(q: { title: string | null; text: string }) {
    if (q.title && companyQuestionTitles.has(q.title.trim())) {
      return "seed:company-oa-questions.ts";
    }
    if (bankQuestionTexts.has(q.text.trim())) {
      return "seed:bank-questions.ts";
    }
    return "database-only";
  }

  // Duplicate tracking
  const seenMap = new Map<string, any[]>();

  for (const q of problems) {
    const origin = getOrigin(q);
    const item = {
      id: q.id,
      title: q.title,
      type: q.type,
      textPreview: q.text ? q.text.slice(0, 70).replace(/\n/g, " ") : "",
      difficulty: q.difficulty,
      skillTags: q.skillTags,
      companyTags: q.companyTags,
      roleTags: q.roleTags,
      origin,
      submissionCount: q.oaSubmissions.length,
      sessionCount: q.sessions.length,
    };

    // 1. Empty, null or whitespace title
    if (!q.title || q.title.trim().length === 0) {
      emptyTitle.push(item);
    }

    // 2. Empty description or statement
    if (!q.text || q.text.trim().length === 0) {
      emptyDescription.push(item);
    }

    // 3. Zero test cases
    const tests = Array.isArray(q.testCases) ? (q.testCases as any[]) : [];
    if (tests.length === 0) {
      zeroTestCases.push(item);
    }

    // 4. No starter code for any language
    const starter = q.starterCode && typeof q.starterCode === "object" ? Object.keys(q.starterCode as object) : [];
    if (starter.length === 0) {
      noStarterCode.push(item);
    }

    // 5. Conceptual / theory type
    const isConceptualPrefix = /^(how does|what is|explain|why|walk through|compare|tell me|describe|talk about|you notice|give an|share a)\b/i.test(
      (q.text || "").trim()
    );
    if (q.type === "CONCEPTUAL" || q.type === "BEHAVIOURAL" || tests.length === 0 || isConceptualPrefix) {
      conceptualType.push(item);
    }

    // Duplicates key: (title + companyTags + roleTags)
    if (q.title && q.title.trim().length > 0) {
      const dupKey = `${q.title.trim().toLowerCase()}|${(q.companyTags || []).sort().join(",")}|${(q.roleTags || []).sort().join(",")}`;
      if (!seenMap.has(dupKey)) {
        seenMap.set(dupKey, []);
      }
      seenMap.get(dupKey)!.push(item);
    }
  }

  const duplicates: any[] = [];
  for (const [key, items] of seenMap.entries()) {
    if (items.length > 1) {
      duplicates.push({ key, count: items.length, items });
    }
  }

  // Count foreign key references
  const totalSubmissions = await prisma.oaSubmission.count();
  const totalSessionQuestions = await prisma.sessionQuestion.count();

  return {
    total: problems.length,
    emptyTitle,
    emptyDescription,
    zeroTestCases,
    noStarterCode,
    conceptualType,
    duplicates,
    references: {
      oaSubmissions: totalSubmissions,
      sessionQuestions: totalSessionQuestions,
    },
  };
}

async function main() {
  console.log("================================================================================");
  console.log("                      REHEARSE OA PROBLEMS AUDIT REPORT                         ");
  console.log("================================================================================\n");

  const result = await runAudit();

  console.log(`TOTAL BANK PROBLEMS IN DATABASE: ${result.total}`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`1. Problems with empty/null/whitespace title:    ${result.emptyTitle.length}`);
  console.log(`2. Problems with empty description/statement:     ${result.emptyDescription.length}`);
  console.log(`3. Problems with ZERO test cases:                 ${result.zeroTestCases.length}`);
  console.log(`4. Problems with NO starter code:                 ${result.noStarterCode.length}`);
  console.log(`5. Problems with conceptual/theory nature:        ${result.conceptualType.length}`);
  console.log(`6. Duplicate problem groups:                      ${result.duplicates.length}`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`FOREIGN KEY REFERENCES:`);
  console.log(` - OaSubmission rows:                             ${result.references.oaSubmissions}`);
  console.log(` - SessionQuestion rows:                          ${result.references.sessionQuestions}`);
  console.log(`================================================================================\n`);

  console.log("DETAILED BREAKDOWN BY CATEGORY:\n");

  console.log(`### GROUP 1: Problems with Empty/Null Title (${result.emptyTitle.length})`);
  result.emptyTitle.forEach((p, idx) => {
    console.log(
      `  [${idx + 1}] ID: ${p.id} | Type: ${p.type} | Diff: ${p.difficulty} | Origin: ${p.origin}`
    );
    console.log(`      Tags: [${p.skillTags.join(", ")}]`);
    console.log(`      Text: "${p.textPreview}..."`);
    console.log(`      Refs: submissions=${p.submissionCount}, sessions=${p.sessionCount}\n`);
  });

  console.log(`\n### GROUP 2: Problems with Zero Test Cases (${result.zeroTestCases.length})`);
  result.zeroTestCases.forEach((p, idx) => {
    console.log(
      `  [${idx + 1}] ID: ${p.id} | Title: "${p.title || "(NO TITLE)"}" | Type: ${p.type} | Origin: ${p.origin}`
    );
    console.log(`      Text: "${p.textPreview}..."\n`);
  });

  console.log(`\n### GROUP 3: Conceptual / Theory Questions (${result.conceptualType.length})`);
  result.conceptualType.forEach((p, idx) => {
    console.log(
      `  [${idx + 1}] ID: ${p.id} | Type: ${p.type} | Title: "${p.title || "(NO TITLE)"}" | Origin: ${p.origin}`
    );
    console.log(`      Text: "${p.textPreview}..."\n`);
  });

  if (result.duplicates.length > 0) {
    console.log(`\n### GROUP 4: Duplicates (${result.duplicates.length})`);
    result.duplicates.forEach((dup, idx) => {
      console.log(`  [${idx + 1}] Duplicate Key: "${dup.key}" (${dup.count} entries)`);
      dup.items.forEach((item: any) => {
        console.log(`      - ID: ${item.id} | Title: "${item.title}" | Origin: ${item.origin}`);
      });
    });
  } else {
    console.log("\n### GROUP 4: Duplicates: None found (0).");
  }

  console.log("\n================================================================================");
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error("Audit failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
