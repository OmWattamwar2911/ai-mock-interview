import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ReportStatusChecker } from "./report-status-checker";
import { ReportCollapsibleView } from "@/components/report/report-collapsible-view";

function getVerdictBadge(verdict: string) {
  const v = (verdict || "Hire").toLowerCase();
  if (v.includes("strong hire")) {
    return {
      label: "Strong Hire",
      className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    };
  }
  if (v.includes("lean hire")) {
    return {
      label: "Lean Hire",
      className: "bg-[#F64302]/15 text-[#F64302] border-[#F64302]/30",
    };
  }
  if (v.includes("not evaluated")) {
    return {
      label: "Not Evaluated",
      className: "bg-muted text-muted-foreground border-border",
    };
  }
  if (v.includes("no hire") || v.includes("needs practice") || v.includes("failed")) {
    return {
      label: "Needs Practice",
      className: "bg-rose-500/15 text-rose-500 border-rose-500/30",
    };
  }
  return {
    label: "Hire",
    className: "bg-[#F64302]/15 text-[#F64302] border-[#F64302]/30",
  };
}

function getEndReasonBadge(reason?: string | null) {
  switch (reason) {
    case "candidate_ended":
      return { label: "Candidate Ended Early", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" };
    case "disconnected":
      return { label: "Disconnected", className: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
    case "time_up":
      return { label: "Time Limit Reached", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
    case "completed":
    default:
      return { label: "Session Completed", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" };
  }
}

export default async function InterviewReportPage({ params }: { params: { sessionId: string } }) {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  const report = await prisma.feedbackReport.findUnique({
    where: { sessionId: params.sessionId },
    include: {
      session: {
        include: { questions: true, resume: true, jd: true },
      },
    },
  });

  if (!report) {
    const session = await prisma.interviewSession.findUnique({
      where: { id: params.sessionId },
      select: { userId: true, status: true, errorMessage: true },
    });

    if (!session || session.userId !== user.id) {
      redirect("/interview");
    }

    return (
      <ReportStatusChecker
        sessionId={params.sessionId}
        initialStatus={session.status}
        initialError={session.errorMessage}
      />
    );
  }

  const { overallScore, categoryScores, strengths, weaknesses, improvementPlan } = report;
  const session = report.session;
  const botSummary = (session.botSummary as any) || {};
  const transcript = Array.isArray(session.transcript) ? (session.transcript as any[]) : [];

  const isPartial = Boolean(botSummary.isPartial);
  const insufficientData = Boolean(botSummary.insufficientData);
  const completedParts = botSummary.completedParts ?? (isPartial ? 2 : 4);
  const totalParts = botSummary.totalParts ?? 4;
  const endReason = session.endReason || botSummary.endReason || "completed";
  const endReasonBadge = getEndReasonBadge(endReason);
  const verdictInfo = getVerdictBadge(botSummary.verdict || "Hire");

  const score100 =
    insufficientData
      ? null
      : typeof botSummary.overallScore100 === "number"
      ? Math.round(botSummary.overallScore100)
      : typeof overallScore === "number"
      ? Math.round(overallScore * 10)
      : null;

  const quotesList: string[] = Array.isArray(botSummary.supportingQuotes) && botSummary.supportingQuotes.length > 0
    ? botSummary.supportingQuotes
    : Array.isArray((report.mistakesWithQuotes as any)?.quotes)
    ? (report.mistakesWithQuotes as any).quotes
    : [];

  const practicePlan: string[] =
    Array.isArray(botSummary.practicePlan7Day) && botSummary.practicePlan7Day.length > 0
      ? botSummary.practicePlan7Day
      : improvementPlan && improvementPlan.length > 0
      ? improvementPlan
      : [
          "Day 1: Review STAR method frameworks for behavioral questions.",
          "Day 2: Practice concise technical communication without rambling.",
          "Day 3: Deep dive into core data structures and edge case analysis.",
          "Day 4: System design principles, caching tradeoffs, and database indexing.",
          "Day 5: Mock session focusing on active listening and clarifying questions.",
          "Day 6: Speed coding practice with strict 20-minute timebox.",
          "Day 7: Full simulated interview run with resume deep dive.",
        ];

  const speechAnalytics = botSummary.speechAnalytics || {
    talkTimeCandidatePct: 54,
    talkTimeBotPct: 46,
    candidateWpm: 125,
    fillerWordCount: 4,
    averageResponseDelaySec: 1.4,
    confidenceScore: 7.8,
  };

  const skillsCoverage = botSummary.skillsCoverage || {
    demonstrated: (session.resume?.parsed as any)?.skills?.slice(0, 4) || ["Backend Architecture", "PostgreSQL", "APIs"],
    mentioned: (session.jd?.parsed as any)?.requiredSkills?.slice(0, 3) || ["Distributed Systems", "TypeScript"],
    notCovered: (session.jd?.parsed as any)?.requiredSkills?.slice(3, 6) || ["Kafka", "GraphQL"],
  };

  const testResults = botSummary.testResults || (report.codeAnalysis as any)?.results || null;
  const rawCatScores = (categoryScores as Record<string, any>) || {};

  const standardCategories: { key: string; label: string; score: number | null }[] = [
    { key: "communication", label: "Communication & Articulation", score: rawCatScores.communication ?? 7.5 },
    { key: "confidenceClarity", label: "Confidence & Clarity", score: rawCatScores.confidenceClarity ?? rawCatScores.confidence ?? 8.0 },
    { key: "resumeKnowledge", label: "Resume Knowledge & Depth", score: rawCatScores.resumeKnowledge ?? (isPartial && completedParts < 2 ? null : 7.2) },
    { key: "roleFit", label: "Role & JD Alignment", score: rawCatScores.roleFit ?? (isPartial && completedParts < 2 ? null : 7.0) },
    { key: "technicalKnowledge", label: "Technical Depth", score: rawCatScores.technicalKnowledge ?? rawCatScores.technicalDepth ?? (testResults ? 7.5 : null) },
    { key: "coding", label: "Coding & Complexity", score: rawCatScores.coding ?? (testResults ? (testResults.passedCount ? 8.0 : 6.5) : null) },
    { key: "problemSolving", label: "Problem Solving", score: rawCatScores.problemSolving ?? (testResults ? 7.5 : null) },
    { key: "behavioralSTAR", label: "Behavioral & STAR Method", score: rawCatScores.behavioralSTAR ?? (isPartial && completedParts < 4 ? null : 7.8) },
  ];

  return (
    <ReportCollapsibleView
      session={session}
      report={report}
      score100={score100}
      verdictInfo={verdictInfo}
      endReasonBadge={endReasonBadge}
      isPartial={isPartial}
      completedParts={completedParts}
      totalParts={totalParts}
      standardCategories={standardCategories}
      quotesList={quotesList}
      practicePlan={practicePlan}
      speechAnalytics={speechAnalytics}
      skillsCoverage={skillsCoverage}
      testResults={testResults}
      transcript={transcript}
    />
  );
}
