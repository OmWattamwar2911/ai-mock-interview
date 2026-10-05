import { z } from "zod";

export const experienceItemSchema = z.object({
  company: z.string().default(""),
  title: z.string().default(""),
  start: z.string().optional(),
  end: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

export const educationItemSchema = z.object({
  school: z.string().default(""),
  degree: z.string().default(""),
  year: z.string().optional(),
});

export const projectItemSchema = z.object({
  name: z.string().default(""),
  summary: z.string().optional(),
  skills: z.array(z.string()).default([]),
});

export const resumeParsedSchema = z.object({
  skills: z.array(z.string()).default([]),
  experience: z.array(experienceItemSchema).default([]),
  education: z.array(educationItemSchema).default([]),
  projects: z.array(projectItemSchema).default([]),
  yearsOfExperience: z.number().nullable().optional(),
  summary: z.string().optional(),
});

export const jdParsedSchema = z.object({
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  seniority: z.string().optional(),
  title: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
});

export const parseResumeRequestSchema = z.object({
  fileBase64: z.string().optional(),
  text: z.string().optional(),
  mime: z.string().optional(),
});

export const parseResumeResponseSchema = z.object({
  parsed: resumeParsedSchema,
  text: z.string(),
});

export const parseJdRequestSchema = z.object({
  fileBase64: z.string().optional(),
  text: z.string().optional(),
  mime: z.string().optional(),
});

export const parseJdResponseSchema = z.object({
  parsed: jdParsedSchema,
  text: z.string(),
});

export const skillGapRequestSchema = z.object({
  resume: resumeParsedSchema,
  jd: jdParsedSchema,
});

export const skillGapResponseSchema = z.object({
  matched: z.array(z.string()),
  missing: z.array(z.string()),
  partial: z.array(z.string()),
  matchScore: z.number(),
  narrative: z.string(),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type ResumeParsed = z.infer<typeof resumeParsedSchema>;
export type JdParsed = z.infer<typeof jdParsedSchema>;
export type SkillGapResponse = z.infer<typeof skillGapResponseSchema>;
