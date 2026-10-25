import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";
import {
  CODING_PROVIDERS,
  scoreCodingProfile,
  type CodingProfileStats,
} from "@/lib/analyzer/coding";

const codingSchema = z.object({
  platform: z.enum(["leetcode", "codeforces", "codechef", "hackerrank", "geeksforgeeks"]),
  handle: z.string().min(1, "Handle or username is required"),
  targetRole: z.string().optional().default("Software Engineer"),
  manualStats: z
    .object({
      totalSolved: z.number().min(0).optional(),
      easySolved: z.number().min(0).optional(),
      mediumSolved: z.number().min(0).optional(),
      hardSolved: z.number().min(0).optional(),
      rating: z.number().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  if (!rateLimit(clientKey(request.headers, `analyzer-code-${user.id}`), 20, 60 * 60 * 1000)) {
    return jsonError(429, "RATE_LIMITED", "Analysis limit reached (20/hour). Please try again later.");
  }

  try {
    const json = await request.json().catch(() => ({}));
    const parsed = codingSchema.safeParse(json);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid payload");
    }

    const { platform, handle, targetRole, manualStats } = parsed.data;
    const provider = CODING_PROVIDERS[platform];

    if (!provider) {
      return jsonError(400, "VALIDATION_ERROR", `Unsupported platform: ${platform}`);
    }

    if (!provider.validate(handle)) {
      return jsonError(400, "VALIDATION_ERROR", `Invalid username format for ${provider.label}.`);
    }

    let stats: CodingProfileStats;

    if (provider.isManual || manualStats?.totalSolved !== undefined) {
      const total = manualStats?.totalSolved || 0;
      const easy = manualStats?.easySolved || Math.round(total * 0.4);
      const med = manualStats?.mediumSolved || Math.round(total * 0.4);
      const hard = manualStats?.hardSolved || Math.max(0, total - easy - med);

      stats = {
        platform,
        handle: handle.trim(),
        totalSolved: total,
        easySolved: easy,
        mediumSolved: med,
        hardSolved: hard,
        rating: manualStats?.rating,
        topicCounts: {
          Arrays: Math.round(total * 0.35),
          Strings: Math.round(total * 0.25),
          Trees: Math.round(total * 0.15),
          DynamicProgramming: Math.round(total * 0.15),
          Graphs: Math.round(total * 0.1),
        },
        recentActivityDate: new Date().toISOString(),
      };
    } else {
      stats = await provider.fetch(handle);
    }

    // Score
    const result = scoreCodingProfile(stats, targetRole);

    // Save to AnalyzerResult
    const saved = await prisma.analyzerResult.create({
      data: {
        userId: user.id,
        type: "CODING",
        subject: result.subject,
        targetRole,
        score: result.score,
        resultJson: result as any,
      },
    });

    await writeAudit(user.id, "analyzer.coding", {
      platform,
      handle,
      score: result.score,
    });

    return jsonOk({
      id: saved.id,
      result: { ...result, id: saved.id },
      stats,
    });
  } catch (err: any) {
    console.error("[api/analyzer/coding] Error:", err);
    return jsonError(500, "ANALYSIS_FAILED", err.message || "Failed to analyze coding profile");
  }
}
