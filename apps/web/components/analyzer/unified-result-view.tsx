"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Printer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { UnifiedAnalyzerResult } from "@/lib/analyzer/types";
import { Button } from "@/components/ui/button";

interface UnifiedResultViewProps {
  result: UnifiedAnalyzerResult;
  onRetest?: () => void;
}

export function UnifiedResultView({ result, onRetest }: UnifiedResultViewProps) {
  const router = useRouter();
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 60) return "text-amber-500 border-amber-500/30 bg-amber-500/10";
    return "text-[#F64302] border-[#F64302]/30 bg-[#F64302]/10";
  };

  const copySummaryText = () => {
    const text = `Rehearse ${result.type} Audit for ${result.subject} (Target: ${result.targetRole || "General"})\nScore: ${result.score}/100\n\nBreakdown:\n${result.breakdown.map((b) => `- ${b.name}: ${b.score}/${b.max}`).join("\n")}\n\nTop Recommendations:\n${result.recommendations.map((r) => `* [${r.priority}] ${r.title}: ${r.why}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-mono animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border-2 ${getScoreColor(
                result.score
              )}`}
            >
              <span className="font-bubbledot text-4xl font-bold">{result.score}</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold">Audit Score</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bubbledot text-xs text-[#F64302] uppercase tracking-wider">
                  {result.type} AUDIT
                </span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-xs font-semibold text-foreground truncate max-w-xs">{result.subject}</span>
              </div>
              <h2 className="text-lg font-bold text-foreground">
                {result.score >= 80 ? "Interview & Recruiter Ready" : result.score >= 60 ? "Competitive Profile (With Actionable Fixes)" : "Action Required Before Submitting"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Target Role: <span className="text-foreground font-semibold">{result.targetRole || "Software Engineer"}</span> · Scored on {new Date(result.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
            <button
              type="button"
              onClick={copySummaryText}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 px-3 text-xs font-semibold hover:border-[#F64302]/50 transition-colors"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? "Copied" : "Copy Summary"}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 px-3 text-xs font-semibold hover:border-[#F64302]/50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            {onRetest && (
              <Button
                variant="outline"
                onClick={onRetest}
                className="h-9 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Re-Analyze
              </Button>
            )}
            <Button
              onClick={() => router.push("/interview")}
              className="h-9 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-bold text-xs uppercase tracking-wider gap-1.5"
            >
              <span>Practice in Mock Round</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Breakdown Row */}
        <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-[#F64302]" /> Transparent Scoring Breakdown
            </div>
            <button
              type="button"
              onClick={() => setShowFormula(!showFormula)}
              className="text-[11px] text-[#F64302] hover:underline flex items-center gap-1"
            >
              <span>How is this scored?</span>
              {showFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showFormula && (
            <div className="mb-4 rounded-xl border border-[#F64302]/20 bg-[#F64302]/5 p-3.5 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Scoring Methodology:</p>
              <p>Scored strictly deterministically using rubrics and heuristics calibrated against modern recruiting benchmarks. All categories sum to 100 points maximum.</p>
            </div>
          )}

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {result.breakdown.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground text-[11px]">{item.name}</span>
                  <span className="font-bubbledot font-bold text-[#F64302]">{item.score} / {item.max}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#F64302] transition-all duration-500"
                    style={{ width: `${Math.round((item.score / item.max) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{item.evidence}</p>
                {item.missing && (
                  <p className="text-[10px] text-amber-500 font-medium leading-snug">⚠️ {item.missing}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Findings Section */}
      {result.findings && result.findings.length > 0 && (
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground">
            <AlertTriangle className="h-4 w-4 text-[#F64302]" />
            <span>Key Observations &amp; Red Flags ({result.findings.length})</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {result.findings.map((f, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-3.5 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      f.severity === "HIGH"
                        ? "bg-rose-500/15 text-rose-500"
                        : f.severity === "MEDIUM"
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-emerald-500/15 text-emerald-500"
                    }`}
                  >
                    {f.severity}
                  </span>
                  <span className="text-xs font-bold text-foreground">{f.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.detail}</p>
                {f.evidence && (
                  <div className="text-[10px] text-muted-foreground/80 font-mono bg-black/5 dark:bg-white/5 p-1.5 rounded">
                    Evidence: {f.evidence}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations & Actionable Rewrites */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground">
            <Sparkles className="h-4 w-4 text-[#F64302]" />
            <span>Prioritized Recommendations &amp; Action Plan</span>
          </div>
          <div className="space-y-2.5">
            {result.recommendations.map((r, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground text-sm">{r.title}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      r.priority === "HIGH"
                        ? "bg-[#F64302]/15 text-[#F64302]"
                        : "bg-black/10 dark:bg-white/10 text-muted-foreground"
                    }`}
                  >
                    {r.priority} PRIORITY
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Why it matters:</strong> {r.why}
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">How to fix:</strong> {r.how}
                </p>
                {r.example && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs text-foreground font-semibold">
                    Example: {r.example}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specialized Rewrites Drawer (Headlines, About drafts, READMEs) */}
      {result.rewrites && (
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground">
            <Sparkles className="h-4 w-4 text-[#F64302]" />
            <span>AI Drafted Content &amp; Optimization Assets</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Grounded strictly in data you provided. Placeholders like <code className="text-[#F64302]">[add metric]</code> denote areas where you can supply your actual production figures.
          </p>

          {result.rewrites.headlineOptions && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase text-foreground">Headline Alternatives:</span>
              <div className="space-y-1.5">
                {(result.rewrites.headlineOptions as string[]).map((hl, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-white/70 dark:bg-black/40 border border-black/5 dark:border-white/10 p-2.5 text-xs">
                    <span className="font-semibold text-foreground">{hl}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(hl)}
                      className="text-[#F64302] hover:underline text-[11px] font-bold shrink-0 ml-2"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.rewrites.aboutDraft && (
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-bold uppercase text-foreground">Drafted About Narrative:</span>
              <div className="relative rounded-xl bg-white/70 dark:bg-black/40 border border-black/5 dark:border-white/10 p-4 text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                {result.rewrites.aboutDraft}
              </div>
            </div>
          )}

          {result.rewrites.profileReadmeDraft && (
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-bold uppercase text-foreground">Generated GitHub Profile README:</span>
              <pre className="rounded-xl bg-black text-white p-4 text-xs font-mono overflow-auto max-h-60 whitespace-pre-wrap">
                {result.rewrites.profileReadmeDraft}
              </pre>
            </div>
          )}

          {result.rewrites.twoWeekPlan && (
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-bold uppercase text-foreground">2-Week Algorithmic Study Plan:</span>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {(result.rewrites.twoWeekPlan as string[]).map((step, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="font-bubbledot text-[#F64302] text-xs">{(i + 1).toString().padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
