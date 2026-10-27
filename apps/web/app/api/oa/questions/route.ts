import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  const { error } = await requireUser();
  if (error) return error;

  const url = new URL(request.url);
  const company = url.searchParams.get("company");
  const role = url.searchParams.get("role");
  const difficulty = url.searchParams.get("difficulty");

  const whereClause: Prisma.QuestionWhereInput = {
    source: "BANK",
    type: "CODING",
    isActive: true,
    deletedAt: null,
    title: { not: null },
  };

  if (company && company !== "ALL") {
    whereClause.companyTags = { has: company };
  }
  if (role && role !== "ALL") {
    whereClause.roleTags = { has: role };
  }
  if (difficulty && difficulty !== "ALL") {
    whereClause.difficulty = difficulty as any;
  }

  try {
    const questions = await prisma.question.findMany({
      where: whereClause,
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
      orderBy: { createdAt: "asc" },
    });

    // Strictly validate and sanitize test cases so hidden tests are never exposed in list/details
    const sanitizedQuestions = questions
      .filter((q) => {
        if (!q.title || q.title.trim().length < 3) return false;
        if (!q.text || q.text.trim().length < 10) return false;
        const starters = q.starterCode && typeof q.starterCode === "object" ? Object.keys(q.starterCode as object) : [];
        if (starters.length === 0) return false;
        const rawTests = Array.isArray(q.testCases) ? (q.testCases as any[]) : [];
        if (rawTests.length === 0) return false;
        if (!rawTests.some((t) => !t.hidden)) return false;
        return true;
      })
      .map((q) => {
        const rawTests = Array.isArray(q.testCases) ? (q.testCases as any[]) : [];
        const visibleTests = rawTests
          .filter((t) => !t.hidden)
          .map((t, idx) => ({
            id: `sample-${idx}`,
            input: String(t.input ?? ""),
            expected: String(t.expected ?? ""),
            hidden: false,
          }));

        return {
          ...q,
          testCases: visibleTests,
          totalTestCount: rawTests.length,
          hiddenTestCount: rawTests.filter((t) => t.hidden).length,
        };
      });

    return jsonOk({ questions: sanitizedQuestions });
  } catch (err: any) {
    console.error("[api/oa/questions] Failed to fetch questions:", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to retrieve OA questions.");
  }
}
