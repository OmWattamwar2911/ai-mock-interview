import { matchSkillInTaxonomy, extractSkillsFromText, SKILLS_TAXONOMY, type SkillDefinition } from "./taxonomy";

export interface SkillGapResult {
  matched: string[];
  missing: string[];
  partial: string[];
  matchScore: number;
  narrative: string;
  extraSkills: string[];
  note?: string;
}

/**
 * Standard abbreviation and synonym dictionary for technical skills.
 */
const COMMON_SYNONYMS: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  node: "node.js",
  nodejs: "node.js",
  "node.js": "node.js",
  k8s: "kubernetes",
  kube: "kubernetes",
  kubernetes: "kubernetes",
  postgres: "postgresql",
  pgsql: "postgresql",
  postgresql: "postgresql",
  ml: "machine learning",
  "machine learning": "machine learning",
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "next.js",
  nextjs: "next.js",
  "vue.js": "vue.js",
  vuejs: "vue.js",
  vue: "vue.js",
  "express.js": "express.js",
  expressjs: "express.js",
  express: "express.js",
  py: "python",
  python3: "python",
  python: "python",
  golang: "go",
  go: "go",
  cpp: "c++",
  "c plus plus": "c++",
  "c++": "c++",
  csharp: "c#",
  "c-sharp": "c#",
  "c#": "c#",
  aws: "amazon web services",
  gcp: "google cloud platform",
  k8: "kubernetes",
  nosql: "nosql databases",
  mongo: "mongodb",
  mongodb: "mongodb",
  es6: "javascript",
  ecmascript: "javascript",
};

/**
 * Related skill families for partial match identification.
 * If required skill is X, but candidate possesses Y, it counts as a partial match.
 */
const RELATED_FAMILIES: Array<Set<string>> = [
  // Relational Databases
  new Set(["postgresql", "mysql", "mariadb", "sqlite", "sql server", "oracle"]),
  // Document / NoSQL Databases
  new Set(["mongodb", "dynamodb", "couchbase", "documentdb", "firestore"]),
  // In-Memory / Caches
  new Set(["redis", "memcached", "aerospike"]),
  // Node.js Web Frameworks
  new Set(["node.js", "express.js", "fastify", "nestjs", "koa"]),
  // Python Web Frameworks
  new Set(["python", "django", "fastapi", "flask"]),
  // Frontend UI Frameworks
  new Set(["react", "vue.js", "angular", "svelte", "solid.js"]),
  // Message Brokers / Event Streaming
  new Set(["apache kafka", "rabbitmq", "pulsar", "aws sqs", "redis"]),
  // Containers & Orchestration
  new Set(["docker", "kubernetes", "podman", "containerd", "helm"]),
  // Cloud Providers
  new Set(["amazon web services", "google cloud platform", "microsoft azure"]),
  // Testing Frameworks
  new Set(["jest", "vitest", "mocha", "cypress", "playwright"]),
  // CSS Frameworks
  new Set(["tailwind css", "bootstrap", "sass", "styled-components"]),
];

/**
 * Normalizes a raw skill string:
 * - strips surrounding punctuation and extra whitespace
 * - lowercases
 * - expands common synonyms and abbreviations
 */
