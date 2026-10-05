import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { callCompiler } from "@/lib/services";

const schema = z.object({ questionId: z.string(), language: z.enum(["python", "javascript", "java", "cpp", "c"]), sourceCode: z.string().min(1).max(100_000), submit: z.boolean().default(false) });

export async function POST(request: Request, context: { params: { id: string } }) {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "questionId, language, and sourceCode are required");
  const attempt = await prisma.assessmentAttempt.findFirst({ where: { id: context.params.id, userId: user.id, submittedAt: null }, include: { assessment: true } });
  if (!attempt) return jsonError(404, "NOT_FOUND", "Open assessment attempt not found");
  const question = await prisma.assessmentCodingQuestion.findFirst({ where: { id: parsed.data.questionId, assessmentId: attempt.assessmentId } });
  if (!question) return jsonError(404, "NOT_FOUND", "Coding question not found");
  const tests = Array.isArray(question.testCases) ? question.testCases.filter((test): test is Prisma.JsonObject => typeof test === "object" && test !== null && !Array.isArray(test)).map((test) => ({ input: String(test.input ?? ""), expected: String(test.expected ?? ""), hidden: Boolean(test.hidden) })) : [];
  const result = await callCompiler("/v1/run-tests", { language: parsed.data.language, source: parsed.data.sourceCode, tests });
  const response = result as { tests: Array<{ hidden?: boolean; passed: boolean; status: string; stdout: string; stderr: string; timeMs: number; memoryKb: number | null; expected: string }>; passedCount: number; totalCount: number };
  const score = question.marks * (response.passedCount / Math.max(response.totalCount, 1));
  if (parsed.data.submit) {
    await prisma.assessmentCodingSubmission.create({ data: { attemptId: attempt.id, questionId: question.id, language: parsed.data.language, sourceCode: parsed.data.sourceCode, testResults: response.tests as Prisma.InputJsonValue, passedCount: response.passedCount, totalCount: response.totalCount, score } });
  }
  return jsonOk({ ...response, score, tests: response.tests.map(({ hidden: _hidden, expected: _expected, ...test }) => test) });
}