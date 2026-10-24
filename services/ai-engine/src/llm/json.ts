import pRetry, { AbortError } from "p-retry";
import type { ZodType } from "zod";
import type { LlmProvider } from "./types.js";

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fenced?.[1]?.trim() ?? trimmed;

  // Find first { or [
  const start = candidate.search(/[{[]/);
  if (start >= 0) candidate = candidate.slice(start);

  // Find last } or ]
  const lastCurly = candidate.lastIndexOf("}");
  const lastBracket = candidate.lastIndexOf("]");
  const end = Math.max(lastCurly, lastBracket);
  if (end >= 0) candidate = candidate.slice(0, end + 1);

  // Clean trailing commas before closing braces/brackets
  candidate = candidate.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(candidate);
}

export async function completeJson<T>(
  provider: LlmProvider,
  schema: ZodType<T>,
  prompt: string,
  options?: { retries?: number; minTimeout?: number }
): Promise<T> {
  const retries = options?.retries ?? 3;
  const minTimeout = options?.minTimeout ?? 1200;

  return pRetry(
    async (attempt) => {
      try {
        const text = await provider.complete(
          `${prompt}\n\nIMPORTANT: Return ONLY valid, parseable JSON conforming to the requested schema. Do not wrap in markdown or conversational commentary.`
        );
        const parsed = extractJson(text);
        return schema.parse(parsed);
      } catch (err: any) {
        const message = err?.message || String(err);
        const isRateLimited =
          message.includes("429") ||
          message.toLowerCase().includes("rate limit") ||
          message.toLowerCase().includes("quota") ||
          message.toLowerCase().includes("resource exhausted");

        if (isRateLimited) {
          console.warn(`[completeJson] LLM rate limit (429) hit on attempt ${attempt}. Retrying with backoff...`);
        } else {
          console.warn(`[completeJson] Error on attempt ${attempt}: ${message}`);
        }
        throw err;
      }
    },
    {
      retries,
      minTimeout,
      factor: 2,
      maxTimeout: 8000,
      randomize: true,
    }
  );
}
