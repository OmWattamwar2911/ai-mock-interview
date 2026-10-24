import type { ExecutionResult, Language, Limits } from "./types.js";

const languageIds: Record<Language, number> = {
  python: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
  c: 50,
};

type Judge0Response = {
  status?: { id?: number; description?: string };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  time?: string | null;
  memory?: number | null;
};

function normaliseStatus(response: Judge0Response): ExecutionResult["status"] {
  const id = response.status?.id;
  if (id === 3) return "ACCEPTED";
  if (id === 4) return "WRONG_ANSWER";
  if (id === 5) return "TIME_LIMIT";
  if (id === 7 || id === 8 || id === 9 || id === 10 || id === 11 || id === 12) return "RUNTIME_ERROR";
  if (id === 13) return "MEMORY_LIMIT";
  if (id === 6) return "COMPILE_ERROR";
  return response.compile_output ? "COMPILE_ERROR" : "RUNTIME_ERROR";
}

export class Judge0Driver {
  constructor(private readonly baseUrl: string) {}

  async execute(language: Language, source: string, stdin: string, limits: Limits): Promise<ExecutionResult> {
    const response = await fetch(`${this.baseUrl}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        language_id: languageIds[language],
        source_code: source,
        stdin,
        cpu_time_limit: limits.cpuTimeSec,
        memory_limit: limits.memoryKb,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const payload = (await response.json()) as Judge0Response;
    if (!response.ok) throw new Error(`Judge0 request failed with ${response.status}`);
    const rawStdout = payload.stdout ?? "";
    const rawStderr = payload.stderr ?? "";
    const cap = (text: string) =>
      Buffer.byteLength(text, "utf8") > 64 * 1024
        ? Buffer.from(text, "utf8").subarray(0, 64 * 1024).toString("utf8") + "\n[Output capped at 64KB]"
        : text;

    const status = normaliseStatus(payload);

    return {
      status,
      stdout: cap(rawStdout),
      stderr: cap(rawStderr),
      timeMs: Math.round(Number(payload.time ?? 0) * 1000),
      memoryKb: payload.memory ?? null,
      compileError: payload.compile_output ? cap(payload.compile_output) : null,
    };
  }
}