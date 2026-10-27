"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Download,
  Copy,
  Check,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mic,
  Code2,
  MessageSquareQuote,
  Sparkles,
  Award,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento-card";
import { ScoreNumeral } from "@/components/ui/score-numeral";
import { toast } from "@/components/ui/toast";

interface ReportCollapsibleViewProps {
  session: any;
  report: any;
  score100: number | null;
  verdictInfo: { label: string; className: string };
  endReasonBadge: { label: string; className: string };
  isPartial: boolean;
  completedParts: number;
  totalParts: number;
  standardCategories: { key: string; label: string; score: number | null }[];
  quotesList: string[];
  practicePlan: string[];
  speechAnalytics: any;
  skillsCoverage: any;
  testResults: any;
  transcript: any[];
}

export function ReportCollapsibleView({
  session,
  report,
  score100,
  verdictInfo,
  endReasonBadge,
  isPartial,
  completedParts,
  totalParts,
  standardCategories,
  quotesList,
  practicePlan,
  speechAnalytics,
  skillsCoverage,
  testResults,
  transcript,
}: ReportCollapsibleViewProps) {
  // Collapsible sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    answers: true,
    speech: true,
    skills: true,
    technical: true,
    plan: true,
    transcript: false,
  });

  const [copied, setCopied] = useState(false);
  const [activeCompetencyDetail, setActiveCompetencyDetail] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const botSummary = (session.botSummary as any) || {};
  const isInsufficientData = Boolean(botSummary.insufficientData || score100 === null);
  const evaluatedCompetencies = standardCategories.filter((c) => c.score !== null);
  const coveragePct = botSummary.coveragePercentage ?? Math.round((evaluatedCompetencies.length / standardCategories.length) * 100);

  const handleCopySummary = () => {
    const text = [
      `Rehearse Interview Evaluation Report`,
      `Role: ${session.jd?.title || "Technical Candidate"}`,
      `Overall Score: ${score100 !== null ? `${score100}/100` : "Not evaluated (Insufficient Data)"}`,
      `Verdict: ${verdictInfo.label}`,
      `Candidate: ${session.candidateDisplayName || "Candidate"}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  // Executive summary from grounded evaluation
  const summarySentences: string[] =
    Array.isArray(botSummary.executiveSummary) && botSummary.executiveSummary.length > 0
      ? botSummary.executiveSummary
      : isInsufficientData
      ? [
          "We could not evaluate this session because there was not enough candidate speech recorded.",
          "Aria heard fewer than two responses before the session concluded.",
          "Start a new interview session and answer the interview questions to receive your full assessment.",
        ]
      : [
          `Completed evaluation across ${evaluatedCompetencies.length} of ${standardCategories.length} core competencies.`,
          speechAnalytics.candidateWpm
            ? `Speech pace was measured at ${speechAnalytics.candidateWpm} WPM with ${speechAnalytics.fillerWordCount} filler words detected.`
            : "No speech cadence recorded.",
          skillsCoverage.notCovered?.[0]
            ? `Focus next rehearsal on ${skillsCoverage.notCovered[0]}.`
            : "Continue practicing comprehensive problem decomposition.",
        ];

  const sectionsIndex = [
    { id: "summary", label: "Executive Summary" },
    { id: "categories", label: "Score Breakdown" },
    { id: "answers", label: "Key Quotes & Answers" },
    { id: "speech", label: "Speech & Fluency" },
    { id: "skills", label: "Skills Coverage" },
    { id: "technical", label: "Coding & Tests" },
    { id: "plan", label: "Action Plan" },
    { id: "transcript", label: "Live Transcript" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono pb-16">
      {/* ── Page Header with Download PDF Button ───────────────────────────── */}
      <PageHeader
        eyebrow="Evaluation Audit"
        title="Interview report"
        subtitle={`Evaluation report for ${session.jd?.title || "Technical Role"} conducted by Aria voice agent.`}
        action={
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              onClick={handleCopySummary}
              className="rounded-xl border-black/10 dark:border-white/10 text-xs font-mono font-semibold h-10 gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-[#F64302]" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
            <Button
              onClick={handlePrint}
              className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white text-xs font-bold uppercase tracking-wider h-10 px-5 shadow-md shadow-[#F64302]/20 gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </Button>
          </div>
        }
      />

      {/* Insufficient Data Banner */}
      {isInsufficientData && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-xs text-red-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-foreground">
                Insufficient Data to Evaluate
              </p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                This interview ended before sufficient evidence was recorded. Aria requires at least 2 meaningful candidate responses to calculate scores.
              </p>
            </div>
          </div>
          <Link href="/interview" className="shrink-0">
            <Button className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-bold text-xs uppercase tracking-wider h-9 px-4">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Start New Interview
            </Button>
          </Link>
        </div>
      )}

      {/* Partial Session Alert */}
      {!isInsufficientData && isPartial && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-500 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Partial session ({endReasonBadge.label}):</strong> Completed {completedParts} of {totalParts} parts ({coveragePct}% competency coverage).
            Scores reflect attempted sections only.
          </p>
        </div>
      )}

      {/* ── Desktop Two-Column Layout with Sticky Side Index ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sticky Desktop Side Index (3 cols) */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-20 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pb-1 border-b border-black/[0.05] dark:border-white/[0.06]">
            Report Index
          </p>
          <nav className="space-y-1">
            {sectionsIndex.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <span>{sec.label}</span>
                <ChevronRight className="w-3 h-3 opacity-40" />
              </a>
            ))}
          </nav>
        </aside>

        {/* Main Content Area (9 cols) */}
        <main className="lg:col-span-9 space-y-6">
          {/* ── Section 1: Executive Summary & Score ──────────────────────── */}
          <div id="summary" className="grid sm:grid-cols-12 gap-4 items-stretch">
            {/* Overall Score Card (5 cols) */}
            <div className="sm:col-span-5">
              {score100 !== null ? (
                <ScoreNumeral
                  score={score100}
                  maxScore={100}
                  label="Overall Evaluation"
                  verdict={verdictInfo.label}
                  verdictType={score100 >= 80 ? "positive" : score100 >= 65 ? "positive" : "warning"}
                  variant="ring"
                  size="lg"
                  className="h-full"
                />
              ) : (
                <BentoCard padded="normal" className="h-full flex flex-col justify-between items-center text-center p-6 space-y-4">
                  <div className="rounded-full p-3 bg-black/5 dark:bg-white/5 text-muted-foreground">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-jetbrains font-bold text-lg text-foreground">
                      Not Evaluated
                    </span>
                    <p className="text-xs text-muted-foreground">
                      No score awarded due to insufficient response data.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-muted-foreground border border-black/10 dark:border-white/10">
                    0 of {totalParts} parts completed
                  </span>
                </BentoCard>
              )}
            </div>

            {/* Grounded Summary Card (7 cols) */}
            <div className="sm:col-span-7">
              <BentoCard padded="normal" className="h-full flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.06] pb-2">
                    <Sparkles className="w-4 h-4 text-[#F64302]" />
                    <h2 className="font-jetbrains font-bold text-sm text-foreground">
                      Executive Summary
                    </h2>
                  </div>
                  <div className="space-y-2 text-xs sm:text-sm text-foreground/90 font-mono leading-relaxed pt-1">
                    {summarySentences.map((s, idx) => (
                      <p key={idx}>{s}</p>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground border-t border-black/[0.05] dark:border-white/[0.06]">
                  <span>Evidence Audit Engine</span>
                  <span>·</span>
                  <span className="text-[#F64302] font-semibold">{endReasonBadge.label}</span>
                </div>
              </BentoCard>
            </div>
          </div>

          {/* ── Section 2: Score Breakdown (Collapsible) ───────────────────── */}
          <section id="categories" className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection("categories")}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="font-jetbrains font-bold text-base text-foreground">
                  Competency score breakdown
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Detailed evaluation across communication, technical depth, and problem solving
                </p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                {openSections.categories ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {openSections.categories && (
              <div className="grid gap-3 sm:grid-cols-2 pt-2 animate-in fade-in-50 duration-200">
                {standardCategories.map((cat) => {
                  const pct = cat.score !== null ? Math.round(cat.score * 10) : 0;
                  const compEvidence = botSummary.competencies?.[cat.key];
                  return (
                    <div
                      key={cat.key}
                      onClick={() => setActiveCompetencyDetail(cat.key === activeCompetencyDetail ? null : cat.key)}
                      className="cursor-pointer rounded-xl bg-white/70 dark:bg-black/40 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-black/[0.04] dark:border-white/[0.06] p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground truncate max-w-[200px]">
                          {cat.label}
                        </span>
                        <span className="font-bubbledot font-bold text-[#F64302]">
                          {cat.score !== null ? `${cat.score.toFixed(1)} / 10` : "Not Assessed"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F64302] transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {compEvidence?.rubricAnchor && (
                        <p className="text-[11px] text-muted-foreground pt-1 border-t border-black/5 dark:border-white/5 truncate">
                          {compEvidence.rubricAnchor}
                        </p>
                      )}
                      {cat.score === null && (
                        <p className="text-[11px] text-muted-foreground/70 italic pt-0.5">
                          {compEvidence?.reasonIfNotAssessed || "Not enough phase data to assess"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Section 3: Speech Analytics (Collapsible) ──────────────────── */}
          <section id="speech" className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection("speech")}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="font-jetbrains font-bold text-base text-foreground">
                  Speech &amp; verbal analytics
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Real-time turn telemetry, filler word count, and conversational cadence
                </p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                {openSections.speech ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {openSections.speech && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 animate-in fade-in-50 duration-200">
                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Cadence</span>
                  <p className="font-bubbledot text-2xl font-bold text-foreground">
                    {speechAnalytics.candidateWpm ? (
                      <>
                        {speechAnalytics.candidateWpm} <span className="text-xs font-mono font-normal">WPM</span>
                      </>
                    ) : (
                      <span className="text-sm font-mono text-muted-foreground">--</span>
                    )}
                  </p>
                  <span className="text-[10px] text-muted-foreground font-bold">
                    {speechAnalytics.candidateWpm ? "Measured spoken rate" : "Need ≥30s speech"}
                  </span>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Filler Words</span>
                  <p className="font-bubbledot text-2xl font-bold text-[#F64302]">
                    {speechAnalytics.fillerWordCount ?? 0}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Detected across turns</span>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Response Delay</span>
                  <p className="font-bubbledot text-2xl font-bold text-foreground">
                    {speechAnalytics.averageResponseDelaySec ? `${speechAnalytics.averageResponseDelaySec}s` : "--"}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Turn latency</span>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Talk Ratio</span>
                  <p className="font-bubbledot text-2xl font-bold text-foreground">
                    {speechAnalytics.talkTimeCandidatePct ?? 0}%
                  </p>
                  <span className="text-[10px] text-muted-foreground">Candidate vs Bot</span>
                </div>
              </div>
            )}
          </section>

          {/* ── Section 4: Skills Coverage (Collapsible) ───────────────────── */}
          <section id="skills" className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection("skills")}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="font-jetbrains font-bold text-base text-foreground">
                  Target role skills coverage
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Demonstrated competencies vs. job description requirements
                </p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                {openSections.skills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {openSections.skills && (
              <div className="grid gap-3 sm:grid-cols-3 pt-2 animate-in fade-in-50 duration-200">
                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-500">Demonstrated in Session</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skillsCoverage.demonstrated?.length > 0 ? (
                      skillsCoverage.demonstrated.map((s: string) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[11px] font-semibold border border-emerald-500/20">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None demonstrated</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-blue-500">Documented on Resume</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skillsCoverage.mentioned?.length > 0 ? (
                      skillsCoverage.mentioned.map((s: string) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[11px] font-semibold border border-blue-500/20">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None listed</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-amber-500">Uncovered Requirements</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skillsCoverage.notCovered?.length > 0 ? (
                      skillsCoverage.notCovered.map((s: string) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[11px] font-semibold border border-amber-500/20">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">All core covered</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Section 5: Key Quotes & Answers (Collapsible) ───────────────── */}
          <section id="answers" className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection("answers")}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="font-jetbrains font-bold text-base text-foreground">
                  Candidate verbatim quotes
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Direct transcripts cited as evidence during scoring
                </p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                {openSections.answers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {openSections.answers && (
              <div className="space-y-2.5 pt-2 animate-in fade-in-50 duration-200">
                {quotesList.length > 0 ? (
                  quotesList.map((q, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-white/70 dark:bg-black/40 border border-black/[0.04] dark:border-white/[0.06] p-3 text-xs text-foreground/90 leading-relaxed flex items-start gap-2.5"
                    >
                      <MessageSquareQuote className="w-4 h-4 text-[#F64302] shrink-0 mt-0.5" />
                      <p className="italic font-mono">&ldquo;{q}&rdquo;</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">No eligible candidate speech quotes recorded.</p>
                )}
              </div>
            )}
          </section>

          {/* ── Section 6: Action Plan (Collapsible) ────────────────────────── */}
          <section id="plan" className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection("plan")}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="font-jetbrains font-bold text-base text-foreground">
                  Recommended action plan
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Targeted milestones for follow-up mock preparation
                </p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                {openSections.plan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {openSections.plan && (
              <div className="space-y-2 pt-2 animate-in fade-in-50 duration-200">
                {practicePlan.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-xl bg-white/70 dark:bg-black/40 border border-black/[0.04] dark:border-white/[0.06] p-3 text-xs"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F64302]/10 text-[#F64302] font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="text-foreground/90 leading-relaxed font-mono">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Section 7: Live Transcript (Collapsible) ────────────────────── */}
          <section id="transcript" className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection("transcript")}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="font-jetbrains font-bold text-base text-foreground">
                  Complete session transcript ({transcript.length} turns)
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Raw transcript log from live conversation
                </p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                {openSections.transcript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {openSections.transcript && (
              <div className="space-y-3 pt-2 max-h-96 overflow-y-auto font-mono text-xs animate-in fade-in-50 duration-200 pr-1">
                {transcript.map((t, i) => {
                  const isUser = (t.role || t.speaker || "").toLowerCase() === "user" || (t.role || t.speaker || "").toLowerCase() === "candidate";
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border ${
                        isUser
                          ? "bg-[#F64302]/5 border-[#F64302]/20 text-foreground ml-4"
                          : "bg-white/70 dark:bg-black/40 border-black/5 dark:border-white/5 text-muted-foreground mr-4"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 text-[10px] font-bold text-muted-foreground">
                        <span>{isUser ? session.candidateDisplayName || "Candidate" : "Aria Agent"}</span>
                        <span>{t.phase || ""}</span>
                      </div>
                      <p className="leading-relaxed">{t.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
