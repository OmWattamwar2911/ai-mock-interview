import { z } from "zod";

export const languageSchema = z.enum(["python", "javascript", "java", "cpp", "c"]);
export const limitsSchema = z.object({
  cpuTimeSec: z.number().positive().max(10).default(2),
  memoryKb: z.number().positive().max(512_000).default(128_000),
});

export const executeRequestSchema = z.object({
  language: languageSchema,
  source: z.string().min(1).max(100_000),
  stdin: z.string().max(100_000).optional().default(""),
  limits: limitsSchema.optional(),
});

export const testCaseSchema = z.object({
  input: z.string().max(100_000),
  expected: z.string().max(100_000),
  hidden: z.boolean().optional().default(false),
});

export const runTestsRequestSchema = executeRequestSchema.extend({
  tests: z.array(testCaseSchema).min(1).max(20),
});

export type Language = z.infer<typeof languageSchema>;
export type Limits = z.infer<typeof limitsSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;

export type ExecutionStatus =
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILE_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT"
  | "MEMORY_LIMIT";

export type ExecutionResult = {
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  timeMs: number;
  memoryKb: number | null;
  compileError: string | null;
};

export type TestResult = TestCase & ExecutionResult & { passed: boolean };