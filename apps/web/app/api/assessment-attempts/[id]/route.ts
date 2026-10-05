import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";

const submitSchema = z.object({ answers: z.record(z.union([z.string(), z.number(), z.array(z.string())])).default({}), autoSubmitted: z.boolean().default(false) });

function equalAnswer(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(actual) && Array.isArray(expected)) return [...actual].sort().join("\u0000") === [...expected].sort().join("\u0000");
  return String(actual) === String(expected);
}

export async function GET(_request: Request, context: { params: { id: string } }) {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  const attempt = await prisma.assessmentAttempt.findFirst({ where: { id: context.params.id, userId: user.id }, include: { assessment: { include: { sections: { orderBy: { orderIndex: "asc" }, include: { questions: { orderBy: { orderIndex: "asc" } }, coding: { orderBy: { orderIndex: "asc" } } } } } }, submissions: true } });
  if (!attempt) return jsonError(404, "NOT_FOUND", "Assessment attempt not found");
  const assessment = {
    ...attempt.assessment,
    sections: attempt.assessment.sections.map((section) => ({
      ...section,
      questions: section.questions.map(({ correctAnswer: _correctAnswer, ...question }) => question),
      coding: section.coding.map(({ referenceSolution: _referenceSolution, testCases, ...question }) => ({
        ...question,
        testCases: Array.isArray(testCases)
          ? testCases.filter((test) => typeof test === "object" && test !== null && !Array.isArray(test) && (test as { hidden?: boolean }).hidden !== true)
          : [],
      })),
    })),
  };
  return jsonOk({ attempt: { ...attempt, assessment } });
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  const parsed = submitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "answers are required");
  const attempt = await prisma.assessmentAttempt.findFirst({ where: { id: context.params.id, userId: user.id, submittedAt: null }, include: { assessment: { include: { sections: { include: { questions: true } } } }, submissions: true } });
  if (!attempt) return jsonError(404, "NOT_FOUND", "Open assessment attempt not found");
  const mcqs = attempt.assessment.sections.flatMap((section) => section.questions);
  const mcqMarks = mcqs.reduce((total, question) => total + (equalAnswer(parsed.data.answers[question.id], question.correctAnswer) ? question.marks : 0), 0);
  const codingMarks = attempt.submissions.reduce((total, submission) => total + submission.score, 0);
  const score = mcqMarks + codingMarks;
  await prisma.$transaction([
    prisma.assessmentAttempt.update({ where: { id: attempt.id }, data: { answers: parsed.data.answers as Prisma.InputJsonValue, score, submittedAt: new Date(), autoSubmitted: parsed.data.autoSubmitted } }),
    prisma.assessmentAnswer.deleteMany({ where: { attemptId: attempt.id } }),
    prisma.assessmentAnswer.createMany({ data: mcqs.map((question) => ({ attemptId: attempt.id, questionId: question.id, selected: (parsed.data.answers[question.id] ?? null) as Prisma.InputJsonValue, isCorrect: equalAnswer(parsed.data.answers[question.id], question.correctAnswer), marks: equalAnswer(parsed.data.answers[question.id], question.correctAnswer) ? question.marks : 0 })) }),
    prisma.assessment.update({ where: { id: attempt.assessmentId }, data: { status: "COMPLETED" } }),
  ]);
  return jsonOk({ score, totalMarks: attempt.assessment.totalMarks, mcqMarks, codingMarks, autoSubmitted: parsed.data.autoSubmitted });
}