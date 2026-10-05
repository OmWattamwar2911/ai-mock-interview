import pRetry from "p-retry";
import type { ZodType } from "zod";
import type { LlmProvider } from "./types.js";

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.search(/[{[]/);
  const slice = start >= 0 ? candidate.slice(start) : candidate;
  return JSON.parse(slice) as unknown;
}

export async function completeJson<T>(provider: LlmProvider, schema: ZodType<T>, prompt: string): Promise<T> {
  return pRetry(
    async () => {
      const text = await provider.complete(
        `${prompt}\n\nReturn ONLY valid JSON that matches the requested schema. No markdown.`,
      );
      return schema.parse(extractJson(text));
    },
    { retries: 2 },
  );
}
