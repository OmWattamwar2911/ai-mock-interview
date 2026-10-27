import { calculateSkillGap, skillGapResponseSchema, type ResumeParsed, type JdParsed } from "@rehearse/shared";
import type { LlmProvider } from "./llm/types.js";
import { completeJson } from "./llm/json.js";
import { z } from "zod";

const narrativeSchema = z.object({
  narrative: z.string().min(10).max(1500),
});

export async function analyzeSkillGap(
  resume: ResumeParsed,
  jd: JdParsed,
  llm: LlmProvider | null,
) {
  const base = calculateSkillGap(
    resume.skills || [],
    jd.requiredSkills || [],
    jd.preferredSkills || [],
  );

  if (!llm) {
    return skillGapResponseSchema.parse({
      ...base,
      note: "AI summary unavailable, showing automatic matching",
    });
  }

  // 10-second timeout guard
  const timeoutMs = 10_000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("LLM completion timed out after 10s")), timeoutMs),
  );

  const prompt = `You are an expert technical interviewer evaluating candidate-job alignment.
Write a concise, professional interview-prep summary (3 to 5 sentences) analyzing this skill gap.

Target Role: ${jd.title ?? "Software Engineer"}
Candidate Summary: ${resume.summary ?? "n/a"}
Matched Skills: ${base.matched.join(", ") || "None"}
Partial / Adjacent Skills: ${base.partial.join(", ") || "None"}
Missing Required Skills: ${base.missing.join(", ") || "None"}
Calculated Match Score: ${base.matchScore}%

Respond with valid JSON using the EXACT field name "narrative":
{
  "narrative": "Concise 3-5 sentence interview prep assessment focusing on strengths and learning opportunities."
}`;

  try {
    const extra = await Promise.race([
      completeJson(llm, narrativeSchema, prompt, { retries: 1, minTimeout: 800 }),
      timeoutPromise,
    ]);

    return skillGapResponseSchema.parse({
      ...base,
      narrative: extra.narrative.trim(),
    });
  } catch (err) {
    console.warn("[analyzeSkillGap] LLM call failed or timed out, using rule-based fallback:", err instanceof Error ? err.message : err);
    return skillGapResponseSchema.parse({
      ...base,
      note: "AI summary unavailable, showing automatic matching",
    });
  }
}
