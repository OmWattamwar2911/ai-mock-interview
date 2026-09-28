import { z } from "zod";

export const resumeParsedSchema = z.object({
  skills: z.array(z.string()).default([]),
  experience: z.array(z.unknown()).default([]),
  education: z.array(z.unknown()).default([]),
  projects: z.array(z.unknown()).default([]),
  yearsOfExperience: z.number().nullable().optional(),
  summary: z.string().optional(),
});

export const jdParsedSchema = z.object({
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  seniority: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
});

export const parseResumeRequestSchema = z.object({
  fileBase64: z.string().optional(),
  text: z.string().optional(),
  mime: z.string().optional(),
});

export const parseJdRequestSchema = z.object({
  text: z.string().min(1),
});

export const skillGapRequestSchema = z.object({
  resume: resumeParsedSchema,
  jd: jdParsedSchema,
});

export const executeRequestSchema = z.object({
  language: z.string(),
  source: z.string(),
  stdin: z.string().optional(),
  tests: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string().optional(),
        isHidden: z.boolean().optional(),
      }),
    )
    .optional(),
  limits: z
    .object({
      wallTimeSec: z.number().optional(),
      memoryMb: z.number().optional(),
    })
    .optional(),
});

export type ResumeParsed = z.infer<typeof resumeParsedSchema>;
export type JdParsed = z.infer<typeof jdParsedSchema>;
