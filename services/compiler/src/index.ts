import Fastify from "fastify";
import { healthResponseSchema, apiError } from "@rehearse/shared";
import { Judge0Driver } from "./judge0.js";
import { executeRequestSchema, runTestsRequestSchema } from "./types.js";

const PORT = Number(process.env.PORT ?? 4002);
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";
const JUDGE0_URL = process.env.JUDGE0_URL ?? "http://localhost:2358";
const driver = new Judge0Driver(JUDGE0_URL);
const requestCounts = new Map<string, { count: number; resetAt: number }>();

const app = Fastify({ logger: true });

app.addHook("onRequest", async (request, reply) => {
  if (request.url === "/health") {
    return;
  }
  const key = request.headers["x-internal-key"];
  if (!INTERNAL_API_KEY || key !== INTERNAL_API_KEY) {
    return reply.status(401).send(apiError("UNAUTHORIZED", "Invalid internal key"));
  }
});

function allowed(request: { ip: string }): boolean {
  const now = Date.now();
  const current = requestCounts.get(request.ip);
  if (!current || current.resetAt <= now) {
    requestCounts.set(request.ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 30) return false;
  current.count += 1;
  return true;
}

app.get("/health", async () => {
  return healthResponseSchema.parse({ status: "ok", service: "compiler" });
});

app.post("/v1/execute", async (request, reply) => {
  if (!allowed(request)) return reply.status(429).send(apiError("RATE_LIMITED", "Too many compiler requests"));
  const parsed = executeRequestSchema.safeParse(request.body);
  if (!parsed.success) return reply.status(400).send(apiError("VALIDATION_ERROR", "Invalid execution payload"));
  try {
    return await driver.execute(parsed.data.language, parsed.data.source, parsed.data.stdin, parsed.data.limits ?? { cpuTimeSec: 2, memoryKb: 128_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compiler execution failed";
    return reply.status(502).send(apiError("UPSTREAM_ERROR", message));
  }
});

app.post("/v1/run-tests", async (request, reply) => {
  if (!allowed(request)) return reply.status(429).send(apiError("RATE_LIMITED", "Too many compiler requests"));
  const parsed = runTestsRequestSchema.safeParse(request.body);
  if (!parsed.success) return reply.status(400).send(apiError("VALIDATION_ERROR", "Invalid test payload"));
  try {
    const results = [];
    for (const test of parsed.data.tests) {
      const result = await driver.execute(parsed.data.language, parsed.data.source, test.input, parsed.data.limits ?? { cpuTimeSec: 2, memoryKb: 128_000 });
      const passed = result.status === "ACCEPTED" && result.stdout.trim() === test.expected.trim();
      results.push({ ...test, ...result, passed, status: passed ? "ACCEPTED" : result.status === "ACCEPTED" ? "WRONG_ANSWER" : result.status });
      if (result.status === "COMPILE_ERROR") break;
    }
    const passedCount = results.filter((result) => result.passed).length;
    return { status: passedCount === parsed.data.tests.length ? "ACCEPTED" : results.find((result) => result.status !== "ACCEPTED")?.status ?? "WRONG_ANSWER", passedCount, totalCount: parsed.data.tests.length, tests: results };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compiler test run failed";
    return reply.status(502).send(apiError("UPSTREAM_ERROR", message));
  }
});

await app.listen({ port: PORT, host: "0.0.0.0" });
