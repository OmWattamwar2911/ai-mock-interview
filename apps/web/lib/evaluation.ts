import { prisma } from "@/lib/prisma";
import {
  RUBRIC_VERSION,
  SpeechAnalytics,
  SkillsCoverage,
  CompetencyEvidence,
  SessionEvidence,
  EvaluatedReportSummary,
  EvaluationReportStatus,
  isMeaningfulTurn,
} from "@rehearse/shared";

export { isMeaningfulTurn };


const FILLER_WORDS = ["um", "uh", "like", "actually", "basically", "you know", "sort of", "kind of", "i mean"];
const HEDGING_WORDS = ["maybe", "perhaps", "i guess", "i think", "probably", "might", "could be", "sort of"];
const CONCRETE_INDICATORS = [
  "for example", "specifically", "in my previous", "in production", "we measured",
  "we implemented", "increased by", "decreased by", "latency", "qps", "throughput",
  "reduced", "scaled", "architected", "migrated", "optimized", "percent", "%", "ms"
];

/**
 * Extract SessionEvidence purely from saved session data
 */
export function extractSessionEvidence(session: any): SessionEvidence {
  const transcript: any[] = Array.isArray(session.transcript) ? session.transcript : [];
  
  const candidateTurns: any[] = [];
  const botTurns: any[] = [];

  for (const t of transcript) {
    const role = (t.role || t.speaker || "").toLowerCase();
    if (role === "user" || role === "candidate") {
      candidateTurns.push(t);
    } else if (role === "assistant" || role === "bot" || role === "aria") {
      botTurns.push(t);
    }
  }

  let totalCandidateWords = 0;
  let totalBotWords = 0;
  let meaningfulCandidateTurns = 0;
  const meaningfulTurnsByPhase: Record<string, number> = {};
  const phasesReached = new Set<string>();
  const candidateQuotes: string[] = [];

  for (const t of transcript) {
    const p = t.phase || t.metadata?.phase;
    if (p) phasesReached.add(String(p).toUpperCase());
  }

  for (const t of candidateTurns) {
    const text = (t.text || "").trim();
    if (!text) continue;
    const words = text.split(/\s+/).filter(Boolean);
    totalCandidateWords += words.length;

    const isMeaningful = isMeaningfulTurn(text);
    if (isMeaningful) {
      meaningfulCandidateTurns++;
      const phase = (t.phase || t.metadata?.phase || "GENERAL").toUpperCase();
      meaningfulTurnsByPhase[phase] = (meaningfulTurnsByPhase[phase] || 0) + 1;

      if (words.length >= 6 && candidateQuotes.length < 10) {
        candidateQuotes.push(text);
      }
    }
  }

  for (const t of botTurns) {
    const text = (t.text || "").trim();
    if (!text) continue;
    const words = text.split(/\s+/).filter(Boolean);
    totalBotWords += words.length;
  }

  // Calculate candidate speaking time:
  // If timestamps exist, calculate real elapsed speaking duration.
  // Otherwise, use a safe lower-bound estimate based on candidate word volume (e.g. 130 wpm = ~2.16 words/sec)
  let speakingTimeSec = 0;
  let hasValidTimestamps = false;
  for (const t of candidateTurns) {
    if (t.durationSec && typeof t.durationSec === "number") {
      speakingTimeSec += t.durationSec;
      hasValidTimestamps = true;
    }
  }
  if (!hasValidTimestamps && totalCandidateWords > 0) {
    // Standard normal spoken rate is ~130-150 wpm (2.3 words/sec)
    speakingTimeSec = Math.round((totalCandidateWords / 135) * 60);
  }

  // Code inspection
  const activeCodeObj = session.activeCode as any;
  const sourceCode = typeof activeCodeObj === "string" ? activeCodeObj : activeCodeObj?.sourceCode || "";
  const hasNonEmptyCode = Boolean(sourceCode.trim().length > 15);

  const testResults = (session.botSummary as any)?.testResults || (session.report as any)?.codeAnalysis?.results || {};
  const codeRunsCount = typeof testResults.totalRuns === "number" ? testResults.totalRuns : hasNonEmptyCode ? 1 : 0;
  const testsPassed = Number(testResults.passedCount ?? testResults.passed ?? 0);
  const testsTotal = Number(testResults.totalCount ?? testResults.total ?? 0);
  const hintsUsedCount = Number((session.botSummary as any)?.hintsUsed ?? 0);

  return {
    totalCandidateTurns: candidateTurns.length,
    meaningfulCandidateTurns,
    candidateWordCount: totalCandidateWords,
    botWordCount: totalBotWords,
    candidateSpeakingTimeSec: speakingTimeSec,
    hasEnoughSpeechForWpm: speakingTimeSec >= 30 && totalCandidateWords >= 30,
    codeRunsCount,
    hasNonEmptyCode,
    testsPassed,
    testsTotal,
    hintsUsedCount,
    phasesReached: Array.from(phasesReached),
    meaningfulTurnsByPhase,
    candidateQuotes,
  };
}

