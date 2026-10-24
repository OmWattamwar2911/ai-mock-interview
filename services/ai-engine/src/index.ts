import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import Fastify from "fastify";
import { z } from "zod";
import {
  apiError,
  healthResponseSchema,
  parseJdRequestSchema,
  parseJdResponseSchema,
  parseResumeRequestSchema,
  parseResumeResponseSchema,
  skillGapRequestSchema,
} from "@rehearse/shared";
import { createLlmProvider } from "./llm/index.js";
import { extractText } from "./extract-text.js";
import { parseResumeDocument } from "./parse-resume.js";
import { parseJdDocument } from "./parse-jd.js";
import { analyzeSkillGap } from "./analyze-gap.js";
import { completeJson } from "./llm/json.js";
import { analyzeResumeAts } from "./analyze-ats.js";
import { resumeParsedSchema } from "@rehearse/shared";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const PORT = Number(process.env.PORT ?? 4001);
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";

const app = Fastify({ logger: true });

app.addHook("onRequest", async (request, reply) => {
  if (request.url === "/health" || request.url.startsWith("/health?")) return;
  const key = request.headers["x-internal-key"] ?? request.headers["x-internal-api-key"];
  if (!INTERNAL_API_KEY || key !== INTERNAL_API_KEY) {
    return reply.status(401).send(apiError("UNAUTHORIZED", "Invalid internal key"));
  }
});

app.get("/health", async () => healthResponseSchema.parse({ status: "ok", service: "ai-engine" }));

app.post("/v1/parse/resume", async (request, reply) => {
  const parsed = parseResumeRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send(apiError("VALIDATION_ERROR", "Invalid resume parse payload"));
  }
  const text = await extractText(parsed.data);
  if (!text.trim()) {
    return reply.status(400).send(apiError("BAD_REQUEST", "Could not extract text from resume"));
  }
  const llm = createLlmProvider();
  const resume = await parseResumeDocument(text, llm);
  return parseResumeResponseSchema.parse({ parsed: resume, text });
});

app.post("/v1/analyze/ats", async (request, reply) => {
  const reqSchema = z.object({
    resumeText: z.string().optional(),
    fileBase64: z.string().optional(),
    mime: z.string().optional(),
    parsedResume: resumeParsedSchema.optional(),
    jobRole: z.string().min(1),
    jobDescriptionText: z.string().min(1),
  });

  const parsed = reqSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send(apiError("VALIDATION_ERROR", "jobRole and jobDescriptionText are required"));
  }

  let text = parsed.data.resumeText ?? "";
  if (!text && parsed.data.fileBase64) {
    text = await extractText({ fileBase64: parsed.data.fileBase64, mime: parsed.data.mime });
  }

  if (!text.trim()) {
    return reply.status(400).send(apiError("BAD_REQUEST", "Could not extract or find resume text"));
  }

  const llm = createLlmProvider();
  const resume = parsed.data.parsedResume ?? (await parseResumeDocument(text, llm));
  const analysis = await analyzeResumeAts(text, resume, parsed.data.jobRole, parsed.data.jobDescriptionText, llm);

  return { atsAnalysis: analysis, parsedResume: resume, text };
});

app.post("/v1/parse/jd", async (request, reply) => {
  const parsed = parseJdRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send(apiError("VALIDATION_ERROR", "Invalid JD parse payload"));
  }
  const text = await extractText(parsed.data);
  if (!text.trim()) {
    return reply.status(400).send(apiError("BAD_REQUEST", "Could not extract text from job description"));
  }
  const llm = createLlmProvider();
  const jd = await parseJdDocument(text, llm);
  return parseJdResponseSchema.parse({ parsed: jd, text });
});

app.post("/v1/skill-gap", async (request, reply) => {
  const parsed = skillGapRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send(apiError("VALIDATION_ERROR", "Invalid skill-gap payload"));
  }
  const llm = createLlmProvider();
  return analyzeSkillGap(parsed.data.resume, parsed.data.jd, llm);
});

