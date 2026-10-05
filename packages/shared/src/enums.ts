import { z } from "zod";

export const roleSchema = z.enum(["CANDIDATE", "ADMIN"]);
export const questionTypeSchema = z.enum(["CONCEPTUAL", "BEHAVIOURAL", "CODING"]);
export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export const sessionStatusSchema = z.enum([
  "CREATED",
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
]);
export const sessionQuestionStatusSchema = z.enum(["PENDING", "ANSWERED", "SKIPPED"]);
export const answerModeSchema = z.enum(["TYPED", "VOICE"]);
export const questionSourceSchema = z.enum(["BANK", "AI"]);
export const languageSchema = z.enum(["python", "javascript", "java", "cpp", "c"]);
export const assessmentSectionTypeSchema = z.enum(["MCQ_ROUND", "CODING_ROUND"]);
export const assessmentQuestionTypeSchema = z.enum(["MCQ", "MULTI_SELECT", "NUMERIC"]);
export const assessmentStatusSchema = z.enum(["DRAFT", "READY", "IN_PROGRESS", "COMPLETED"]);
export const executionStatusSchema = z.enum([
  "ACCEPTED",
  "WRONG_ANSWER",
  "COMPILE_ERROR",
  "RUNTIME_ERROR",
  "TIME_LIMIT",
  "MEMORY_LIMIT",
]);

export type Role = z.infer<typeof roleSchema>;
export type QuestionType = z.infer<typeof questionTypeSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type Language = z.infer<typeof languageSchema>;
export type AssessmentSectionType = z.infer<typeof assessmentSectionTypeSchema>;
export type AssessmentQuestionType = z.infer<typeof assessmentQuestionTypeSchema>;
export type AssessmentStatus = z.infer<typeof assessmentStatusSchema>;
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;
