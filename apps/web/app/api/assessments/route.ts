import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { callAiEngine } from "@/lib/services";

const createSchema = z.object({
  jdId: z.string().min(1),
  title: z.string().trim().min(1).max(160).optional(),
  mcqDurationSec: z.number().int().min(60).max(7_200).default(900),
  codingDurationSec: z.number().int().min(60).max(7_200).default(1_800),
  codingCount: z.number().int().min(1).max(3).default(2),
});

const fallbackMcqs = [
  { text: "Which HTTP method is normally idempotent for replacing a resource?", options: ["POST", "PUT", "PATCH", "CONNECT"], answer: "PUT", topic: "HTTP" },
  { text: "Which data structure gives average O(1) key lookup?", options: ["Array", "Hash map", "Linked list", "Binary tree"], answer: "Hash map", topic: "Data structures" },
  { text: "What is the primary purpose of a database index?", options: ["Encrypt rows", "Speed up lookups", "Validate JSON", "Start transactions"], answer: "Speed up lookups", topic: "Databases" },
  { text: "Which status represents a successful resource creation?", options: ["200", "201", "204", "304"], answer: "201", topic: "APIs" },
  { text: "What does a queue normally provide?", options: ["LIFO", "FIFO", "Random access", "Sorted access"], answer: "FIFO", topic: "Data structures" },
];

function publicCodingQuestion(question: { id: string; statement: string; constraints: string | null; examples: Prisma.JsonValue | null; starterCode: Prisma.JsonValue; testCases: Prisma.JsonValue; marks: number; difficulty: string; source: string; orderIndex: number }) {
  const tests = Array.isArray(question.testCases) ? question.testCases.filter((test) => typeof test === "object" && test !== null && !Array.isArray(test) && (test as { hidden?: boolean }).hidden !== true) : [];
  return { ...question, testCases: tests };
}

export async function GET() {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  const assessments = await prisma.assessment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { sections: { orderBy: { orderIndex: "asc" }, include: { questions: { orderBy: { orderIndex: "asc" } }, coding: { orderBy: { orderIndex: "asc" } } } }, attempts: { orderBy: { startedAt: "desc" }, take: 1, select: { id: true, score: true, submittedAt: true } } },
  });
  return jsonOk({ assessments: assessments.map((assessment) => ({ ...assessment, sections: assessment.sections.map((section) => ({ ...section, questions: section.questions.map(({ correctAnswer: _correctAnswer, ...question }) => question), coding: section.coding.map(publicCodingQuestion) })) })) });
}

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "jdId and valid section durations are required");
  const jd = await prisma.jobDescription.findFirst({ where: { id: parsed.data.jdId, userId: user.id } });
  if (!jd) return jsonError(404, "NOT_FOUND", "Job description not found");

  const jdParsed = (jd.parsed as { requiredSkills?: string[] }) ?? {};
  let generatedMcqs = fallbackMcqs;
  try {
    const ai = await callAiEngine("/v1/questions/generate", { type: "assessment-mcq", skillGap: { missing: jdParsed.requiredSkills ?? [] }, config: { count: 5 }, bankHints: fallbackMcqs });
    if (Array.isArray((ai as { questions?: unknown }).questions)) generatedMcqs = (ai as { questions: typeof fallbackMcqs }).questions;
  } catch {
    // The curated fallback keeps an assessment usable when no LLM key is configured.
  }

  const bank = await prisma.question.findMany({ where: { type: "CODING", source: "BANK", deletedAt: null }, orderBy: { createdAt: "asc" }, take: parsed.data.codingCount });
  if (bank.length === 0) return jsonError(409, "NO_QUESTIONS", "No coding questions are available in the bank");
  const totalMarks = generatedMcqs.length + bank.length * 10;
  const assessment = await prisma.assessment.create({
    data: {
      userId: user.id,
      jdId: jd.id,
      title: parsed.data.title ?? `${jd.title} assessment`,
      durationSec: parsed.data.mcqDurationSec + parsed.data.codingDurationSec,
      totalMarks,
      status: "READY",
      sections: {
        create: [
          { type: "MCQ_ROUND", title: "MCQ round", durationSec: parsed.data.mcqDurationSec, orderIndex: 0, questions: { create: generatedMcqs.map((question, index) => ({ type: "MCQ", text: question.text, options: question.options, correctAnswer: question.answer, marks: 1, topic: question.topic, difficulty: "MEDIUM", orderIndex: index })) } },
          { type: "CODING_ROUND", title: "Coding round", durationSec: parsed.data.codingDurationSec, orderIndex: 1 },
        ],
      },
    },
    include: { sections: { orderBy: { orderIndex: "asc" }, include: { questions: true, coding: true } } },
  });
  const codingSection = assessment.sections.find((section) => section.type === "CODING_ROUND");
  if (!codingSection) return jsonError(500, "INTERNAL_ERROR", "Coding section was not created");
  await prisma.assessmentCodingQuestion.createMany({ data: bank.map((question, index) => ({ assessmentId: assessment.id, sectionId: codingSection.id, statement: question.text, constraints: question.constraints, examples: question.examples ?? undefined, starterCode: question.starterCode ?? {}, testCases: question.testCases ?? [], referenceSolution: question.starterCode ?? {}, marks: 10, difficulty: question.difficulty, source: "BANK", orderIndex: index })) });
  const complete = await prisma.assessment.findUnique({ where: { id: assessment.id }, include: { sections: { orderBy: { orderIndex: "asc" }, include: { questions: true, coding: true } } } });
  return jsonOk({ assessment: complete }, 201);
}