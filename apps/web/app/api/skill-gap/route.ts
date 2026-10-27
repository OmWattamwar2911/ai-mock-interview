import {
  calculateSkillGap,
  jdParsedSchema,
  resumeParsedSchema,
  skillGapResponseSchema,
  type SkillGapResponse,
} from "@rehearse/shared";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { callAiEngine } from "@/lib/services";
import { clientKey, rateLimit } from "@/lib/rate-limit";

// In-memory cache for computed skill gap results: cacheKey -> { result, timestamp }
const skillGapCache = new Map<string, { result: SkillGapResponse; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCacheKey(
  userId: string,
  resumeId: string,
  jdId: string,
  resumeSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[],
): string {
  const payload = `${userId}:${resumeId}:${jdId}:${resumeSkills.slice().sort().join(",")}:${requiredSkills.slice().sort().join(",")}:${preferredSkills.slice().sort().join(",")}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

const bodySchema = z.object({
  resumeId: z.string().min(1, "resumeId is required"),
  jdId: z.string().min(1, "jdId is required"),
  recalculate: z.boolean().optional(),
  resumeSkills: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  preferredSkills: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error;

  if (!rateLimit(clientKey(request.headers, "ai"), 30, 60_000)) {
    return jsonError(429, "RATE_LIMITED", "Too many requests. Please wait a moment before retrying.");
  }

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.errors[0]?.message ?? "resumeId and jdId are required";
    return jsonError(400, "VALIDATION_ERROR", issue);
  }

  const resume = await prisma.resume.findFirst({
    where: { id: parsed.data.resumeId, userId: user.id },
  });
  const jd = await prisma.jobDescription.findFirst({
    where: { id: parsed.data.jdId, userId: user.id },
  });

  if (!resume || !jd) {
    return jsonError(404, "NOT_FOUND", "Resume or job description not found");
  }

  const rawResumeParsed = resumeParsedSchema.safeParse(resume.parsed);
  const rawJdParsed = jdParsedSchema.safeParse(jd.parsed);

  const resumeSkills =
    parsed.data.resumeSkills ?? (rawResumeParsed.success ? rawResumeParsed.data.skills : []);
  const requiredSkills =
    parsed.data.requiredSkills ?? (rawJdParsed.success ? rawJdParsed.data.requiredSkills : []);
  const preferredSkills =
    parsed.data.preferredSkills ?? (rawJdParsed.success ? rawJdParsed.data.preferredSkills : []);

  const cacheKey = getCacheKey(
    user.id,
    resume.id,
    jd.id,
    resumeSkills,
    requiredSkills,
    preferredSkills,
  );

  // Return cached result if not requesting a fresh recalculation
  if (!parsed.data.recalculate) {
    const cached = skillGapCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return jsonOk({
        skillGap: cached.result,
        ...cached.result,
      });
    }
  }

  const resumePayload = {
    ...(rawResumeParsed.success
      ? rawResumeParsed.data
      : { skills: [], experience: [], education: [] }),
    skills: resumeSkills,
  };

  const jdPayload = {
    ...(rawJdParsed.success
      ? rawJdParsed.data
      : {
          title: jd.title,
          requiredSkills: [],
          preferredSkills: [],
          responsibilities: [],
          keywords: [],
        }),
    requiredSkills,
    preferredSkills,
  };

  let finalResult: SkillGapResponse;
  const errorId = `ERR-SG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    const aiEngineRes = await callAiEngine("/v1/skill-gap", {
      resume: resumePayload,
      jd: jdPayload,
    });
    finalResult = skillGapResponseSchema.parse(aiEngineRes);
  } catch (upstreamErr) {
    console.warn(
      `[skill-gap] [${errorId}] Upstream AI Engine call failed; falling back to in-process deterministic calculator:`,
      upstreamErr instanceof Error ? upstreamErr.message : upstreamErr,
    );
    // Reliable in-process fallback
    const fallback = calculateSkillGap(resumeSkills, requiredSkills, preferredSkills);
    finalResult = skillGapResponseSchema.parse({
      ...fallback,
      note: "AI summary unavailable, showing automatic matching",
    });
  }

  // Cache the valid result
  skillGapCache.set(cacheKey, { result: finalResult, timestamp: Date.now() });

  return jsonOk({
    skillGap: finalResult,
    ...finalResult,
  });
}
