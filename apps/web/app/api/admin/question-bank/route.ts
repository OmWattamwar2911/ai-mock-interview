import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

const questionSchema = z.object({
  type: z.enum(["MCQ", "MULTI_SELECT", "NUMERIC"]),
  text: z.string().min(5).max(10_000),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.number(), z.array(z.string())]),
  marks: z.number().int().positive().max(100).default(1),
  topic: z.string().min(1).max(120),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  constraints: z.string().max(10_000).optional(),
  examples: z.unknown().optional(),
  starterCode: z.record(z.string()).optional(),
  testCases: z.array(z.object({ input: z.string(), expected: z.string(), hidden: z.boolean().default(false) })).optional(),
  referenceSolution: z.record(z.string()).optional(),
});

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const search = url.searchParams.get("search") ?? undefined;
  const questions = await prisma.assessmentBankQuestion.findMany({ where: { deletedAt: null, ...(type ? { type: type as "MCQ" | "MULTI_SELECT" | "NUMERIC" } : {}), ...(search ? { text: { contains: search, mode: "insensitive" } } : {}) }, orderBy: { createdAt: "desc" } });
  return jsonOk({ questions: questions.map(({ correctAnswer: _correctAnswer, referenceSolution: _referenceSolution, ...question }) => question) });
}

export async function POST(request: Request) {
  const { error, user } = await requireAdmin();
  if (error || !user) return error;
  const parsed = questionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Invalid assessment bank question");
  const question = await prisma.assessmentBankQuestion.create({ data: { ...parsed.data, correctAnswer: parsed.data.correctAnswer as Prisma.InputJsonValue, options: parsed.data.options as Prisma.InputJsonValue | undefined, examples: parsed.data.examples as Prisma.InputJsonValue | undefined, starterCode: parsed.data.starterCode as Prisma.InputJsonValue | undefined, testCases: parsed.data.testCases as Prisma.InputJsonValue | undefined, referenceSolution: parsed.data.referenceSolution as Prisma.InputJsonValue | undefined, createdById: user.id } });
  return jsonOk({ question: { ...question, correctAnswer: undefined, referenceSolution: undefined } }, 201);
}