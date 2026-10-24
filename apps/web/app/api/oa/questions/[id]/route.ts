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
        text: true,
        difficulty: true,
        skillTags: true,
        companyTags: true,
        roleTags: true,
        constraints: true,
        examples: true,
        starterCode: true,
        testCases: true,
        createdAt: true,
      },
    });

    if (!question) {
      return jsonError(404, "NOT_FOUND", "Question not found.");
    }

    const rawTests = Array.isArray(question.testCases) ? (question.testCases as any[]) : [];
    const visibleTests = rawTests
      .filter((t) => !t.hidden)
      .map((t, idx) => ({
        id: `sample-${idx}`,
        input: String(t.input ?? ""),
        expected: String(t.expected ?? ""),
        hidden: false,
      }));

    return jsonOk({
      question: {
        ...question,
        testCases: visibleTests,
        totalTestCount: rawTests.length,
        hiddenTestCount: rawTests.filter((t) => t.hidden).length,
      },
    });
  } catch (err: any) {
    console.error("[api/oa/questions/[id]] Failed to fetch question:", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to retrieve question details.");
  }
}
