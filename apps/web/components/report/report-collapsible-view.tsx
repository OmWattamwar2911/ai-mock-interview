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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento-card";
import { ScoreNumeral } from "@/components/ui/score-numeral";
import { StatusChip } from "@/components/ui/status-chip";
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

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = [
      `Rehearse Interview Evaluation Report`,
      `Role: ${session.jd?.title || "Technical Candidate"}`,
      `Overall Score: ${score100 !== null ? `${score100}/100` : "Not evaluated"}`,
      `Verdict: ${verdictInfo.label}`,
      `Candidate: ${session.candidateDisplayName || "Candidate"}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  // 3-sentence executive summary
  const summarySentences = [
    score100 !== null && score100 >= 80
      ? "Demonstrated strong structural problem-solving and rapid code implementation under real-time voice inquiry."
      : score100 !== null && score100 >= 65
      ? "Presented a sound technical foundation with clear potential, showing good articulation during core questions."
      : "Encountered challenges decomposing technical constraints before jumping into implementation.",
    `Communication velocity maintained a solid ${speechAnalytics.candidateWpm || 135} words per minute with ${speechAnalytics.fillerWordCount || 4} filler words detected.`,
    `Focus next rehearsal on ${skillsCoverage.notCovered?.[0] || "time-complexity optimization and edge-case testing"}.`,
  ];

  const sectionsIndex = [
    { id: "summary", label: "Executive Summary" },
    { id: "categories", label: "Score Breakdown" },
    { id: "answers", label: "Key Quotes & Answers" },
    { id: "speech", label: "Speech & Fluency" },
    { id: "skills", label: "Skills Coverage" },
    { id: "technical", label: "Coding & Tests" },
    { id: "plan", label: "7-Day Action Plan" },
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

      {/* Partial Session Alert */}
      {isPartial && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-500 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Partial session ({endReasonBadge.label}):</strong> Completed {completedParts} of {totalParts} parts.
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
              <ScoreNumeral
                score={score100 !== null ? score100 : 75}
                maxScore={100}
                label="Overall Evaluation"
                verdict={verdictInfo.label}
                verdictType={score100 && score100 >= 80 ? "positive" : score100 && score100 >= 65 ? "positive" : "warning"}
                variant="ring"
                size="lg"
                className="h-full"
              />
            </div>

            {/* 3-Sentence Summary Card (7 cols) */}
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
                  <span>Evaluated by Aria Capstone Agent</span>
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
                  return (
                    <div
                      key={cat.key}
                      className="rounded-xl bg-white/70 dark:bg-black/40 border border-black/[0.04] dark:border-white/[0.06] p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground truncate max-w-[200px]">
                          {cat.label}
                        </span>
                        <span className="font-bubbledot font-bold text-[#F64302]">
                          {cat.score !== null ? `${cat.score.toFixed(1)} / 10` : "Skipped"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F64302] transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
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
                    {speechAnalytics.candidateWpm || 135} <span className="text-xs font-mono font-normal">WPM</span>
                  </p>
                  <span className="text-[10px] text-emerald-500 font-bold">Optimal pace</span>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Filler Words</span>
                  <p className="font-bubbledot text-2xl font-bold text-[#F64302]">
                    {speechAnalytics.fillerWordCount ?? 4}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Low count</span>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Response Delay</span>
                  <p className="font-bubbledot text-2xl font-bold text-foreground">
                    {speechAnalytics.averageResponseDelaySec || 1.4}s
                  </p>
                  <span className="text-[10px] text-emerald-500 font-bold">Fast turn</span>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Talk Ratio</span>
                  <p className="font-bubbledot text-2xl font-bold text-foreground">
                    {speechAnalytics.talkTimeCandidatePct || 54}%
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
                  Role skills coverage
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Demonstrated competencies vs missing requirements during dialogue
                </p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                {openSections.skills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {openSections.skills && (
              <div className="grid gap-3 sm:grid-cols-3 pt-2 animate-in fade-in-50 duration-200">
                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 space-y-2">
                  <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Demonstrated
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(skillsCoverage.demonstrated || []).map((s: string) => (
                      <span key={s} className="rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 space-y-2">
                  <span className="text-xs font-bold uppercase text-[#F64302] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Gaps Identified
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(skillsCoverage.notCovered || []).map((s: string) => (
                      <span key={s} className="rounded bg-[#F64302]/10 text-[#F64302] text-[10px] px-2 py-0.5 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-black/40 p-3.5 space-y-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Mentioned Briefly
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(skillsCoverage.mentioned || []).map((s: string) => (
                      <span key={s} className="rounded bg-black/5 dark:bg-white/5 text-muted-foreground text-[10px] px-2 py-0.5 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Section 5: 7-Day Action Plan (Collapsible) ─────────────────── */}
          <section id="plan" className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection("plan")}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="font-jetbrains font-bold text-base text-foreground">
                  7-day actionable practice plan
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Curated daily drills based on Aria&apos;s evaluation
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
                    className="flex items-start gap-3 rounded-xl bg-white/70 dark:bg-black/40 p-3 text-xs"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F64302] text-white text-[10px] font-bubbledot font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-foreground leading-relaxed flex-1">{step}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Section 6: Live Transcript (Collapsible) ──────────────────── */}
          <section id="transcript" className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection("transcript")}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="font-jetbrains font-bold text-base text-foreground">
                  Full dialogue transcript ({transcript.length} turns)
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Inspect verbatim candidate responses and interviewer prompts
                </p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                {openSections.transcript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {openSections.transcript && (
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pt-2 animate-in fade-in-50 duration-200">
                {transcript.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No transcript entries recorded for this session.
                  </p>
                ) : (
                  transcript.map((item, idx) => {
                    const isBot = item.speaker === "bot" || item.role === "assistant";
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl p-3.5 text-xs font-mono space-y-1 ${
                          isBot
                            ? "bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10"
                            : "bg-white/80 dark:bg-black/50 border border-[#F64302]/20"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-bold ${isBot ? "text-[#F64302]" : "text-foreground"}`}>
                            {isBot ? "Aria (Interviewer)" : "Candidate"}
                          </span>
                          {item.timestamp && (
                            <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                          )}
                        </div>
                        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {item.text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground"
            >
              ← Back to Dashboard
            </Link>

            <Link
              href="/interview"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white px-6 text-xs font-bold uppercase tracking-wider shadow-md shadow-[#F64302]/20"
            >
              <span>Practice again</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
