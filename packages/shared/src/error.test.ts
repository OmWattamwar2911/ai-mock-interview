import { describe, expect, it } from "vitest";
import { apiError, apiErrorSchema } from "./error";

describe("apiError", () => {
  it("matches the shared error shape", () => {
    const payload = apiError("UNAUTHORIZED", "Sign in to continue");
    expect(apiErrorSchema.parse(payload)).toEqual({
      error: { code: "UNAUTHORIZED", message: "Sign in to continue" },
    });
  });
});
