import { calculateSkillGap, skillGapResponseSchema, type ResumeParsed, type JdParsed } from "@rehearse/shared";
import type { LlmProvider } from "./llm/types.js";
import { completeJson } from "./llm/json.js";
import { z } from "zod";

const narrativeSchema = z.object({ narrative: z.string().min(20).max(1200) });

export async function analyzeSkillGap(resume: ResumeParsed, jd: JdParsed, llm: LlmProvider | null) {
  const base = calculateSkillGap(resume.skills, jd.requiredSkills, jd.preferredSkills);
  if (!llm) return skillGapResponseSchema.parse(base);

  try {
    const extra = await completeJson(
      llm,
      narrativeSchema,
      `Write a concise interview-prep summary (3-6 sentences) for this skill gap.
Matched: ${base.matched.join(", ") || "none"}
Missing: ${base.missing.join(", ") || "none"}
Partial: ${base.partial.join(", ") || "none"}
Match score: ${base.matchScore}%
Role: ${jd.title ?? "unknown"}
Candidate summary: ${resume.summary ?? "n/a"}`,
    );
    return skillGapResponseSchema.parse({ ...base, narrative: extra.narrative });
  } catch {
    return skillGapResponseSchema.parse(base);
  }
}
