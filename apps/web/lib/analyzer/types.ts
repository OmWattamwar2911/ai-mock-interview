export type AnalyzerType = "RESUME" | "LINKEDIN" | "GITHUB" | "CODING" | "PORTFOLIO";

export interface AnalyzerScoreBreakdown {
  name: string;
  score: number;
  max: number;
  evidence: string;
  missing?: string;
}

export interface AnalyzerFinding {
  severity: "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  detail: string;
  evidence?: string;
}

export interface AnalyzerRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  why: string;
  how: string;
  example?: string;
}

export interface UnifiedAnalyzerResult {
  id?: string;
  type: AnalyzerType;
  subject: string; // file name, handle, or URL
  score: number; // 0 - 100
  targetRole?: string;
  breakdown: AnalyzerScoreBreakdown[];
  findings: AnalyzerFinding[];
  recommendations: AnalyzerRecommendation[];
  rewrites?: Record<string, any>;
  dataSnapshot?: Record<string, any>;
  modelUsed?: string;
  createdAt: string;
}

export interface ProfileStrengthSummary {
  overallScore: number | null; // 0-100 or null if none completed
  completedCount: number;
  totalCount: number;
  weights: Record<AnalyzerType, number>;
  scores: Record<AnalyzerType, { score: number; subject: string; date: string } | null>;
}

export const ANALYZER_WEIGHTS: Record<AnalyzerType, number> = {
  RESUME: 35,
  LINKEDIN: 20,
  GITHUB: 25,
  CODING: 10,
  PORTFOLIO: 10,
};

export function calculateProfileStrength(
  latestScores: Partial<Record<AnalyzerType, { score: number; subject: string; date: string }>>
): ProfileStrengthSummary {
  let weightedSum = 0;
  let activeWeightSum = 0;
  let completedCount = 0;

  const scores: Record<AnalyzerType, { score: number; subject: string; date: string } | null> = {
    RESUME: latestScores.RESUME ?? null,
    LINKEDIN: latestScores.LINKEDIN ?? null,
    GITHUB: latestScores.GITHUB ?? null,
    CODING: latestScores.CODING ?? null,
    PORTFOLIO: latestScores.PORTFOLIO ?? null,
  };

  (Object.keys(ANALYZER_WEIGHTS) as AnalyzerType[]).forEach((type) => {
    const entry = scores[type];
    if (entry && typeof entry.score === "number") {
      const weight = ANALYZER_WEIGHTS[type];
      weightedSum += entry.score * weight;
      activeWeightSum += weight;
      completedCount++;
    }
  });

  const overallScore = activeWeightSum > 0 ? Math.round(weightedSum / activeWeightSum) : null;

  return {
    overallScore,
    completedCount,
    totalCount: 5,
    weights: ANALYZER_WEIGHTS,
    scores,
  };
}
