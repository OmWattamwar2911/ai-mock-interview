import {
  extractSkillsFromText,
  resumeParsedSchema,
  type ResumeParsed,
} from "@rehearse/shared";
import type { LlmProvider } from "./llm/types.js";
import { completeJson } from "./llm/json.js";

function mergeSkills(fromText: string, fromLlm: string[]): string[] {
  const taxonomy = extractSkillsFromText(fromText).matchedIds;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const skill of [...taxonomy, ...fromLlm]) {
    const key = skill.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(skill.trim());
  }
  return out;
}

export async function parseResumeDocument(text: string, llm: LlmProvider | null): Promise<ResumeParsed> {
  const taxonomySkills = extractSkillsFromText(text).matchedIds;
  const fallback: ResumeParsed = resumeParsedSchema.parse({
    skills: taxonomySkills,
    experience: [],
    education: [],
    projects: [],
    summary: text.slice(0, 400),
  });
  if (!llm) return fallback;

  try {
    const llmParsed = await completeJson(
      llm,
      resumeParsedSchema,
      `Extract a structured resume from this text. Use short skill names (e.g. React, PostgreSQL).
Experience items: company, title, start, end, bullets.
Education items: school, degree, year.
Projects: name, summary, skills.

Resume text:
${text.slice(0, 24_000)}`,
    );
    return resumeParsedSchema.parse({
      ...llmParsed,
      skills: mergeSkills(text, llmParsed.skills ?? []),
      summary: llmParsed.summary || fallback.summary,
    });
  } catch {
    return fallback;
  }
}
