import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";
import { auditAndScorePortfolio } from "@/lib/analyzer/portfolio";

const portfolioSchema = z.object({
  url: z.string().url("A valid http or https URL is required"),
  targetRole: z.string().optional().default("Software Engineer"),
  targetJdText: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  if (!rateLimit(clientKey(request.headers, `analyzer-port-${user.id}`), 20, 60 * 60 * 1000)) {
    return jsonError(429, "RATE_LIMITED", "Analysis limit reached (20/hour). Please try again later.");
  }

  try {
    const json = await request.json().catch(() => ({}));
    const parsed = portfolioSchema.safeParse(json);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid payload");
    }

    const { url, targetRole, targetJdText } = parsed.data;

    // Run safe SSRF-guarded audit and scoring
    const result = await auditAndScorePortfolio(url, targetRole, targetJdText);

    // Save to AnalyzerResult
    const saved = await prisma.analyzerResult.create({
      data: {
        userId: user.id,
        type: "PORTFOLIO",
        subject: result.subject,
        targetRole,
        score: result.score,
        resultJson: result as any,
      },
    });

    await writeAudit(user.id, "analyzer.portfolio", {
      url,
      score: result.score,
    });

    return jsonOk({
      id: saved.id,
      result: { ...result, id: saved.id },
    });
  } catch (err: any) {
    console.error("[api/analyzer/portfolio] Error:", err);
    const msg = err.message || "Failed to audit portfolio";
    if (msg.includes("SSRF Blocked") || msg.includes("Access to private") || msg.includes("localhost")) {
      return jsonError(400, "SSRF_BLOCKED", msg);
    }
    return jsonError(500, "AUDIT_FAILED", msg);
  }
}
