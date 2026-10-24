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
} from "lucide-react";
import Link from "next/link";
import { ReportStatusChecker } from "./report-status-checker";

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

export default async function InterviewReportPage({ params }: { params: { sessionId: string } }) {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  const report = await prisma.feedbackReport.findUnique({
    where: { sessionId: params.sessionId },
    include: {
      session: {
        include: { questions: true },
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
  const botSummary = (report.session.botSummary as any) || {};
  const perQuestionBot = Array.isArray(botSummary.perQuestion)
    ? botSummary.perQuestion
    : Array.isArray(report.perQuestionSummary)
    ? (report.perQuestionSummary as any[])
    : [];
  const transcript = Array.isArray(report.session.transcript) ? (report.session.transcript as any[]) : [];
  const hasLegacyQuestions = report.session.questions.length > 0;

  // 0-100 overall score calculation
  const score100 =
    typeof botSummary.overallScore100 === "number"
      ? Math.round(botSummary.overallScore100)
      : Math.round((overallScore ?? 7.5) * 10);

  // Verdict badge
  const verdictInfo = getVerdictBadge(botSummary.verdict || "Hire");

  // Supporting candidate quotes
  const quotesList: string[] = Array.isArray(botSummary.supportingQuotes)
    ? botSummary.supportingQuotes
    : Array.isArray((report.mistakesWithQuotes as any)?.quotes)
    ? (report.mistakesWithQuotes as any).quotes
    : [];

  // Practice plan (7-day or standard improvement plan)
  const practicePlan: string[] = Array.isArray(botSummary.practicePlan7Day) && botSummary.practicePlan7Day.length > 0
    ? botSummary.practicePlan7Day
    : improvementPlan && improvementPlan.length > 0
    ? improvementPlan
    : [
        "Day 1: Review STAR method frameworks for behavioral questions.",
        "Day 2: Practice concise technical communication without rambling.",
        "Day 3: Deep dive into core data structures and edge case analysis.",
        "Day 4: System design principles and architecture trade-offs.",
        "Day 5: Mock session focusing on active listening and clarifying questions.",
        "Day 6: Speed coding practice with strict 20-minute timebox.",
        "Day 7: Full simulated interview run with resume deep dive.",
      ];

  // Test / Code results
  const testResults = botSummary.testResults || (report.codeAnalysis as any)?.results || null;

  // Standardize 8 category scores
  const rawCatScores = (categoryScores as Record<string, any>) || {};
  const standardCategories: { key: string; label: string; score: number }[] = [
    { key: "communication", label: "Communication & Articulation", score: Number(rawCatScores.communication ?? 7.5) },
    { key: "resumeKnowledge", label: "Resume Knowledge & Honesty", score: Number(rawCatScores.resumeKnowledge ?? rawCatScores.resume_knowledge ?? 7.0) },
    { key: "roleFit", label: "Role & JD Fit", score: Number(rawCatScores.roleFit ?? rawCatScores.role_fit ?? rawCatScores.jobDescriptionFit ?? 7.5) },
    { key: "technicalKnowledge", label: "Technical Depth", score: Number(rawCatScores.technicalKnowledge ?? rawCatScores.technicalDepth ?? 7.5) },
    { key: "coding", label: "Coding & Complexity", score: Number(rawCatScores.coding ?? rawCatScores.codeCorrectness ?? 7.0) },
    { key: "problemSolving", label: "Problem Solving", score: Number(rawCatScores.problemSolving ?? 8.0) },
    { key: "behavioralSTAR", label: "Behavioral & STAR Method", score: Number(rawCatScores.behavioralSTAR ?? rawCatScores.behavioral ?? 7.5) },
    { key: "confidenceClarity", label: "Confidence & Clarity", score: Number(rawCatScores.confidenceClarity ?? rawCatScores.confidence ?? 8.0) },
  ];

  return (
    <div className="space-y-3 font-mono">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / EVALUATION</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] animate-pulse" />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl sm:text-3xl font-bubbledot font-bold tracking-tight text-foreground">
              PERFORMANCE AUDIT
            </h1>
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${verdictInfo.className}`}>
              {verdictInfo.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Session: <span className="text-foreground">{params.sessionId}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-[#F64302] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            ← Candidate Dashboard
          </Link>
        </div>
      </div>

      {/* Main Scorecard Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
        {/* Score Ring Hero (4 cols) */}
        <div className="md:col-span-4 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-6 flex flex-col items-center justify-between text-center space-y-4">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase self-start">
            AGGREGATE SCORE
          </span>

          <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-4 border-[#F64302] bg-black text-white shadow-xl shadow-[#F64302]/10">
            <div className="text-center">
              <span className="font-bubbledot text-5xl font-bold text-[#F64302]">{score100}</span>
              <span className="block text-[11px] text-white/60 font-mono tracking-widest mt-1">/ 100</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold uppercase tracking-wide text-foreground">{verdictInfo.label}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {score100 >= 80
                ? "Exceeded performance benchmarks across core evaluation vectors."
                : score100 >= 65
                ? "Solid candidate baseline with targeted opportunities for improvement."
                : "Additional practice recommended before corporate interview round."}
            </p>
          </div>
        </div>

        {/* 8 Competency Breakdown Progress Bars (8 cols) */}
        <div className="md:col-span-8 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-6 space-y-4">
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
              const pct = Math.min(100, Math.max(0, cat.score * 10));
              return (
                <div key={cat.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{cat.label}</span>
                    <span className="font-bubbledot text-xs font-bold text-[#F64302]">
                      {cat.score.toFixed(1)} <span className="text-[10px] opacity-60">/ 10</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 80 ? "bg-emerald-500" : pct >= 65 ? "bg-[#F64302]" : "bg-amber-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strengths and Growth Areas (Bento Row 2) */}
      <div className="grid md:grid-cols-2 gap-2.5">
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

      {/* Supporting Candidate Quotes */}
      {quotesList.length > 0 && (
        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-2.5">
            <Quote className="h-4 w-4 text-[#F64302]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Supporting Spoken Utterances
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

      {/* Technical Round Execution / Code Analysis */}
      {testResults && (
        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-[#F64302]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Technical Execution Metrics
              </h3>
            </div>
            {testResults.status && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-foreground">
                STATUS: {testResults.status}
              </span>
            )}
          </div>

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
        </div>
      )}

      {/* 7-Day Actionable Practice Plan */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-2.5">
          <Calendar className="h-4 w-4 text-[#F64302]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            7-Day Targeted Remediation Plan
          </h3>
        </div>
        <div className="space-y-2">
          {practicePlan.map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-xs text-muted-foreground p-2 rounded-lg bg-white/50 dark:bg-black/30">
              <span className="font-bubbledot text-xs font-bold text-[#F64302] shrink-0">
                DAY {String(i + 1).padStart(2, "0")}
              </span>
              <span className="leading-relaxed text-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Dialogue Transcript */}
      {transcript.length > 0 && (
        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-2.5">
            <MessageSquareQuote className="h-4 w-4 text-[#F64302]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Transcript Archive
            </h3>
          </div>
          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {transcript.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl text-xs leading-relaxed ${
                  msg.role === "assistant" || msg.speaker === "bot"
                    ? "bg-[#F64302]/10 border border-[#F64302]/20 mr-8"
                    : "bg-white/70 dark:bg-black/40 border border-black/5 dark:border-white/10 ml-8 text-foreground"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-1">
                  <span className={msg.role === "assistant" || msg.speaker === "bot" ? "text-[#F64302] font-bold" : "text-foreground font-bold"}>
                    {msg.role === "assistant" || msg.speaker === "bot" ? "Aria (Voice Agent)" : "Candidate"}
                  </span>
                  {msg.timestamp && (
                    <span className="font-mono text-muted-foreground text-[9px]">{msg.timestamp}</span>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
