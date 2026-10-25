import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  try {
    const existing = await prisma.analyzerResult.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Analysis record not found");
    }

    await prisma.analyzerResult.delete({
      where: { id: params.id },
    });

    return jsonOk({ success: true, deletedId: params.id });
  } catch (err: any) {
    console.error("[analyzer/history/delete] Error:", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to delete analysis record");
  }
}