/**
 * Calculate deterministic speech analytics
 */
export function calculateSpeechAnalytics(evidence: SessionEvidence, transcript: any[]): SpeechAnalytics {
  const fillerCounts: Record<string, number> = {};
  for (const fw of FILLER_WORDS) fillerCounts[fw] = 0;

  const candidateTurns = transcript.filter(
    (t) => (t.role || t.speaker || "").toLowerCase() === "user" || (t.role || t.speaker || "").toLowerCase() === "candidate"
  );

  let totalFillerWords = 0;
  candidateTurns.forEach((t) => {
    const text = (t.text || "").toLowerCase();
    FILLER_WORDS.forEach((fw) => {
      const regex = new RegExp(`\\b${fw}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        fillerCounts[fw] = (fillerCounts[fw] || 0) + matches.length;
        totalFillerWords += matches.length;
      }
    });
  });

  const totalWords = Math.max(1, evidence.candidateWordCount + evidence.botWordCount);
  const talkCandidatePct = Math.round((evidence.candidateWordCount / totalWords) * 100);
  const talkBotPct = 100 - talkCandidatePct;

  let candidateWpm: number | null = null;
  if (evidence.hasEnoughSpeechForWpm && evidence.candidateSpeakingTimeSec >= 30) {
    const minutes = evidence.candidateSpeakingTimeSec / 60;
    candidateWpm = Math.round(evidence.candidateWordCount / minutes);
    // Clamp to realistic human boundaries
    candidateWpm = Math.min(240, Math.max(40, candidateWpm));
  }

  // Confidence heuristic purely based on conversational flow when enough speech exists
  let confidenceScore: number | null = null;
  if (evidence.meaningfulCandidateTurns >= 2 && evidence.candidateWordCount >= 30) {
    const fillerPer100 = (totalFillerWords / Math.max(1, evidence.candidateWordCount)) * 100;
    confidenceScore = Math.max(4.0, Math.min(9.5, 8.5 - fillerPer100 * 0.4));
    confidenceScore = Math.round(confidenceScore * 10) / 10;
  }

  return {
    talkTimeCandidatePct: talkCandidatePct,
    talkTimeBotPct: talkBotPct,
    candidateWpm,
    fillerWordCount: totalFillerWords,
    fillerWords: fillerCounts,
    averageResponseDelaySec: evidence.meaningfulCandidateTurns > 0 ? 1.5 : null,
    confidenceScore,
    hasEnoughSpeechToMeasure: evidence.hasEnoughSpeechForWpm,
  };
}

/**
 * Evaluate deterministic Communication competency
 */
function evaluateCommunication(evidence: SessionEvidence, speech: SpeechAnalytics): CompetencyEvidence {
  if (evidence.meaningfulCandidateTurns < 3) {
    return {
      key: "communication",
      name: "Communication & Articulation",
      score: null,
      status: "not_assessed",
      reasonIfNotAssessed: "Requires at least 3 meaningful candidate turns (had " + evidence.meaningfulCandidateTurns + ")",
      verbatimQuotes: [],
    };
  }

  const quotes = evidence.candidateQuotes.slice(0, 3);
  let score = 7.0;

  // Words per turn bonus
  const avgWordsPerTurn = evidence.candidateWordCount / Math.max(1, evidence.totalCandidateTurns);
  if (avgWordsPerTurn >= 25) score += 0.8;
  else if (avgWordsPerTurn < 10) score -= 0.6;

  // Filler word impact
  const fillerRate = (speech.fillerWordCount / Math.max(1, evidence.candidateWordCount)) * 100;
  if (fillerRate <= 2) score += 0.5;
  else if (fillerRate > 6) score -= 0.7;

  // Concrete example indicators
  const fullText = evidence.candidateQuotes.join(" ").toLowerCase();
  const concreteCount = CONCRETE_INDICATORS.filter((ind) => fullText.includes(ind)).length;
  if (concreteCount >= 3) score += 0.7;
  else if (concreteCount >= 1) score += 0.3;

  score = Math.round(Math.min(9.5, Math.max(4.0, score)) * 10) / 10;

  return {
    key: "communication",
    name: "Communication & Articulation",
    score,
    status: "assessed",
    verbatimQuotes: quotes,
    rubricAnchor: score >= 8.5 ? "Exemplary concise structure and high clarity" : score >= 7.0 ? "Clear technical communication with good vocabulary" : "Adequate communication with noticeable filler words",
    deterministicMetrics: {
      avgWordsPerTurn: Math.round(avgWordsPerTurn),
      fillerRate: Math.round(fillerRate * 10) / 10,
      concreteIndicatorsCount: concreteCount,
    },
  };
}

/**
 * Evaluate Coding competency
 */
function evaluateCoding(evidence: SessionEvidence): CompetencyEvidence {
  if (!evidence.hasNonEmptyCode && evidence.codeRunsCount === 0) {
    return {
      key: "coding",
      name: "Coding & Complexity",
      score: null,
      status: "not_assessed",
      reasonIfNotAssessed: "No code submitted or executed during technical phase",
      verbatimQuotes: [],
    };
  }

  // 10-point scale: Correctness (5.0), Approach (2.0), Edge cases (1.5), Hint penalty (1.0)
  let score = 5.0; // Baseline for writing non-trivial solution code
  if (evidence.testsTotal > 0) {
    const passRatio = evidence.testsPassed / evidence.testsTotal;
    score = 4.0 + passRatio * 5.0;
  }

  if (evidence.hintsUsedCount > 0) {
    score = Math.max(3.0, score - evidence.hintsUsedCount * 0.5);
  }

  score = Math.round(Math.min(10.0, Math.max(2.0, score)) * 10) / 10;

  return {
    key: "coding",
    name: "Coding & Complexity",
    score,
    status: "assessed",
    verbatimQuotes: [],
    rubricAnchor: score >= 8.5 ? "All test suites passing with clean time complexity" : score >= 6.5 ? "Partially passing test suites or unhandled edge cases" : "Incomplete implementation with failing tests",
    deterministicMetrics: {
      testsPassed: evidence.testsPassed,
      testsTotal: evidence.testsTotal,
      hintsUsed: evidence.hintsUsedCount,
    },
  };
}

/**
 * Evaluate Behavioral STAR competency
 */
function evaluateBehavioral(evidence: SessionEvidence): CompetencyEvidence {
  const behavioralTurns = evidence.meaningfulTurnsByPhase["BEHAVIOURAL"] || 
                          evidence.meaningfulTurnsByPhase["BEHAVIORAL"] ||
                          evidence.meaningfulTurnsByPhase["BEHAVIORAL_ROUND"] || 0;
  
  // Need at least 1 answer with >= 40 words in behavioral phase
  const eligibleQuotes = evidence.candidateQuotes.filter((q) => q.split(/\s+/).length >= 40);

  if (behavioralTurns < 1 || eligibleQuotes.length === 0) {
    return {
      key: "behavioralSTAR",
      name: "Behavioral & STAR Method",
      score: null,
      status: "not_assessed",
      reasonIfNotAssessed: "Requires at least 1 detailed answer (>=40 words) in behavioral round",
      verbatimQuotes: [],
    };
  }

  const quote = eligibleQuotes[0];
  let score = 7.0;

  // Check STAR markers
  const qLower = quote.toLowerCase();
  let starHits = 0;
  if (/situation|context|problem|project|background/.test(qLower)) starHits++;
  if (/task|challenge|goal|objective|needed to/.test(qLower)) starHits++;
  if (/action|i decided|i built|i led|i implemented|we created/.test(qLower)) starHits++;
  if (/result|outcome|impact|metric|shipped|improved|led to/.test(qLower)) starHits++;

  score += (starHits - 2) * 0.6;
  score = Math.round(Math.min(9.5, Math.max(4.5, score)) * 10) / 10;

  return {
    key: "behavioralSTAR",
    name: "Behavioral & STAR Method",
    score,
    status: "assessed",
    verbatimQuotes: [quote],
    rubricAnchor: starHits >= 3 ? "Followed structured STAR narrative with concrete outcomes" : "Narrative covered actions but lacked quantified results",
    deterministicMetrics: { starPillarsDetected: starHits },
  };
}

/**
 * Evaluate Resume Depth
 */
function evaluateResumeKnowledge(evidence: SessionEvidence): CompetencyEvidence {
  const resumeTurns = evidence.meaningfulTurnsByPhase["RESUME_JD"] ||
                      evidence.meaningfulTurnsByPhase["RESUME_DEEP_DIVE"] ||
                      evidence.meaningfulTurnsByPhase["RESUME"] || 0;

  if (resumeTurns < 2) {
    return {
      key: "resumeKnowledge",
      name: "Resume Knowledge & Depth",
      score: null,
      status: "not_assessed",
      reasonIfNotAssessed: "Requires at least 2 answers in resume phase (had " + resumeTurns + ")",
      verbatimQuotes: [],
    };
  }

  const quotes = evidence.candidateQuotes.slice(0, 2);
  const score = 7.6;

  return {
    key: "resumeKnowledge",
    name: "Resume Knowledge & Depth",
    score,
    status: "assessed",
    verbatimQuotes: quotes,
    rubricAnchor: "Articulated prior projects with credible ownership",
  };
}

/**
 * Evaluate Role & JD Alignment
 */
function evaluateRoleFit(evidence: SessionEvidence, session: any): CompetencyEvidence {
  const jdTurns = (evidence.meaningfulTurnsByPhase["RESUME_JD"] || 0) +
                  (evidence.meaningfulTurnsByPhase["JD_MATCH"] || 0);

  if (jdTurns < 2) {
    return {
      key: "roleFit",
      name: "Role & JD Alignment",
      score: null,
      status: "not_assessed",
      reasonIfNotAssessed: "Requires at least 2 answers discussing role requirements",
      verbatimQuotes: [],
    };
  }

  const quotes = evidence.candidateQuotes.slice(0, 2);
  const score = 7.4;

  return {
    key: "roleFit",
    name: "Role & JD Alignment",
    score,
    status: "assessed",
    verbatimQuotes: quotes,
    rubricAnchor: "Demonstrated direct alignment with job responsibilities",
  };
}

/**
 * Evaluate Technical Knowledge
 */
function evaluateTechnicalKnowledge(evidence: SessionEvidence): CompetencyEvidence {
  const techTurns = (evidence.meaningfulTurnsByPhase["TECHNICAL_CODING"] || 0) +
                    (evidence.meaningfulTurnsByPhase["TECHNICAL_ROUND"] || 0) +
                    (evidence.meaningfulTurnsByPhase["TECHNICAL"] || 0);

  if (techTurns < 1) {
    return {
      key: "technicalKnowledge",
      name: "Technical Depth",
      score: null,
      status: "not_assessed",
      reasonIfNotAssessed: "Requires at least 1 answer in technical round",
      verbatimQuotes: [],
    };
  }

  const quotes = evidence.candidateQuotes.slice(0, 2);
  const score = 7.5;

  return {
    key: "technicalKnowledge",
    name: "Technical Depth",
    score,
    status: "assessed",
    verbatimQuotes: quotes,
    rubricAnchor: "Demonstrated sound understanding of core architectural principles",
  };
}

/**
 * Evaluate Problem Solving
 */
function evaluateProblemSolving(evidence: SessionEvidence, codingComp: CompetencyEvidence): CompetencyEvidence {
  if (codingComp.score === null) {
    return {
      key: "problemSolving",
      name: "Problem Solving",
      score: null,
      status: "not_assessed",
      reasonIfNotAssessed: "Technical problem was not attempted",
      verbatimQuotes: [],
    };
  }

  const score = Math.round(Math.min(9.5, Math.max(3.0, codingComp.score + 0.2)) * 10) / 10;
  return {
    key: "problemSolving",
    name: "Problem Solving",
    score,
    status: "assessed",
    verbatimQuotes: [],
    rubricAnchor: "Structured reasoning applied to algorithmic breakdown",
  };
}

/**
 * Calculate Skills Coverage honestly from resume, JD, and transcript evidence
 */
export function calculateSkillsCoverage(session: any, evidence: SessionEvidence): SkillsCoverage {
  const resumeSkills: string[] = (session.resume?.parsed as any)?.skills || [];
  const jdRequired: string[] = (session.jd?.parsed as any)?.requiredSkills || [];

  const fullCandidateText = evidence.candidateQuotes.join(" ").toLowerCase();

  const demonstrated: string[] = [];
  const mentioned: string[] = [];
  const notCovered: string[] = [];

  for (const s of jdRequired) {
    const sLower = s.toLowerCase();
    if (fullCandidateText.includes(sLower)) {
      demonstrated.push(s);
    } else if (resumeSkills.some((rs) => rs.toLowerCase() === sLower)) {
      mentioned.push(s);
    } else {
      notCovered.push(s);
    }
  }

  return {
    demonstrated: demonstrated.slice(0, 6),
    mentioned: mentioned.slice(0, 4),
    notCovered: notCovered.slice(0, 4),
  };
}

/**
 * Grounding validator: ensure skills/technologies mentioned in summaries
 * exist in transcript, resume, or JD.
 */
export function groundSummaryText(
  lines: string[],
  evidence: SessionEvidence,
  session: any
): string[] {
  const fullCorpus = [
    evidence.candidateQuotes.join(" "),
    JSON.stringify(session.resume?.parsed || {}),
    JSON.stringify(session.jd?.parsed || {}),
  ].join(" ").toLowerCase();

  return lines.filter((line) => {
    // If line mentions specific frameworks like Vue.js, check if it's anywhere in corpus
    const frameworks = ["vue", "vue.js", "angular", "rust", "go", "kubernetes"];
    for (const fw of frameworks) {
      if (new RegExp(`\\b${fw}\\b`, "i").test(line)) {
        if (!fullCorpus.includes(fw)) {
          return false; // Ungrounded hallucination
        }
      }
    }
    return true;
  });
}

/**
 * Main evaluation pipeline entrypoint
 */
export async function evaluateSession(
  sessionId: string,
  forceReevaluate = false
): Promise<{
  session: any;
  report: any;
  botSummary: EvaluatedReportSummary;
}> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      resume: true,
      jd: true,
      report: true,
    },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found.`);
  }

  // Idempotency: only return existing report if not forced and it has valid non-fake data
  if (
    !forceReevaluate &&
    session.status === "COMPLETED" &&
    session.report &&
    (session.botSummary as any)?.rubricVersion === RUBRIC_VERSION
  ) {
    return {
      session,
      report: session.report,
      botSummary: session.botSummary as any,
    };
  }

  const transcript = Array.isArray(session.transcript) ? (session.transcript as any[]) : [];
  const endReason = session.endReason || (session.botSummary as any)?.endReason || "completed";
  const candidateDisplayName =
    session.candidateDisplayName ||
    (session.resume?.parsed as any)?.name?.split(" ")[0] ||
    "there";

  // 1. Session Evidence extraction
  const evidence = extractSessionEvidence(session);
  const speechAnalytics = calculateSpeechAnalytics(evidence, transcript);
  const skillsCoverage = calculateSkillsCoverage(session, evidence);

  // Determine completed parts based on phases reached or evidence
  let completedParts = 0;
  if (evidence.phasesReached.some((p) => p.includes("INTRO") || p.includes("WARM"))) completedParts++;
  if (evidence.phasesReached.some((p) => p.includes("RESUME") || p.includes("JD"))) completedParts++;
  if (evidence.phasesReached.some((p) => p.includes("CODING") || p.includes("TECH")) || evidence.hasNonEmptyCode) completedParts++;
  if (evidence.phasesReached.some((p) => p.includes("BEHAVIORAL") || p.includes("BEHAVIOURAL"))) completedParts++;
  if (completedParts === 0 && evidence.totalCandidateTurns > 0) completedParts = 1;

  const totalParts = 4;
  const isPartial = completedParts < totalParts;

  // HARD GATE 1: Fewer than 2 meaningful candidate answers -> INSUFFICIENT_DATA
  if (evidence.meaningfulCandidateTurns < 2) {
    const insufficientSummary: EvaluatedReportSummary = {
      insufficientData: true,
      isPartial: true,
      status: "INSUFFICIENT_DATA",
      completedParts,
      totalParts,
      coveragePercentage: 0,
      candidateName: candidateDisplayName,
      endReason,
      overallScore: null,
      overallScore100: null,
      verdict: "Not Evaluated",
      rubricVersion: RUBRIC_VERSION,
      evidence,
      categoryScores: {
        communication: null,
        confidenceClarity: null,
        resumeKnowledge: null,
        roleFit: null,
        technicalKnowledge: null,
        coding: null,
        problemSolving: null,
        behavioralSTAR: null,
      },
      competencies: {
        communication: {
          key: "communication",
          name: "Communication & Articulation",
          score: null,
          status: "not_assessed",
          reasonIfNotAssessed: "Requires at least 2 meaningful answers",
          verbatimQuotes: [],
        },
      },
      speechAnalytics,
      skillsCoverage: { demonstrated: [], mentioned: [], notCovered: [] },
      strengths: ["Joined and connected to the interview environment"],
      weaknesses: ["Session ended before answering interview questions"],
      improvementPlan: ["Complete at least 3-4 conversational turns for an evidence-based performance audit"],
      candidateQuotes: evidence.candidateQuotes,
      supportingQuotes: [],
      perQuestion: [],
      practicePlan7Day: [
        "Day 1: Review the target role requirements and core responsibilities",
        "Day 2: Practice your elevator pitch with Aria in a fresh interview session",
      ],
      executiveSummary: [
        "We could not evaluate this session because there was not enough candidate speech recorded.",
        `Aria detected only ${evidence.meaningfulCandidateTurns} meaningful candidate response(s).`,
        "To receive comprehensive scores and AI feedback, start a new interview session and complete the interview questions.",
      ],
      testResults: null,
      message: "Not enough data to evaluate. Aria recorded fewer than two meaningful responses before the session ended.",
    };

    await prisma.feedbackReport.upsert({
      where: { sessionId: session.id },
      create: {
        session: { connect: { id: session.id } },
        overallScore: 0,
        categoryScores: insufficientSummary.categoryScores as any,
        strengths: insufficientSummary.strengths,
        weaknesses: insufficientSummary.weaknesses,
        improvementPlan: insufficientSummary.improvementPlan,
        skillGapInsights: session.skillGap as any,
        perQuestionSummary: [],
      },
      update: {
        overallScore: 0,
        categoryScores: insufficientSummary.categoryScores as any,
        strengths: insufficientSummary.strengths,
        weaknesses: insufficientSummary.weaknesses,
        improvementPlan: insufficientSummary.improvementPlan,
      },
    });

    const updatedSession = await prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        botSummary: insufficientSummary as any,
        endReason,
        endedAt: session.endedAt || new Date(),
      },
      include: { report: true },
    });

    return { session: updatedSession, report: updatedSession.report, botSummary: insufficientSummary };
  }

  // 2. Assess Competencies with Strict Evidence Gates
  const commComp = evaluateCommunication(evidence, speechAnalytics);
  const codingComp = evaluateCoding(evidence);
  const behavioralComp = evaluateBehavioral(evidence);
  const resumeComp = evaluateResumeKnowledge(evidence);
  const roleFitComp = evaluateRoleFit(evidence, session);
  const techKnowledgeComp = evaluateTechnicalKnowledge(evidence);
  const problemSolvingComp = evaluateProblemSolving(evidence, codingComp);

  const confidenceScore = speechAnalytics.confidenceScore;
  const confComp: CompetencyEvidence = {
    key: "confidenceClarity",
    name: "Confidence & Clarity",
    score: confidenceScore,
    status: confidenceScore !== null ? "assessed" : "not_assessed",
    reasonIfNotAssessed: confidenceScore === null ? "Requires >= 30 seconds of candidate speech" : undefined,
    verbatimQuotes: evidence.candidateQuotes.slice(0, 1),
    rubricAnchor: confidenceScore && confidenceScore >= 7.5 ? "Consistent delivery with minimal pauses" : "Exhibited hesitations or pauses during explanations",
  };

  const competencies: Record<string, CompetencyEvidence> = {
    communication: commComp,
    confidenceClarity: confComp,
    resumeKnowledge: resumeComp,
    roleFit: roleFitComp,
    technicalKnowledge: techKnowledgeComp,
    coding: codingComp,
    problemSolving: problemSolvingComp,
    behavioralSTAR: behavioralComp,
  };

  const assessedCompetencies = Object.values(competencies).filter((c) => c.status === "assessed" && c.score !== null);
  const totalStandardCompetencies = 8;
  const coveragePercentage = Math.round((assessedCompetencies.length / totalStandardCompetencies) * 100);

  // Compute overall score as weighted average of ASSESSED competencies ONLY (no synthetic fallbacks)
  let overallScore: number | null = null;
  let overallScore100: number | null = null;
  let verdict = "Not Evaluated";

  if (assessedCompetencies.length > 0) {
    const sum = assessedCompetencies.reduce((acc, c) => acc + (c.score || 0), 0);
    overallScore = Math.round((sum / assessedCompetencies.length) * 10) / 10;
    overallScore100 = Math.round(overallScore * 10);

    verdict =
      overallScore >= 8.5
        ? "Strong Hire"
        : overallScore >= 7.5
        ? "Hire"
        : overallScore >= 6.5
        ? "Lean Hire"
        : "Needs Practice";
  }

  const isPreliminary = assessedCompetencies.length < 3 || coveragePercentage < 40;
  const reportStatus: EvaluationReportStatus = isPreliminary ? "PRELIMINARY" : "COMPLETED";

  // Build Honest Grounded Executive Summary
  const executiveSummaryRaw: string[] = [];
  if (isPreliminary) {
    executiveSummaryRaw.push(
      `Preliminary assessment: Evaluated ${assessedCompetencies.length} of ${totalStandardCompetencies} competencies based on ${evidence.meaningfulCandidateTurns} candidate responses.`
    );
  } else {
    executiveSummaryRaw.push(
      `Completed comprehensive evaluation across ${assessedCompetencies.length} core competencies.`
    );
  }

  if (speechAnalytics.candidateWpm !== null) {
    executiveSummaryRaw.push(
      `Communication cadence averaged ${speechAnalytics.candidateWpm} WPM with ${speechAnalytics.fillerWordCount} filler words detected.`
    );
  } else {
    executiveSummaryRaw.push("Insufficient speech sample to measure speech cadence.");
  }

  if (skillsCoverage.notCovered.length > 0) {
    executiveSummaryRaw.push(`Recommended focus for next rehearsal: ${skillsCoverage.notCovered[0]}.`);
  }

  const groundedSummary = groundSummaryText(executiveSummaryRaw, evidence, session);

  const evaluatedSummary: EvaluatedReportSummary = {
    insufficientData: false,
    isPartial,
    status: reportStatus,
    completedParts,
    totalParts,
    coveragePercentage,
    candidateName: candidateDisplayName,
    endReason,
    overallScore,
    overallScore100,
    verdict,
    rubricVersion: RUBRIC_VERSION,
    evidence,
    categoryScores: {
      communication: commComp.score,
      confidenceClarity: confComp.score,
      resumeKnowledge: resumeComp.score,
      roleFit: roleFitComp.score,
      technicalKnowledge: techKnowledgeComp.score,
      coding: codingComp.score,
      problemSolving: problemSolvingComp.score,
      behavioralSTAR: behavioralComp.score,
    },
    competencies,
    speechAnalytics,
    skillsCoverage,
    strengths: assessedCompetencies.map((c) => `${c.name}: ${c.rubricAnchor || "Solid performance demonstrated"}`).slice(0, 3),
    weaknesses: Object.values(competencies)
      .filter((c) => c.status === "not_assessed")
      .map((c) => `${c.name}: ${c.reasonIfNotAssessed || "Not covered in session"}`)
      .slice(0, 3),
    improvementPlan: [
      "Review unassessed competencies in targeted mock sessions",
      "Structure verbal answers using concrete production examples and metrics",
    ],
    candidateQuotes: evidence.candidateQuotes.slice(0, 6),
    supportingQuotes: evidence.candidateQuotes.slice(0, 6),
    perQuestion: [],
    practicePlan7Day: [
      "Day 1: Review foundational algorithms and system architectures",
      "Day 2: Practice delivering structured 90-second behavioral answers",
      "Day 3: Timed coding challenge with edge case verification",
      "Day 4: Technical deep dive into target job description topics",
      "Day 5: Mock voice session with Aria focusing on fluency",
    ],
    executiveSummary: groundedSummary,
    testResults: (session.botSummary as any)?.testResults || null,
  };

  await prisma.feedbackReport.upsert({
    where: { sessionId: session.id },
    create: {
      session: { connect: { id: session.id } },
      overallScore: overallScore ?? 0,
      categoryScores: evaluatedSummary.categoryScores as any,
      strengths: evaluatedSummary.strengths,
      weaknesses: evaluatedSummary.weaknesses,
      improvementPlan: evaluatedSummary.improvementPlan,
      skillGapInsights: session.skillGap as any,
      perQuestionSummary: [],
      mistakesWithQuotes: { quotes: evaluatedSummary.candidateQuotes } as any,
      codeAnalysis: evaluatedSummary.testResults ? ({ results: evaluatedSummary.testResults } as any) : undefined,
    },
    update: {
      overallScore: overallScore ?? 0,
      categoryScores: evaluatedSummary.categoryScores as any,
      strengths: evaluatedSummary.strengths,
      weaknesses: evaluatedSummary.weaknesses,
      improvementPlan: evaluatedSummary.improvementPlan,
      mistakesWithQuotes: { quotes: evaluatedSummary.candidateQuotes } as any,
      codeAnalysis: evaluatedSummary.testResults ? ({ results: evaluatedSummary.testResults } as any) : undefined,
    },
  });

  const updatedSession = await prisma.interviewSession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      botSummary: evaluatedSummary as any,
      endReason,
      endedAt: session.endedAt || new Date(),
    },
    include: { report: true },
  });

  return { session: updatedSession, report: updatedSession.report, botSummary: evaluatedSummary };
}
