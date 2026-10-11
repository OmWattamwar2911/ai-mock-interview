import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { callAiEngine } from "@/lib/services";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jdParsedSchema, resumeParsedSchema } from "@rehearse/shared";

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error;

  if (!rateLimit(clientKey(request.headers, "create-session"), 10, 60_000)) {
    return jsonError(429, "RATE_LIMITED", "Too many requests");
  }

  // --- 1. Fetch candidate documents ---
  let resume: Awaited<ReturnType<typeof prisma.resume.findFirst>>;
  let jd: Awaited<ReturnType<typeof prisma.jobDescription.findFirst>>;
  try {
    [resume, jd] = await Promise.all([
      prisma.resume.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      prisma.jobDescription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    ]);
  } catch (err: any) {
    const msg = err?.message ?? "Unknown DB error";
    console.error("[session] DB lookup failed:", msg);
    return jsonError(503, "DB_UNAVAILABLE", `Database is unreachable. Please check that the database server is running. (${msg})`);
  }

  if (!resume || !jd) {
    return jsonError(400, "BAD_REQUEST", "Please upload a resume and job description first.");
  }

  // --- 2. Compute skill gap ---
  let skillGapRes: unknown;
  try {
    const resumeP = resumeParsedSchema.parse(resume.parsed);
    const jdP = jdParsedSchema.parse(jd.parsed);
    skillGapRes = await callAiEngine("/v1/skill-gap", { resume: resumeP, jd: jdP });
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    console.error("[session] skill-gap failed:", msg);
    return jsonError(502, "SKILL_GAP_FAILED", `Skill-gap analysis failed: ${msg}. Make sure the AI engine is running and GEMINI_API_KEY (or equivalent) is set.`);
  }

  // --- 3. Generate interview questions ---
  let questions: string[];
  try {
    const resumeP = resumeParsedSchema.parse(resume.parsed);
    const jdP = jdParsedSchema.parse(jd.parsed);
    const genRes = (await callAiEngine("/v1/interview/generate", {
      resume: resumeP,
      jd: jdP,
      skillGap: skillGapRes,
    })) as any;
    questions = genRes?.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("The AI engine returned an empty question list. Check if your LLM API key is valid and has quota.");
    }
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    console.error("[session] question generation failed:", msg);
    return jsonError(502, "GENERATION_FAILED", `Question generation failed: ${msg}`);
  }

  // --- 4. Persist the session to DB ---
  try {
    const session = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        resumeId: resume.id,
        jdId: jd.id,
        status: "CREATED",
        config: {},
        skillGap: skillGapRes as any,
        questions: {
          create: questions.map((q, idx) => ({
            orderIndex: idx,
            timeLimitSec: 120,
            snapshot: { text: q },
          })),
        },
      },
      include: { questions: true },
    });

    return jsonOk({ sessionId: session.id, questions });
  } catch (err: any) {
    const msg = err?.message ?? "Unknown DB error";
    console.error("[session] Prisma create failed:", msg);
    return jsonError(500, "DB_WRITE_FAILED", `Failed to save interview session to database: ${msg}`);
  }
}
