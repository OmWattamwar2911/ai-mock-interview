import { describe, expect, it } from "vitest";
import { SKILLS_TAXONOMY } from "./taxonomy";
import { calculateSkillGap } from "./skill-gap";

describe("taxonomy", () => {
  it("contains at least 200 skills", () => {
    expect(SKILLS_TAXONOMY.length).toBeGreaterThanOrEqual(200);
  });
});

describe("skill gap", () => {
  it("classifies matched missing and partial skills", () => {
    const result = calculateSkillGap(
      ["React", "TypeScript", "PostgreSQL"],
      ["React", "Go", "TypeScript"],
      ["PostgreSQL"],
    );
    expect(result.matched).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(result.missing).toEqual(expect.arrayContaining(["Go"]));
    expect(result.partial).toEqual(expect.arrayContaining(["PostgreSQL"]));
    expect(result.matchScore).toBe(67);
  });
});
