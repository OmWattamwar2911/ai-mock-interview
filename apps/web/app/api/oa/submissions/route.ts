import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  const url = new URL(request.url);
  const questionId = url.searchParams.get("questionId");

  try {
    const whereClause: any = {
      userId: user.id,
    };
    if (questionId) {
      whereClause.questionId = questionId;
    }

    const submissions = await prisma.oaSubmission.findMany({
      where: whereClause,
      include: {
        question: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            companyTags: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return jsonOk({ submissions });
  } catch (err: any) {
    console.error("[api/oa/submissions] Error:", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to retrieve submissions.");
  }
}
