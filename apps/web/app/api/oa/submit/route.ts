import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { callCompiler } from "@/lib/services";

const submitSchema = z.object({
  questionId: z.string().min(1),
  language: z.enum(["python", "javascript", "java", "cpp", "c"]),
  sourceCode: z.string().min(1).max(100_000),
  submit: z.boolean().default(false),
  customInput: z.string().max(50_000).optional(),
});

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  const body = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "questionId, language, and sourceCode are required.");
  }

  const question = await prisma.question.findFirst({
    where: { id: parsed.data.questionId, source: "BANK", deletedAt: null },
  });

  if (!question) {
    return jsonError(404, "NOT_FOUND", "Question not found.");
  }

  const rawTests: Array<{ input: string; expected: string; hidden?: boolean }> =
    Array.isArray(question.testCases) ? (question.testCases as any[]) : [];

  try {
    // If running with custom stdin
    if (parsed.data.customInput !== undefined && !parsed.data.submit) {
      const execResult = (await callCompiler("/v1/execute", {
        language: parsed.data.language,
        source: parsed.data.sourceCode,
        stdin: parsed.data.customInput,
        limits: { cpuTimeSec: 2, memoryKb: 128_000 },
      })) as {
        status: string;
        stdout: string;
        stderr: string;
        timeMs: number;
        compileError: string | null;
      };

      return jsonOk({
        status: execResult.status,
        stdout: execResult.stdout,
        stderr: execResult.stderr,
        timeMs: execResult.timeMs,
        compileError: execResult.compileError,
        isCustom: true,
      });
    }

    // Determine tests to run: if submit, run all tests; if run sample, run only visible tests
    const testsToRun = parsed.data.submit
      ? rawTests
      : rawTests.filter((t) => !t.hidden);

    const compilerPayload = {
      language: parsed.data.language,
      source: parsed.data.sourceCode,
      tests: testsToRun.map((t) => ({
        input: String(t.input ?? ""),
        expected: String(t.expected ?? ""),
        hidden: Boolean(t.hidden),
      })),
      limits: { cpuTimeSec: 2, memoryKb: 128_000 },
    };

    const runResult = (await callCompiler("/v1/run-tests", compilerPayload)) as {
      status: string;
      passedCount: number;
      totalCount: number;
      tests: Array<{
        hidden?: boolean;
        passed: boolean;
        status: string;
        stdout: string;
        stderr: string;
        timeMs: number;
        expected: string;
        input: string;
      }>;
    };

    // Mask hidden tests so secrets/test cases don't leak
    const sanitizedTests = runResult.tests.map((t) => {
      if (t.hidden) {
        return {
          hidden: true,
          passed: t.passed,
          status: t.status,
          stdout: t.stdout,
          stderr: t.stderr,
          timeMs: t.timeMs,
          input: "[Hidden Test Input]",
          expected: "[Hidden Expected Output]",
        };
      }
      return t;
    });

    let submissionRecord = null;
    const score =
      runResult.totalCount > 0
        ? Math.round((runResult.passedCount / runResult.totalCount) * 100)
        : 0;
    const finalStatus =
      runResult.passedCount === runResult.totalCount ? "ACCEPTED" : "WRONG_ANSWER";

    if (parsed.data.submit) {
      submissionRecord = await prisma.oaSubmission.create({
        data: {
          userId: user.id,
          questionId: question.id,
          language: parsed.data.language,
          sourceCode: parsed.data.sourceCode,
          testResults: sanitizedTests,
          passedCount: runResult.passedCount,
          totalCount: runResult.totalCount,
          score,
          status: finalStatus,
        },
      });
    }

    return jsonOk({
      submissionId: submissionRecord?.id ?? null,
      status: parsed.data.submit ? finalStatus : runResult.status,
      passedCount: runResult.passedCount,
      totalCount: runResult.totalCount,
      score,
      tests: sanitizedTests,
      isFinal: parsed.data.submit,
    });
  } catch (err: any) {
    console.error("[api/oa/submit] Compiler error:", err);
    return jsonError(502, "COMPILER_ERROR", `Code runner error: ${err.message}`);
  }
}