export function normalizeSkill(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^[\s.,;:()\[\]{}"'—–-]+|[\s.,;:()\[\]{}"'—–-]+$/g, "")
    .replace(/\s+/g, " ");

  // Check direct synonym table
  if (COMMON_SYNONYMS[cleaned]) {
    cleaned = COMMON_SYNONYMS[cleaned];
  }

  return cleaned;
}

/**
 * Retrieves the canonical display name for a skill.
 */
function canonicalName(raw: string): string {
  const match = matchSkillInTaxonomy(raw);
  if (match) return match.name;

  const normalized = normalizeSkill(raw);
  if (COMMON_SYNONYMS[normalized]) {
    const synMatch = matchSkillInTaxonomy(COMMON_SYNONYMS[normalized]);
    if (synMatch) return synMatch.name;
  }

  // Capitalize properly if raw text was all lower
  if (raw.trim().length > 0) {
    const t = raw.trim();
    if (t === t.toLowerCase()) {
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    return t;
  }
  return raw.trim();
}

/**
 * Returns a canonical key used for deduplication and equivalence checks.
 */
export function canonicalKey(raw: string): string {
  const normalized = normalizeSkill(raw);
  if (!normalized) return "";

  const match = matchSkillInTaxonomy(normalized);
  if (match) return match.id;

  if (COMMON_SYNONYMS[normalized]) {
    const synMatch = matchSkillInTaxonomy(COMMON_SYNONYMS[normalized]);
    if (synMatch) return synMatch.id;
    return COMMON_SYNONYMS[normalized].replace(/[\s_.-]+/g, "-");
  }

  return normalized.replace(/[\s_.-]+/g, "-");
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

/**
 * Checks if candidate skill `cand` is related to target required skill `target`.
 */
export function isRelatedSkill(cand: string, target: string): boolean {
  const cKey = canonicalKey(cand);
  const tKey = canonicalKey(target);
  if (!cKey || !tKey || cKey === tKey) return false;

  const cNorm = normalizeSkill(cand);
  const tNorm = normalizeSkill(target);

  // 1. Check predefined related families
  for (const family of RELATED_FAMILIES) {
    if ((family.has(cNorm) || family.has(cKey)) && (family.has(tNorm) || family.has(tKey))) {
      return true;
    }
  }

  // 2. Check taxonomy category & name affinity
  const left = matchSkillInTaxonomy(cand);
  const right = matchSkillInTaxonomy(target);
  if (left && right && left.category === right.category && left.id !== right.id) {
    // Skills in the same specific technical categories share partial domain knowledge
    const highAffinityCategories = new Set<string>([
      "databases",
      "backend",
      "frontend",
      "devops_cloud",
      "ai_ml",
      "testing",
    ]);
    if (highAffinityCategories.has(left.category)) {
      return true;
    }
  }

  // 3. Substring inclusion for domain terms with length >= 4
  if (cNorm.length >= 4 && tNorm.length >= 4) {
    if (cNorm.includes(tNorm) || tNorm.includes(cNorm)) return true;
  }

  return false;
}

/**
 * Deterministic rule-based skill gap calculator that never fails.
 * Classifies required JD skills as matched, partial, or missing.
 * Weights required skills above preferred skills.
 * Computes extra resume skills not found in JD.
 */
export function calculateSkillGap(
  candidateSkills: string[] = [],
  requiredSkills: string[] = [],
  preferredSkills: string[] = [],
): SkillGapResult {
  // Safe filtering & sanitization
  const validCandidate = (candidateSkills || []).map((s) => String(s || "")).filter((s) => s.trim().length > 0);
  const validRequired = (requiredSkills || []).map((s) => String(s || "")).filter((s) => s.trim().length > 0);
  const validPreferred = (preferredSkills || []).map((s) => String(s || "")).filter((s) => s.trim().length > 0);

  const candidateKeys = new Set(validCandidate.map(canonicalKey).filter(Boolean));
  const candidateNames = uniqueNames(validCandidate);

  const matched: string[] = [];
  const missing: string[] = [];
  const partial: string[] = [];

  const matchedCandidateKeys = new Set<string>();

  // 1. Process Required Skills
  for (const req of validRequired) {
    const key = canonicalKey(req);
    if (!key) continue;

    if (candidateKeys.has(key)) {
      matched.push(canonicalName(req));
      matchedCandidateKeys.add(key);
      continue;
    }

    // Check partial / related skills
    const relatedCandidate = candidateNames.find((c) => isRelatedSkill(c, req));
    if (relatedCandidate) {
      partial.push(canonicalName(req));
      matchedCandidateKeys.add(canonicalKey(relatedCandidate));
    } else {
      missing.push(canonicalName(req));
    }
  }

  // 2. Process Preferred Skills
  for (const pref of validPreferred) {
    const key = canonicalKey(pref);
    if (!key) continue;
    const name = canonicalName(pref);

    if (candidateKeys.has(key)) {
      matchedCandidateKeys.add(key);
      if (!matched.includes(name) && !partial.includes(name)) {
        matched.push(name);
      }
    } else {
      const relatedCandidate = candidateNames.find((c) => isRelatedSkill(c, pref));
      if (relatedCandidate && !matched.includes(name) && !partial.includes(name)) {
        partial.push(name);
        matchedCandidateKeys.add(canonicalKey(relatedCandidate));
      }
    }
  }

  // 3. Compute Extra Resume Skills (candidate skills not required or preferred)
  const allJdKeys = new Set([...validRequired, ...validPreferred].map(canonicalKey).filter(Boolean));
  const extraSkills: string[] = [];
  for (const cand of candidateNames) {
    const key = canonicalKey(cand);
    if (key && !allJdKeys.has(key) && !matchedCandidateKeys.has(key)) {
      extraSkills.push(cand);
    }
  }

  // 4. Weighted Match Score Calculation
  // Required skills are weighted at 1.0 (or 2.0).
  // Preferred skills are weighted at 0.35.
  // Partial matches receive 0.5 of their respective weight.
  const reqTotal = validRequired.length;
  const prefTotal = validPreferred.length;

  let matchScore: number;
  if (reqTotal === 0 && prefTotal === 0) {
    matchScore = 100;
  } else if (candidateNames.length === 0) {
    matchScore = 0;
  } else {
    const reqWeight = 1.0;
    const prefWeight = 0.35;

    let earnedScore = 0;
    let maxPossibleScore = 0;

    for (const req of validRequired) {
      maxPossibleScore += reqWeight;
      const key = canonicalKey(req);
      if (candidateKeys.has(key)) {
        earnedScore += reqWeight;
      } else if (candidateNames.some((c) => isRelatedSkill(c, req))) {
        earnedScore += reqWeight * 0.5;
      }
    }

    for (const pref of validPreferred) {
      maxPossibleScore += prefWeight;
      const key = canonicalKey(pref);
      if (candidateKeys.has(key)) {
        earnedScore += prefWeight;
      } else if (candidateNames.some((c) => isRelatedSkill(c, pref))) {
        earnedScore += prefWeight * 0.5;
      }
    }

    matchScore = maxPossibleScore > 0 ? Math.round((earnedScore / maxPossibleScore) * 100) : 100;
    matchScore = Math.max(0, Math.min(100, matchScore));
  }

  // 5. Construct Narrative
  let narrative: string;
  const uniqueMatched = uniqueNames(matched);
  const uniqueMissing = uniqueNames(missing);
  const uniquePartial = uniqueNames(partial);
  const uniqueExtra = uniqueNames(extraSkills);

  if (candidateNames.length === 0 && reqTotal === 0) {
    narrative = "No skills specified for either candidate or job description.";
  } else if (candidateNames.length === 0) {
    narrative = "No readable skills detected in the candidate resume.";
  } else if (reqTotal === 0) {
    narrative = "Target job description does not list specific required technical skills.";
  } else {
    narrative = `You match ${uniqueMatched.length} of ${reqTotal} required skills (${matchScore}% match). ${
      uniquePartial.length > 0 ? `${uniquePartial.length} adjacent skills identified.` : ""
    }`.trim();
  }

  return {
    matched: uniqueMatched,
    missing: uniqueMissing,
    partial: uniquePartial,
    matchScore,
    narrative,
    extraSkills: uniqueExtra,
  };
}

export function skillGapFromText(resumeText: string, jdText: string): SkillGapResult {
  const { matchedIds: candidateSkills } = extractSkillsFromText(resumeText || "");
  const { matchedIds: jdSkills } = extractSkillsFromText(jdText || "");
  return calculateSkillGap(candidateSkills, jdSkills);
}
