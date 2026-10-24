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

export const atsBreakdownSchema = z.object({
  keywordMatch: z.object({
    score: z.number().min(0).max(100),
    weight: z.number().default(0.4),
    details: z.string(),
  }),
  formatting: z.object({
    score: z.number().min(0).max(100),
    weight: z.number().default(0.2),
    details: z.string(),
  }),
  sectionCompleteness: z.object({
    score: z.number().min(0).max(100),
    weight: z.number().default(0.2),
    details: z.string(),
  }),
  llmJudgement: z.object({
    score: z.number().min(0).max(100),
    weight: z.number().default(0.2),
    details: z.string(),
  }),
  calculationFormula: z.string(),
});

export const sectionFeedbackItemSchema = z.object({
  status: z.enum(["GOOD", "NEEDS_IMPROVEMENT", "MISSING"]),
  score: z.number().min(0).max(100),
  feedback: z.string(),
  suggestions: z.array(z.string()),
});

export const rewriteSuggestionSchema = z.object({
  section: z.string(),
  original: z.string(),
  suggestion: z.string(),
  reason: z.string(),
});

export const atsAnalysisSchema = z.object({
  overallAtsScore: z.number().min(0).max(100),
  breakdown: atsBreakdownSchema,
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  partialKeywords: z.array(z.string()).default([]),
  sectionFeedback: z.record(sectionFeedbackItemSchema),
  rewriteSuggestions: z.array(rewriteSuggestionSchema),
  summary: z.string(),
  analyzedAt: z.string().optional(),
});

export const analyzeResumeRequestSchema = z.object({
  resumeId: z.string().optional(),
  fileBase64: z.string().optional(),
  mime: z.string().optional(),
  fileName: z.string().optional(),
  resumeText: z.string().optional(),
  jobRole: z.string().min(1),
  jobDescriptionText: z.string().min(1),
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
export type AtsAnalysis = z.infer<typeof atsAnalysisSchema>;
export type AtsBreakdown = z.infer<typeof atsBreakdownSchema>;
export type RewriteSuggestion = z.infer<typeof rewriteSuggestionSchema>;
export type SectionFeedbackItem = z.infer<typeof sectionFeedbackItemSchema>;

// --- Technical Problem Object (Shared between Web, DB & LiveKit Bot) ---
export const exampleCaseSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string().optional(),
});

export const testCaseSchema = z.object({
  id: z.string().optional(),
  input: z.string(),
  expected: z.string(),
  hidden: z.boolean().default(false),
});

export const technicalProblemSchema = z.object({
  id: z.string(),
  title: z.string(),
  statement: z.string(),
  constraints: z.string(),
  examples: z.array(exampleCaseSchema),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  topicTags: z.array(z.string()).default([]),
  language: z.string().default("python"),
  starterCode: z.record(z.string()),
  testCases: z.array(testCaseSchema),
  // Private fields (for Aria LLM guidance; never sent raw to candidate browser)
  referenceSolution: z.record(z.string()).optional(),
  expectedComplexity: z.object({
    time: z.string(),
    space: z.string(),
    explanation: z.string().optional(),
  }).optional(),
  commonMistakes: z.array(z.string()).default([]),
  hints: z.array(z.string()).default([]), // 3 levels
});

export type TechnicalProblem = z.infer<typeof technicalProblemSchema>;
