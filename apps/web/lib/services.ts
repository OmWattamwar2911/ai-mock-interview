import { apiError, type ApiError } from "@rehearse/shared";

async function serviceFetch(baseUrl: string, path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-key": process.env.INTERNAL_API_KEY ?? "",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json as ApiError | null;
    throw new Error(err?.error?.message ?? `Service error ${res.status}`);
  }
  return json;
}

export function callAiEngine(path: string, body: unknown): Promise<unknown> {
  const url = process.env.AI_ENGINE_URL;
  if (!url) throw new Error("AI_ENGINE_URL is not set");
  return serviceFetch(url, path, body);
}

export function callCompiler(path: string, body: unknown): Promise<unknown> {
  const url = process.env.COMPILER_URL;
  if (!url) throw new Error("COMPILER_URL is not set");
  return serviceFetch(url, path, body);
}

export { apiError };
