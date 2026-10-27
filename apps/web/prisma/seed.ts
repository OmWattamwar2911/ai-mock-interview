import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import { PrismaClient, Prisma } from "@prisma/client";
import { SKILLS_TAXONOMY, validateOaCodingProblem } from "@rehearse/shared";
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
  for (const rawQ of COMPANY_OA_QUESTIONS) {
    const q = validateOaCodingProblem(rawQ);
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
          expectedPoints: (q.expectedPoints ?? {}) as Prisma.InputJsonValue,
          isActive: true,
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
        expectedPoints: (q.expectedPoints ?? {}) as Prisma.InputJsonValue,
        source: "BANK",
        isActive: true,
      },
    });
  }
}

async function seedBank() {
  for (const question of BANK_QUESTIONS) {
    try {
      validateOaCodingProblem(question);
    } catch {
      // Skip non-coding or un-titled prompts to prevent polluting the active challenge bank
      continue;
    }
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
          isActive: true,
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
        isActive: true,
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

  const existingResume = await prisma.resume.findFirst({ where: { userId: candidate.id } });
  if (!existingResume) {
    await prisma.resume.create({
      data: {
        userId: candidate.id,
        fileName: "Demo_Resume.pdf",
        fileType: "application/pdf",
        encryptedText: "mock-encrypted-text",
        parsed: {
          skills: ["TypeScript", "JavaScript", "React", "Node.js", "PostgreSQL", "Docker", "Git"],
          experience: [
            { title: "Software Engineer", company: "Acme Corp", bullets: ["Built web applications with React and Node.js"] },
          ],
          education: [
            { degree: "B.S. in Computer Science", institution: "Tech University", year: 2024 },
          ],
          summary: "Full Stack Engineer specializing in TypeScript, React, Node.js, and PostgreSQL.",
        },
      },
    });
  }

  const existingJd = await prisma.jobDescription.findFirst({ where: { userId: candidate.id } });
  if (!existingJd) {
    await prisma.jobDescription.create({
      data: {
        userId: candidate.id,
        title: "Full Stack Software Engineer",
        encryptedText: "mock-encrypted-jd-text",
        parsed: {
          title: "Full Stack Software Engineer",
          requiredSkills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
          preferredSkills: ["Docker", "Kubernetes", "AWS"],
          responsibilities: ["Develop scalable microservices", "Build responsive UI components"],
          keywords: ["Full Stack", "TypeScript", "React"],
        },
      },
    });
  }

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
