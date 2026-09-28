import { describe, expect, it } from "vitest";
import { apiError, apiErrorSchema, healthResponseSchema } from "./error";
import { resumeParsedSchema, jdParsedSchema } from "./schemas";

describe("shared error utilities", () => {
  it("formats and validates an API error", () => {
    const err = apiError("BAD_REQUEST", "Invalid input");
    expect(apiErrorSchema.parse(err)).toEqual(err);
  });

  it("validates health response", () => {
    const res = healthResponseSchema.parse({ status: "ok", service: "ai-engine" });
    expect(res.status).toBe("ok");
    expect(res.service).toBe("ai-engine");
  });
});

describe("shared schemas", () => {
  it("parses empty resume with defaults", () => {
    const parsed = resumeParsedSchema.parse({});
    expect(parsed.skills).toEqual([]);
    expect(parsed.experience).toEqual([]);
  });

  it("parses empty jd with defaults", () => {
    const parsed = jdParsedSchema.parse({});
    expect(parsed.requiredSkills).toEqual([]);
  });
});
