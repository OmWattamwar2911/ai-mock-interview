import { extractSkillsFromText, jdParsedSchema, type JdParsed } from "@rehearse/shared";
import type { LlmProvider } from "./llm/types.js";
import { completeJson } from "./llm/json.js";

export async function parseJdDocument(text: string, llm: LlmProvider | null): Promise<JdParsed> {
  const skills = extractSkillsFromText(text).matchedIds;
  const fallback: JdParsed = jdParsedSchema.parse({
    requiredSkills: skills,
    preferredSkills: [],
    keywords: skills.slice(0, 12),
    title: undefined,
    responsibilities: [],
  });
  if (!llm) return fallback;

  try {
    const llmParsed = await completeJson(
      llm,
      jdParsedSchema,
      `Extract a structured job description. Split must-have vs nice-to-have skills.
Return requiredSkills, preferredSkills, keywords, seniority, title, responsibilities.

Job description:
${text.slice(0, 24_000)}`,
    );
    const reqSkills = llmParsed.requiredSkills ?? [];
    const kwds = llmParsed.keywords ?? [];
    const required = reqSkills.length ? reqSkills : skills;
    return jdParsedSchema.parse({
      ...llmParsed,
      requiredSkills: required,
      preferredSkills: llmParsed.preferredSkills ?? [],
      keywords: kwds.length ? kwds : skills.slice(0, 12),
    });
  } catch {
    return fallback;
  }
}
