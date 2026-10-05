import { jdParsedSchema, resumeParsedSchema, skillGapResponseSchema } from "@rehearse/shared";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { callAiEngine } from "@/lib/services";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  if (!rateLimit(clientKey(request.headers, "ai"), 20, 60_000)) {
    return jsonError(429, "RATE_LIMITED", "Too many AI requests");
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ resumeId: z.string(), jdId: z.string() }).safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "resumeId and jdId are required");
  }

  const resume = await prisma.resume.findFirst({
    where: { id: parsed.data.resumeId, userId: user.id },
  });
  const jd = await prisma.jobDescription.findFirst({
    where: { id: parsed.data.jdId, userId: user.id },
  });
  if (!resume || !jd) return jsonError(404, "NOT_FOUND", "Resume or job description not found");

  try {
    const result = await callAiEngine("/v1/skill-gap", {
      resume: resumeParsedSchema.parse(resume.parsed),
      jd: jdParsedSchema.parse(jd.parsed),
    });
    return jsonOk(skillGapResponseSchema.parse(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Skill-gap analysis failed";
    return jsonError(502, "UPSTREAM_ERROR", message);
  }
}
