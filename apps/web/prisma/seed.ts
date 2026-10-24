import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { SKILLS_TAXONOMY } from "@rehearse/shared";
import { BANK_QUESTIONS } from "./bank-questions";
import { COMPANY_OA_QUESTIONS } from "./company-oa-questions";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function upsertUser(email: string, name: string, password: string, role: "ADMIN" | "CANDIDATE") {
  const passwordHash = await hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role },
    create: { email, name, passwordHash, role },
  });
}

async function seedOaQuestions() {
  for (const q of COMPANY_OA_QUESTIONS) {
    const existing = await prisma.question.findFirst({
      where: { title: q.title, source: "BANK" },
    });
    if (existing) {
      await prisma.question.update({
        where: { id: existing.id },
        data: {
          type: q.type,
          text: q.text,
          difficulty: q.difficulty,
          skillTags: q.skillTags,
          companyTags: q.companyTags,
          roleTags: q.roleTags,
          constraints: q.constraints,
          examples: q.examples,
          starterCode: q.starterCode,
          testCases: q.testCases,
          referenceSolution: q.referenceSolution,
          expectedPoints: q.expectedPoints,
          deletedAt: null,
        },
      });
      continue;
    }
    await prisma.question.create({
      data: {
        type: q.type,
        title: q.title,
        text: q.text,
        difficulty: q.difficulty,
        skillTags: q.skillTags,
        companyTags: q.companyTags,
        roleTags: q.roleTags,
        constraints: q.constraints,
        examples: q.examples,
        starterCode: q.starterCode,
        testCases: q.testCases,
        referenceSolution: q.referenceSolution,
        expectedPoints: q.expectedPoints,
        source: "BANK",
      },
    });
  }
}

async function seedBank() {
  for (const question of BANK_QUESTIONS) {
    const existing = await prisma.question.findFirst({
      where: { text: question.text, source: "BANK" },
    });
    if (existing) {
      await prisma.question.update({
        where: { id: existing.id },
        data: {
          type: question.type,
          difficulty: question.difficulty,
          skillTags: question.skillTags,
          expectedPoints: question.expectedPoints,
          starterCode: question.starterCode,
          testCases: question.testCases,
          constraints: question.constraints,
          examples: question.examples,
          deletedAt: null,
        },
      });
      continue;
    }
    await prisma.question.create({
      data: {
        type: question.type,
        text: question.text,
        difficulty: question.difficulty,
        skillTags: question.skillTags,
        expectedPoints: question.expectedPoints,
        source: "BANK",
        starterCode: question.starterCode,
        testCases: question.testCases,
        constraints: question.constraints,
        examples: question.examples,
      },
    });
  }
}

async function main() {
  if (SKILLS_TAXONOMY.length < 200) {
    throw new Error(`Taxonomy has ${SKILLS_TAXONOMY.length} skills; need 200+`);
  }
  if (BANK_QUESTIONS.length < 40) {
    throw new Error(`Bank has ${BANK_QUESTIONS.length} questions; need 40+`);
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@rehearse.local").toLowerCase();
  const candidateEmail = (process.env.SEED_CANDIDATE_EMAIL ?? "demo@rehearse.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me";
  const candidatePassword = process.env.SEED_CANDIDATE_PASSWORD ?? "change-me";

  const admin = await upsertUser(adminEmail, "Rehearse Admin", adminPassword, "ADMIN");
  const candidate = await upsertUser(candidateEmail, "Demo Candidate", candidatePassword, "CANDIDATE");
  await seedBank();
  await seedOaQuestions();

  const bankCount = await prisma.question.count({ where: { source: "BANK", deletedAt: null } });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "seed.complete",
      meta: {
        skills: SKILLS_TAXONOMY.length,
        bankQuestions: bankCount,
        adminEmail,
        candidateEmail,
        candidateId: candidate.id,
      },
    },
  });

  console.log(`Seeded taxonomy=${SKILLS_TAXONOMY.length} bankQuestions=${bankCount}`);
  console.log(`Admin: ${adminEmail}`);
  console.log(`Candidate: ${candidateEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
