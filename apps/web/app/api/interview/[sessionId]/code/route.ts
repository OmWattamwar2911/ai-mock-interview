import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { callCompiler } from "@/lib/services";

const runCodeSchema = z.object({
  language: z.enum(["python", "javascript", "java", "cpp", "c"]),
  sourceCode: z.string().min(1).max(100_000),
  submit: z.boolean().default(false),
  customInput: z.string().max(50_000).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } }
) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  const session = await prisma.interviewSession.findFirst({
    where: { id: params.sessionId, userId: user.id },
    select: {
      id: true,
      codingProblem: true,
      activeCode: true,
      status: true,
    },
  });

  if (!session) {
    return jsonError(404, "NOT_FOUND", "Interview session not found.");
  }

  const problem = (session.codingProblem as any) || null;

  // Mask hidden test cases
  let sanitizedProblem = null;
  if (problem) {
    const rawTests = Array.isArray(problem.testCases) ? problem.testCases : [];
    const sanitizedTests = rawTests.map((t: any, idx: number) => {
      if (t.hidden) {
        return {
          id: `hidden-${idx}`,
          hidden: true,
          input: "Hidden test case",
          expected: "Hidden output",
        };
      }
      return {
        id: `sample-${idx}`,
        hidden: false,
        input: String(t.input ?? ""),
        expected: String(t.expected ?? ""),
      };
    });

    sanitizedProblem = {
      id: problem.id || "prob_two_sum_001",
      title: problem.title || "Two Sum",
      statement: problem.statement || "",
      constraints: problem.constraints || "",
      examples: problem.examples || [],
      difficulty: problem.difficulty || "MEDIUM",
      topicTags: problem.topicTags || [],
      language: problem.language || "python",
      starterCode: problem.starterCode || {},
      testCases: sanitizedTests,
      // Private fields stripped from client browser:
      // referenceSolution, expectedComplexity, commonMistakes, hints
    };
  }

  return jsonOk({
    problem: sanitizedProblem,
    activeCode: session.activeCode,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  const body = await request.json().catch(() => null);
  const parsed = runCodeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "language and sourceCode are required.");
  }

  const session = await prisma.interviewSession.findFirst({
    where: { id: params.sessionId, userId: user.id },
  });

  if (!session) {
    return jsonError(404, "NOT_FOUND", "Interview session not found.");
  }

  const codingProblem = (session.codingProblem as any) || null;
  const rawTests: Array<{ input: string; expected: string; hidden?: boolean }> =
    codingProblem && Array.isArray(codingProblem.testCases)
      ? codingProblem.testCases
      : [
          { input: "4 9 2 7 11 15", expected: "0 1", hidden: false },
          { input: "3 6 3 2 4", expected: "0 2", hidden: false },
          { input: "2 6 3 3", expected: "0 1", hidden: false },
          { input: "5 0 -1 0 1 2 3", expected: "0 1", hidden: true },
          { input: "4 8 1 4 5 3", expected: "1 3", hidden: true },
        ];

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

      // Sync active draft code
      await prisma.interviewSession.update({
        where: { id: session.id },
        data: {
          activeCode: {
            language: parsed.data.language,
            sourceCode: parsed.data.sourceCode,
            lastStatus: execResult.status,
            lastRunAt: new Date().toISOString(),
          },
        },
      });

      return jsonOk({
        status: execResult.status,
        stdout: execResult.stdout,
        stderr: execResult.stderr,
        timeMs: execResult.timeMs,
        compileError: execResult.compileError,
        isCustom: true,
      });
    }

    // Determine tests to run: if submit, run all; if run sample, run non-hidden
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

    // Sanitize tests so hidden test cases don't leak secrets
    const sanitizedResults = runResult.tests.map((t) => {
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

    // Update activeCode on the session so the LiveKit bot can immediately inspect it
    const activeCodeSnapshot = {
      language: parsed.data.language,
      sourceCode: parsed.data.sourceCode,
      lastStatus: runResult.status,
      passedCount: runResult.passedCount,
      totalCount: runResult.totalCount,
      lastRunAt: new Date().toISOString(),
      isSubmitted: parsed.data.submit,
    };

    await prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        activeCode: activeCodeSnapshot,
      },
    });

    return jsonOk({
      status: runResult.status,
      passedCount: runResult.passedCount,
      totalCount: runResult.totalCount,
      tests: sanitizedResults,
      isFinal: parsed.data.submit,
    });
  } catch (err: any) {
    console.error("[api/interview/code] Compiler error:", err);
    return jsonError(502, "COMPILER_ERROR", `Code execution error: ${err.message}`);
  }
}
