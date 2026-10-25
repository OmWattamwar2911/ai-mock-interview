import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { calculateProfileStrength, type AnalyzerType } from "@/lib/analyzer/types";

export async function GET() {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  try {
    // 1. Fetch user's shared profile context
    const profileContext = await prisma.userProfileContext.findUnique({
      where: { userId: user.id },
    });

    // 2. Fetch latest AnalyzerResult per type
    const latestResults = await prisma.analyzerResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const latestScores: Partial<Record<AnalyzerType, { score: number; subject: string; date: string }>> = {};

    latestResults.forEach((r) => {
      const type = r.type as AnalyzerType;
      if (!latestScores[type]) {
        latestScores[type] = {
          score: r.score,
          subject: r.subject,
          date: r.createdAt.toISOString(),
        };
      }
    });

    // 3. If no RESUME AnalyzerResult exists yet, check if user has existing Resume with atsAnalysis
    if (!latestScores.RESUME) {
      const latestResume = await prisma.resume.findFirst({
        where: { userId: user.id, atsAnalysis: { not: Prisma.JsonNull } },
        orderBy: { createdAt: "desc" },
      });

      if (latestResume && latestResume.atsAnalysis) {
        const ats: any = latestResume.atsAnalysis;
        if (typeof ats.overallAtsScore === "number") {
          latestScores.RESUME = {
            score: ats.overallAtsScore,
            subject: latestResume.fileName,
            date: latestResume.createdAt.toISOString(),
          };
        }
      }
    }

    const strength = calculateProfileStrength(latestScores);

    return jsonOk({
      strength,
      context: {
        targetRole: profileContext?.targetRole || "Fullstack Engineer",
        jobDescriptionText: profileContext?.jobDescriptionText || "",
      },
    });
  } catch (err: any) {
    console.error("[profile-strength] Error:", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to compute profile strength");
  }
}
