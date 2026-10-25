import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";
import { fetchGitHubProfile, scoreGitHubProfile, normalizeGitHubUsername } from "@/lib/analyzer/github";

const githubSchema = z.object({
  username: z.string().min(1, "GitHub username or profile URL is required"),
  targetRole: z.string().optional().default("Software Engineer"),
  targetJdText: z.string().optional().default(""),
  githubToken: z.string().optional(),
});

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  if (!rateLimit(clientKey(request.headers, `analyzer-gh-${user.id}`), 20, 60 * 60 * 1000)) {
    return jsonError(429, "RATE_LIMITED", "Analysis limit reached (20/hour). Please try again later.");
  }

  try {
    const json = await request.json().catch(() => ({}));
    const parsed = githubSchema.safeParse(json);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid payload");
    }

    const { username, targetRole, targetJdText, githubToken } = parsed.data;
    const cleanUser = normalizeGitHubUsername(username);

    if (!cleanUser) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid GitHub username or URL provided.");
    }

    // Fetch GitHub Profile and repositories (with fallback if rate limit active)
    const collectedData = await fetchGitHubProfile(cleanUser, githubToken);

    // Score
    const result = scoreGitHubProfile(collectedData, targetRole, targetJdText);

    // Save to AnalyzerResult
    const saved = await prisma.analyzerResult.create({
      data: {
        userId: user.id,
        type: "GITHUB",
        subject: result.subject,
        targetRole,
        score: result.score,
        resultJson: result as any,
      },
    });

    await writeAudit(user.id, "analyzer.github", {
      username: cleanUser,
      score: result.score,
    });

    return jsonOk({
      id: saved.id,
      result: { ...result, id: saved.id },
      data: collectedData,
    });
  } catch (err: any) {
    console.error("[api/analyzer/github] Error:", err);
    const msg = err.message || "Failed to analyze GitHub profile";
    if (msg.includes("rate limit")) {
      return jsonError(429, "RATE_LIMITED", msg);
    }
    if (msg.includes("not found")) {
      return jsonError(404, "NOT_FOUND", msg);
    }
    return jsonError(500, "ANALYSIS_FAILED", msg);
  }
}