const generatedQuestionSchema = z.object({
  text: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
  topic: z.string(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  statement: z.string().optional(),
  constraints: z.string().optional(),
  examples: z.array(z.unknown()).optional(),
  starterCode: z.record(z.string()).optional(),
  referenceSolution: z.record(z.string()).optional(),
  testCases: z.array(z.object({ input: z.string(), expected: z.string(), hidden: z.boolean() })).optional(),
});

app.post("/v1/questions/generate", async (request, reply) => {
  const body = z.object({ type: z.string(), skillGap: z.unknown(), config: z.object({ count: z.number().int().min(1).max(3) }), bankHints: z.array(z.unknown()).default([]) }).safeParse(request.body);
  if (!body.success) return reply.status(400).send(apiError("VALIDATION_ERROR", "Invalid generation payload"));
  const provider = createLlmProvider();
  if (!provider) return { questions: body.data.bankHints };
  const schema = z.object({ questions: z.array(generatedQuestionSchema).min(1).max(3) });
  try {
    return await completeJson(provider, schema, `Generate ${body.data.config.count} ${body.data.type} questions tailored to this skill gap: ${JSON.stringify(body.data.skillGap)}. For coding questions, include practical role-specific statements, starterCode and 4-8 executable testCases with hidden booleans, plus a referenceSolution per supported language.`);
  } catch {
    return { questions: body.data.bankHints };
  }
});

app.post("/v1/interview/generate", async (request, reply) => {
  const body = z.object({ resume: z.unknown(), jd: z.unknown(), skillGap: z.unknown() }).safeParse(request.body);
  if (!body.success) return reply.status(400).send(apiError("VALIDATION_ERROR", "Invalid payload"));

  const provider = createLlmProvider();
  if (!provider) return { questions: [] };

  const schema = z.object({ questions: z.array(z.string()).min(3).max(6) });
  try {
    const prompt = `Based on this resume: ${JSON.stringify(body.data.resume)} 
and this job description: ${JSON.stringify(body.data.jd)}, 
and this skill gap analysis: ${JSON.stringify(body.data.skillGap)}, 
generate 4 personalized interview questions (a mix of conceptual, behavioural, and role-specific).
Make sure to emphasize the missing and partial skills in the skill gap for learning opportunities. 
Return only an array of question strings.`;
    return await completeJson(provider, schema, prompt);
  } catch (err: any) {
    app.log.error(err);
    return { questions: [] };
  }
});

app.post("/v1/interview/evaluate", async (request, reply) => {
  const body = z.object({ question: z.string(), transcript: z.string() }).safeParse(request.body);
  if (!body.success) return reply.status(400).send(apiError("VALIDATION_ERROR", "Invalid payload"));

  const provider = createLlmProvider();
  if (!provider) return { overallScore: 5, feedback: "Estimated score (AI disabled)." };

  const schema = z.object({
    clarity: z.number().min(1).max(10),
    relevance: z.number().min(1).max(10),
    starMethod: z.number().min(1).max(10),
    confidence: z.number().min(1).max(10),
    overallScore: z.number().min(1).max(10),
    feedback: z.string()
  });

  try {
    const prompt = `Evaluate the following candidate interview transcript for natural language confidence, clarity, relevance to the question, and usage of the STAR method (if it's a behavioral question).
Question asked: "${body.data.question}"
Candidate Transcript: "${body.data.transcript}"
Do NOT assume visual body language or facial expressions. Rely strictly on text timing/pauses (if apparent) or linguistic confidence.
Return the scores out of 10, and a concise constructive feedback string.`;
    
    return await completeJson(provider, schema, prompt);
  } catch (err: any) {
    app.log.error(err);
    return { overallScore: 5, feedback: "Error during AI evaluation. Estimated score." };
  }
});

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
