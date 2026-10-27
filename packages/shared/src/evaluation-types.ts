import { z } from "zod";

/**
 * Standard rubric version anchor
 */
export const RUBRIC_VERSION = "2026.1";

export interface SpeechAnalytics {
  talkTimeCandidatePct: number;
  talkTimeBotPct: number;
  candidateWpm: number | null;
  fillerWordCount: number;
  fillerWords: Record<string, number>;
  averageResponseDelaySec: number | null;
  confidenceScore: number | null;
  hasEnoughSpeechToMeasure: boolean;
}

export interface SkillsCoverage {
  demonstrated: string[];
  mentioned: string[];
  notCovered: string[];
}

export interface CompetencyEvidence {
  key: string;
  name: string;
  score: number | null; // 0.0 - 10.0, null if unassessed
  status: "assessed" | "not_assessed";
  reasonIfNotAssessed?: string;
  verbatimQuotes: string[];
  rubricAnchor?: string;
  deterministicMetrics?: Record<string, any>;
}

export interface SessionEvidence {
  totalCandidateTurns: number;
  meaningfulCandidateTurns: number;
  candidateWordCount: number;
  botWordCount: number;
  candidateSpeakingTimeSec: number;
  hasEnoughSpeechForWpm: boolean;
  codeRunsCount: number;
  hasNonEmptyCode: boolean;
  testsPassed: number;
  testsTotal: number;
  hintsUsedCount: number;
  phasesReached: string[];
  meaningfulTurnsByPhase: Record<string, number>;
  candidateQuotes: string[];
}

export type EvaluationReportStatus = "INSUFFICIENT_DATA" | "PRELIMINARY" | "COMPLETED";

export interface EvaluatedReportSummary {
  insufficientData: boolean;
  isPartial: boolean;
  status: EvaluationReportStatus;
  completedParts: number;
  totalParts: number;
  coveragePercentage: number;
  candidateName: string;
  endReason: string;
  overallScore: number | null; // 0.0 - 10.0, null if INSUFFICIENT_DATA
  overallScore100: number | null; // 0 - 100, null if INSUFFICIENT_DATA
  verdict: string; // "Strong Hire" | "Hire" | "Lean Hire" | "Needs Practice" | "Not Evaluated"
  rubricVersion: string;
  evidence: SessionEvidence;
  categoryScores: {
    communication: number | null;
    confidenceClarity: number | null;
    resumeKnowledge: number | null;
    roleFit: number | null;
    technicalKnowledge: number | null;
    coding: number | null;
    problemSolving: number | null;
    behavioralSTAR: number | null;
  };
  competencies: Record<string, CompetencyEvidence>;
  speechAnalytics: SpeechAnalytics;
  skillsCoverage: SkillsCoverage;
  strengths: string[];
  weaknesses: string[];
  improvementPlan: string[];
  candidateQuotes: string[];
  supportingQuotes: string[];
  perQuestion: any[];
  practicePlan7Day: string[];
  executiveSummary: string[];
  testResults: any;
  message?: string;
}

export const GREETING_OR_AFFIRMATIVE_REGEX =
  /^(hi|hello|hey|good\s+(morning|afternoon|evening)|yes|no|yeah|yep|nope|sure|ok|okay|i\s+am\s+ready|ready|sounds\s+good|let'?s\s+(go|start|do\s+it)|can\s+you\s+hear\s+me|i\s+can\s+hear\s+you)[.!]?$/i;

/**
 * Check if candidate turn is meaningful:
 * - >= 8 words
 * - Not purely greeting or affirmative
 */
export function isMeaningfulTurn(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (GREETING_OR_AFFIRMATIVE_REGEX.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 8;
}
