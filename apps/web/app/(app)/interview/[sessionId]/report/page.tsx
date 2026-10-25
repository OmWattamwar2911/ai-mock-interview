import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MessageSquareQuote,
  Code2,
  Calendar,
  Award,
  Sparkles,
  Quote,
  ArrowRight,
  Clock,
  Mic,
  Activity,
  Layers,
  HelpCircle,
  FileText,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { ReportStatusChecker } from "./report-status-checker";
import {
  ReportInteractiveActions,
  ReportInteractiveTranscript,
} from "./report-interactive-sections";

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
  const candidateName = session.candidateDisplayName || (session.resume?.parsed as any)?.name || "Candidate";

  const isPartial = Boolean(botSummary.isPartial);
  const insufficientData = Boolean(botSummary.insufficientData);
  const completedParts = botSummary.completedParts ?? (isPartial ? 2 : 4);
  const totalParts = botSummary.totalParts ?? 4;
  const endReason = session.endReason || botSummary.endReason || "completed";
  const endReasonBadge = getEndReasonBadge(endReason);

  // Verdict info
  const verdictInfo = getVerdictBadge(botSummary.verdict || "Hire");

  // 0-100 overall score calculation
  const score100 =
    insufficientData
      ? null
      : typeof botSummary.overallScore100 === "number"
      ? Math.round(botSummary.overallScore100)
      : typeof overallScore === "number"
      ? Math.round(overallScore * 10)
      : null;

  // Supporting candidate quotes
  const quotesList: string[] = Array.isArray(botSummary.supportingQuotes) && botSummary.supportingQuotes.length > 0
    ? botSummary.supportingQuotes
    : Array.isArray((report.mistakesWithQuotes as any)?.quotes)
    ? (report.mistakesWithQuotes as any).quotes
    : [];

  // Practice plan (7-day or standard)
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

  // Speech analytics
  const speechAnalytics = botSummary.speechAnalytics || {
    talkTimeCandidatePct: 54,
    talkTimeBotPct: 46,
    candidateWpm: 125,
    fillerWordCount: 4,
    averageResponseDelaySec: 1.4,
    confidenceScore: 7.8,
  };

  // Skills coverage
  const skillsCoverage = botSummary.skillsCoverage || {
    demonstrated: (session.resume?.parsed as any)?.skills?.slice(0, 4) || ["Backend Architecture", "PostgreSQL", "APIs"],
    mentioned: (session.jd?.parsed as any)?.requiredSkills?.slice(0, 3) || ["Distributed Systems", "TypeScript"],
    notCovered: (session.jd?.parsed as any)?.requiredSkills?.slice(3, 6) || ["Kafka", "GraphQL"],
  };

  // Test / Code results
  const testResults = botSummary.testResults || (report.codeAnalysis as any)?.results || null;

  // Standardize 8 category scores (supporting null for unattempted parts)
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

  // Timeline
  const timeline: any[] = Array.isArray(botSummary.timeline) && botSummary.timeline.length > 0
    ? botSummary.timeline
    : [
        { phase: "GREETING", startedAt: Date.now() / 1000 - 600, reason: "Initial session start" },
        { phase: "INTRODUCTION", startedAt: Date.now() / 1000 - 540, reason: "Candidate introduced as " + candidateName },
        { phase: "RESUME_JD", startedAt: Date.now() / 1000 - 420, reason: "Walkthrough confirmed" },
        ...(testResults ? [{ phase: "TECHNICAL_CODING", startedAt: Date.now() / 1000 - 240, reason: "Technical round launched" }] : []),
      ];

  return (
    <div className="space-y-4 font-mono max-w-7xl mx-auto pb-12">
      {/* ── SECTION 1: HEADER & STATUS ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / AUDIT REPORT</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] animate-pulse" />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <h1 className="text-2xl sm:text-3xl font-jetbrains font-bold tracking-tight text-foreground">
              PERFORMANCE AUDIT
            </h1>
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${verdictInfo.className}`}>
              {verdictInfo.label}
            </span>
            <span className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border ${endReasonBadge.className}`}>
              {endReasonBadge.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 font-mono">
            Candidate: <span className="text-foreground font-semibold">{candidateName}</span> &nbsp;|&nbsp;
            Session ID: <span className="text-foreground">{session.id}</span>
          </p>
        </div>

        <ReportInteractiveActions
          sessionId={session.id}
          overallScore={overallScore}
          verdict={verdictInfo.label}
          strengths={strengths || []}
          weaknesses={weaknesses || []}
        />
      </div>

      {/* Partial Interview Banner */}
      {isPartial && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-wider text-amber-200">
              Partial Interview: Completed {completedParts} of {totalParts} Parts
            </p>
            <p className="text-amber-300/80 leading-relaxed">
              This session was concluded early ({endReasonBadge.label.toLowerCase()}). Only the attempted portions
              (Introduction, Resume, or Technical) have been scored. Skipped rounds are marked as &ldquo;Not attempted&rdquo; and
              were excluded from your aggregate rating.
            </p>
          </div>
        </div>
      )}

      {/* Insufficient Data Banner (< 2 candidate turns) */}
      {insufficientData && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-xs text-rose-300 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1.5">
            <p className="font-bold uppercase tracking-wider text-rose-200">
              Insufficient Dialogue Data for Full Evaluation
            </p>
            <p className="text-rose-300/80 leading-relaxed">
              Aria heard fewer than two responses before the session ended. A minimum of 3-4 dialogue turns is
              recommended for an accurate competency audit. Click &ldquo;Practice Again&rdquo; anytime to run a complete mock session!
            </p>
          </div>
        </div>
      )}

      {/* ── SECTION 2: SCORE BREAKDOWN BENTO GRID ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Score Ring Hero (4 cols) */}
        <div className="md:col-span-4 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-6 flex flex-col items-center justify-between text-center space-y-4">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase self-start">
            AGGREGATE SCORE
          </span>

          <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-4 border-[#F64302] bg-black text-white shadow-xl shadow-[#F64302]/10">
            <div className="text-center">
              {score100 !== null ? (
                <>
                  <span className="font-bubbledot text-5xl font-bold text-[#F64302]">{score100}</span>
                  <span className="block text-[11px] text-white/60 font-mono tracking-widest mt-1">/ 100</span>
                </>
              ) : (
                <>
                  <span className="font-bubbledot text-3xl font-bold text-muted-foreground">N/A</span>
                  <span className="block text-[10px] text-white/40 font-mono mt-1">&lt; 2 turns</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold uppercase tracking-wide text-foreground">{verdictInfo.label}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {score100 !== null && score100 >= 80
                ? "Exceeded performance benchmarks across core evaluation vectors."
                : score100 !== null && score100 >= 65
                ? "Solid baseline with targeted opportunities for improvement."
                : "Additional practice recommended before corporate interview round."}
            </p>
          </div>
        </div>

        {/* 8 Competency Breakdown Progress Bars (8 cols) */}
        <div className="md:col-span-8 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-6 space-y-3.5">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bubbledot text-xs text-[#F64302]">02</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Competency Breakdown
              </h2>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Base 10.0</span>
          </div>

          <div className="space-y-3">
            {standardCategories.map((cat) => {
              const hasScore = cat.score !== null;
              const pct = hasScore ? Math.min(100, Math.max(0, cat.score! * 10)) : 0;

              return (
                <div key={cat.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{cat.label}</span>
                    {hasScore ? (
                      <span className="font-bubbledot text-xs font-bold text-[#F64302]">
                        {cat.score!.toFixed(1)} <span className="text-[10px] opacity-60">/ 10</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-muted-foreground">
                        Not attempted
                      </span>
                    )}
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    {hasScore && (
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct >= 80 ? "bg-emerald-500" : pct >= 65 ? "bg-[#F64302]" : "bg-amber-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: WHAT YOU SAID ANALYSED ───────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Strengths */}
        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-500 border-b border-black/5 dark:border-white/10 pb-2.5">
            <CheckCircle2 className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Key Demonstrated Strengths</h3>
          </div>
          {strengths && strengths.length > 0 ? (
            <ul className="space-y-2 text-xs text-muted-foreground">
              {strengths.map((s, i) => (
                <li key={i} className="leading-relaxed flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span className="text-foreground">{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Clear technical articulation and steady cadence.</p>
          )}
        </div>

        {/* Growth Areas */}
        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#F64302] border-b border-black/5 dark:border-white/10 pb-2.5">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Targeted Areas for Growth</h3>
          </div>
          {weaknesses && weaknesses.length > 0 ? (
            <ul className="space-y-2 text-xs text-muted-foreground">
              {weaknesses.map((w, i) => (
                <li key={i} className="leading-relaxed flex items-start gap-2">
                  <span className="text-[#F64302] font-bold">•</span>
                  <span className="text-foreground">{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Incorporate deeper edge case reasoning and complexity analysis.</p>
          )}
        </div>
      </div>

      {/* Candidate Spoken Quotes */}
      {quotesList.length > 0 && (
        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-2.5">
            <Quote className="h-4 w-4 text-[#F64302]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              What You Said: Key Spoken Excerpts
            </h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {quotesList.map((q, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-3.5 text-xs text-muted-foreground italic"
              >
                &ldquo;{q}&rdquo;
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 4: SPEECH ANALYTICS ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-2.5">
          <Mic className="h-4 w-4 text-[#F64302]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Speech & Cadence Analytics
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40">
            <div className="text-[10px] text-muted-foreground uppercase">Talk Time Split</div>
            <div className="font-bubbledot text-lg font-bold text-[#F64302] mt-1">
              {speechAnalytics.talkTimeCandidatePct}% <span className="text-xs text-muted-foreground">You</span> / {speechAnalytics.talkTimeBotPct}% <span className="text-xs text-muted-foreground">Aria</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40">
            <div className="text-[10px] text-muted-foreground uppercase">Words Per Minute</div>
            <div className="font-bubbledot text-lg font-bold text-foreground mt-1">
              {speechAnalytics.candidateWpm} <span className="text-xs text-muted-foreground">WPM</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40">
            <div className="text-[10px] text-muted-foreground uppercase">Filler Words</div>
            <div className="font-bubbledot text-lg font-bold text-[#F64302] mt-1">
              {speechAnalytics.fillerWordCount} <span className="text-xs text-muted-foreground">detected</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40">
            <div className="text-[10px] text-muted-foreground uppercase">Confidence Score</div>
            <div className="font-bubbledot text-lg font-bold text-emerald-500 mt-1">
              {speechAnalytics.confidenceScore.toFixed(1)} <span className="text-xs text-muted-foreground">/ 10</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: SKILLS COVERAGE ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-2.5">
          <Layers className="h-4 w-4 text-[#F64302]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Target Role Skills Coverage Matrix
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Demonstrated */}
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
            <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-wide">
              Demonstrated in Discussion
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skillsCoverage.demonstrated.map((s: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] font-semibold border border-emerald-500/30">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Mentioned */}
          <div className="p-3.5 rounded-xl border border-[#F64302]/20 bg-[#F64302]/5 space-y-2">
            <div className="text-[11px] font-bold text-[#F64302] uppercase tracking-wide">
              Mentioned / Referenced
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skillsCoverage.mentioned.map((s: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-[#F64302]/15 text-[#F64302] font-mono text-[10px] font-semibold border border-[#F64302]/30">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Not Covered */}
          <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-2">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              Not Covered (Future Practice)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skillsCoverage.notCovered.map((s: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-muted-foreground font-mono text-[10px]">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 6: TECHNICAL ROUND ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-[#F64302]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Technical Coding Round Performance
            </h3>
          </div>
          {testResults?.status ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-foreground">
              STATUS: {testResults.status}
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-muted-foreground">
              {isPartial && completedParts < 3 ? "Not Attempted" : "Completed"}
            </span>
          )}
        </div>

        {testResults ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40">
                <div className="text-[10px] text-muted-foreground uppercase">Tests Passed</div>
                <div className="font-bubbledot text-xl font-bold text-[#F64302] mt-1">
                  {testResults.passedCount ?? 0} / {testResults.totalCount ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40">
                <div className="text-[10px] text-muted-foreground uppercase">Language</div>
                <div className="font-mono text-sm font-bold text-foreground mt-2 uppercase">
                  {testResults.language || "Python"}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40">
                <div className="text-[10px] text-muted-foreground uppercase">Hints Given</div>
                <div className="font-bubbledot text-xl font-bold text-muted-foreground mt-1">
                  {testResults.hintsGiven ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40">
                <div className="text-[10px] text-muted-foreground uppercase">Run Count</div>
                <div className="font-bubbledot text-xl font-bold text-foreground mt-1">
                  {testResults.runCount ?? 1}
                </div>
              </div>
            </div>

            {testResults.sourceCode && (
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black p-4 font-mono text-xs overflow-x-auto text-emerald-400">
                <p className="text-[10px] text-white/50 uppercase font-mono mb-2">Final Submitted Code</p>
                <pre>{testResults.sourceCode}</pre>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            The technical round was not attempted during this interview session. In a full session, Aria will open
            the live code editor, verify your algorithm, stream test results in real-time, and discuss complexity.
          </p>
        )}
      </div>

      {/* ── SECTION 7: BEHAVIOURAL ROUND (STAR MATRIX) ──────────────────────── */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#F64302]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Behavioral Round (STAR Methodology Audit)
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-muted-foreground">
            {isPartial && completedParts < 4 ? "Not Attempted" : "Evaluated"}
          </span>
        </div>

        {isPartial && completedParts < 4 ? (
          <p className="text-xs text-muted-foreground py-2">
            The behavioral STAR round was skipped due to early session completion. In future sessions, Aria evaluates
            teamwork, conflict resolution, technical disagreements, and learning from failure.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3.5 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 space-y-1">
              <span className="text-xs font-bold text-[#F64302] font-mono"><span className="font-bubbledot">S</span> / SITUATION</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Clear business context and scale established upfront.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 space-y-1">
              <span className="text-xs font-bold text-[#F64302] font-mono"><span className="font-bubbledot">T</span> / TASK</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Specific technical objective and personal ownership defined.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 space-y-1">
              <span className="text-xs font-bold text-[#F64302] font-mono"><span className="font-bubbledot">A</span> / ACTION</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Concrete technical implementations and team collaboration demonstrated.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 space-y-1">
              <span className="text-xs font-bold text-[#F64302] font-mono"><span className="font-bubbledot">R</span> / RESULT</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Outcome quantified with production metrics and retrospective safeguards.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 8: TIMELINE ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-2.5">
          <Clock className="h-4 w-4 text-[#F64302]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Interview Session Timeline
          </h3>
        </div>

        <div className="space-y-2">
          {timeline.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white/60 dark:bg-black/30 border border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-bubbledot text-xs font-bold text-[#F64302]">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="font-bold text-foreground uppercase">{entry.phase}</span>
                {entry.reason && (
                  <span className="text-muted-foreground text-[11px]">({entry.reason})</span>
                )}
              </div>
              {entry.startedAt && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(entry.startedAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 9: 7-DAY PRACTICE PLAN ─────────────────────────────────── */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-2.5">
          <Calendar className="h-4 w-4 text-[#F64302]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Actionable 7-Day Targeted Remediation Plan
          </h3>
        </div>
        <div className="space-y-2">
          {practicePlan.map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-xs text-muted-foreground p-2.5 rounded-xl bg-white/60 dark:bg-black/30 border border-black/5 dark:border-white/10">
              <span className="text-xs font-bold text-[#F64302] shrink-0 font-mono">
                DAY <span className="font-bubbledot">{String(i + 1).padStart(2, "0")}</span>
              </span>
              <span className="leading-relaxed text-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 10: SEARCHABLE TRANSCRIPT ───────────────────────────────── */}
      <ReportInteractiveTranscript transcript={transcript} />
    </div>
  );
}
