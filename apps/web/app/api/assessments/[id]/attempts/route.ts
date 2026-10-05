import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";

export async function POST(request: Request, context: { params: { id: string } }) {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  const body = z.object({}).safeParse(await request.json().catch(() => ({})));
  if (!body.success) return jsonError(400, "VALIDATION_ERROR", "Invalid attempt payload");
  const assessment = await prisma.assessment.findFirst({ where: { id: context.params.id, userId: user.id }, include: { sections: { orderBy: { orderIndex: "asc" }, include: { questions: { orderBy: { orderIndex: "asc" } }, coding: { orderBy: { orderIndex: "asc" } } } } } });
  if (!assessment) return jsonError(404, "NOT_FOUND", "Assessment not found");
  const attempt = await prisma.assessmentAttempt.create({ data: { assessmentId: assessment.id, userId: user.id, answers: {} } });
  await prisma.assessment.update({ where: { id: assessment.id }, data: { status: "IN_PROGRESS" } });
  return jsonOk({ attempt: { id: attempt.id, assessmentId: assessment.id, startedAt: attempt.startedAt }, assessment: { ...assessment, sections: assessment.sections.map((section) => ({ ...section, questions: section.questions.map(({ correctAnswer: _correctAnswer, ...question }) => question), coding: section.coding.map(({ referenceSolution: _referenceSolution, testCases, ...question }) => ({ ...question, testCases: Array.isArray(testCases) ? testCases.filter((test) => typeof test === "object" && test !== null && !Array.isArray(test) && (test as { hidden?: boolean }).hidden !== true) : [] })) })) } });
}