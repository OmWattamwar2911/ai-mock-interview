import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireUser();
  if (error) return error;

  try {
    const question = await prisma.question.findFirst({
      where: { id: params.id, source: "BANK", deletedAt: null },
      select: {
        id: true,
        title: true,
        referenceSolution: true,
      },
    });

    if (!question) {
      return jsonError(404, "NOT_FOUND", "Question not found.");
    }

    return jsonOk({
      id: question.id,
      title: question.title,
      referenceSolution: question.referenceSolution ?? {},
    });
  } catch (err: any) {
    console.error("[api/oa/questions/[id]/solution] Error:", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to retrieve reference solution.");
  }
}
