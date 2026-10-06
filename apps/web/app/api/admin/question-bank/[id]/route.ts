import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

const updateSchema = z.object({ text: z.string().min(5).optional(), options: z.array(z.string()).optional(), correctAnswer: z.union([z.string(), z.number(), z.array(z.string())]).optional(), marks: z.number().int().positive().optional(), topic: z.string().min(1).optional(), difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(), constraints: z.string().optional(), examples: z.unknown().optional(), starterCode: z.record(z.string()).optional(), testCases: z.array(z.object({ input: z.string(), expected: z.string(), hidden: z.boolean().default(false) })).optional(), referenceSolution: z.record(z.string()).optional() });

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Invalid question update");
  const data = parsed.data;
  const updateData = { ...data } as unknown as Parameters<typeof prisma.assessmentBankQuestion.update>[0]["data"];
  const question = await prisma.assessmentBankQuestion.update({ where: { id: context.params.id }, data: updateData });
  return jsonOk({ question: { ...question, correctAnswer: undefined, referenceSolution: undefined } });
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;
  await prisma.assessmentBankQuestion.update({ where: { id: context.params.id }, data: { deletedAt: new Date() } });
  return jsonOk({ deleted: true });
}