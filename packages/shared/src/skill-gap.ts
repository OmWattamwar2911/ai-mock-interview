import { matchSkillInTaxonomy, extractSkillsFromText } from "./taxonomy";

export interface SkillGapResult {
  matched: string[];
  missing: string[];
  partial: string[];
  matchScore: number;
  narrative: string;
}

function canonicalName(raw: string): string {
  const match = matchSkillInTaxonomy(raw);
  return match ? match.name : raw.trim();
}

function canonicalKey(raw: string): string {
  const match = matchSkillInTaxonomy(raw);
  if (match) return match.id;
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = canonicalKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(canonicalName(value));
  }
  return out;
}

function related(a: string, b: string): boolean {
  const left = matchSkillInTaxonomy(a);
  const right = matchSkillInTaxonomy(b);
  if (left && right && left.category === right.category && left.id !== right.id) {
    const aTokens = new Set(left.name.toLowerCase().split(/\s+/));
    const bTokens = right.name.toLowerCase().split(/\s+/);
    return bTokens.some((t) => t.length > 3 && aTokens.has(t));
  }
  const na = canonicalKey(a);
  const nb = canonicalKey(b);
  if (na.length < 4 || nb.length < 4) return false;
  return na.includes(nb) || nb.includes(na);
}

export function calculateSkillGap(
  candidateSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[] = [],
): SkillGapResult {
  const candidateKeys = new Set(candidateSkills.map(canonicalKey));
  const candidateNames = uniqueNames(candidateSkills);

  const matched: string[] = [];
  const missing: string[] = [];
  const partial: string[] = [];

  for (const req of requiredSkills) {
    const key = canonicalKey(req);
    if (candidateKeys.has(key)) {
      matched.push(canonicalName(req));
      continue;
    }
    const fuzzy = candidateNames.some((c) => related(c, req));
    if (fuzzy) partial.push(canonicalName(req));
    else missing.push(canonicalName(req));
  }

  for (const pref of preferredSkills) {
    const key = canonicalKey(pref);
    const name = canonicalName(pref);
    if (candidateKeys.has(key) && !matched.includes(name) && !partial.includes(name)) {
      partial.push(name);
    }
  }

  const denom = requiredSkills.length;
  const matchScore = denom > 0 ? Math.round((matched.length / denom) * 100) : 100;

  return {
    matched: uniqueNames(matched),
    missing: uniqueNames(missing),
    partial: uniqueNames(partial),
    matchScore,
    narrative: `You match ${matched.length} of ${denom || 0} required skills (${matchScore}%).`,
  };
}

export function skillGapFromText(resumeText: string, jdText: string): SkillGapResult {
  const { matchedIds: candidateSkills } = extractSkillsFromText(resumeText);
  const { matchedIds: jdSkills } = extractSkillsFromText(jdText);
  return calculateSkillGap(candidateSkills, jdSkills);
}
