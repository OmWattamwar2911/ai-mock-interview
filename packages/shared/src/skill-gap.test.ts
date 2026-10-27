import { describe, expect, it } from "vitest";
import { SKILLS_TAXONOMY } from "./taxonomy";
import { calculateSkillGap, normalizeSkill, canonicalKey, isRelatedSkill } from "./skill-gap";

describe("taxonomy", () => {
  it("contains at least 200 skills", () => {
    expect(SKILLS_TAXONOMY.length).toBeGreaterThanOrEqual(200);
  });
});

describe("skill normalization and synonyms", () => {
  it("normalizes case, punctuation, and whitespace", () => {
    expect(normalizeSkill("  React.js  ")).toBe("react");
    expect(normalizeSkill("K8S...")).toBe("kubernetes");
    expect(normalizeSkill("Node.js")).toBe("node.js");
    expect(normalizeSkill("JS")).toBe("javascript");
    expect(normalizeSkill("ML")).toBe("machine learning");
    expect(normalizeSkill("Postgres")).toBe("postgresql");
  });

  it("produces identical canonical keys for synonyms", () => {
    expect(canonicalKey("react.js")).toBe(canonicalKey("react"));
    expect(canonicalKey("js")).toBe(canonicalKey("javascript"));
    expect(canonicalKey("k8s")).toBe(canonicalKey("kubernetes"));
    expect(canonicalKey("postgres")).toBe(canonicalKey("postgresql"));
    expect(canonicalKey("node")).toBe(canonicalKey("node.js"));
  });

  it("identifies related skills in same family", () => {
    expect(isRelatedSkill("MySQL", "PostgreSQL")).toBe(true);
    expect(isRelatedSkill("Express", "Node.js")).toBe(true);
    expect(isRelatedSkill("Django", "FastAPI")).toBe(true);
    expect(isRelatedSkill("Docker", "Kubernetes")).toBe(true);
    expect(isRelatedSkill("React", "Go")).toBe(false);
  });
});

describe("skill gap calculation", () => {
  it("classifies matched, missing, and partial skills correctly", () => {
    const result = calculateSkillGap(
      ["React", "TypeScript", "MySQL", "Docker"],
      ["React", "Go", "PostgreSQL"],
      ["Docker"],
    );

    // React is exact match
    expect(result.matched).toContain("React");
    // Go is missing
    expect(result.missing).toContain("Go");
    // PostgreSQL has candidate MySQL (related database), so it should be partial
    expect(result.partial).toContain("PostgreSQL");
    // TypeScript is not required or preferred, so it should be in extraSkills
    expect(result.extraSkills).toContain("TypeScript");
    expect(result.matchScore).toBeGreaterThan(0);
  });

  it("handles abbreviation and synonym matching seamlessly", () => {
    const result = calculateSkillGap(
      ["js", "k8s", "postgres", "ml"],
      ["JavaScript", "Kubernetes", "PostgreSQL", "Machine Learning"],
    );

    expect(result.matched.length).toBe(4);
    expect(result.missing.length).toBe(0);
    expect(result.partial.length).toBe(0);
    expect(result.matchScore).toBe(100);
  });

  it("handles case differences and duplicates gracefully", () => {
    const result = calculateSkillGap(
      ["react", "REACT", "React", "python"],
      ["React", "PYTHON", "python"],
    );

    expect(result.matched.length).toBe(2);
    expect(result.missing.length).toBe(0);
    expect(result.matchScore).toBe(100);
  });

  it("weights required skills above preferred skills", () => {
    // Candidate matches required skill (1/1 required), but misses preferred
    const res1 = calculateSkillGap(["TypeScript"], ["TypeScript"], ["Rust"]);
    // Candidate misses required skill (0/1 required), but matches preferred
    const res2 = calculateSkillGap(["Rust"], ["TypeScript"], ["Rust"]);

    expect(res1.matchScore).toBeGreaterThan(res2.matchScore);
  });

  it("handles edge case: empty candidate skills", () => {
    const result = calculateSkillGap([], ["TypeScript", "React"]);
    expect(result.matched.length).toBe(0);
    expect(result.missing.length).toBe(2);
    expect(result.matchScore).toBe(0);
    expect(result.narrative).toContain("No readable skills");
  });

  it("handles edge case: empty required skills", () => {
    const result = calculateSkillGap(["TypeScript", "React"], []);
    expect(result.matched.length).toBe(0);
    expect(result.matchScore).toBe(100);
    expect(result.extraSkills?.length).toBe(2);
  });

  it("handles edge case: both candidate and required skills empty", () => {
    const result = calculateSkillGap([], []);
    expect(result.matched.length).toBe(0);
    expect(result.missing.length).toBe(0);
    expect(result.matchScore).toBe(100);
  });
});
