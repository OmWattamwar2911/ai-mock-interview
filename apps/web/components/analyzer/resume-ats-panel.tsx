"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  LayoutList,
  Layers,
} from "lucide-react";
import type { AtsAnalysis } from "@rehearse/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ResumeAtsPanelProps {
  initialTargetRole?: string;
  initialJobDescription?: string;
  onAnalysisComplete?: (score: number, role: string) => void;
}

export function ResumeAtsPanel({
  initialTargetRole = "Software Engineer",
  initialJobDescription = "",
  onAnalysisComplete,
}: ResumeAtsPanelProps) {
  const router = useRouter();

  // Inputs
  const [jobRole, setJobRole] = useState(initialTargetRole);
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [file, setFile] = useState<File | null>(null);
  const [existingResumes, setExistingResumes] = useState<Array<{ id: string; fileName: string; atsAnalysis?: AtsAnalysis }>>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [useExisting, setUseExisting] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AtsAnalysis | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (initialTargetRole) setJobRole(initialTargetRole);
    if (initialJobDescription) setJobDescription(initialJobDescription);
  }, [initialTargetRole, initialJobDescription]);

  // Fetch existing resumes on mount
  useEffect(() => {
    fetch("/api/resumes")
      .then((res) => res.json())
      .then((data) => {
        if (data?.resumes && Array.isArray(data.resumes)) {
          setExistingResumes(data.resumes);
          if (data.resumes.length > 0) {
            setSelectedResumeId(data.resumes[0].id);
            if (data.resumes[0].atsAnalysis) {
              setAnalysis(data.resumes[0].atsAnalysis);
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!jobRole.trim()) {
      setError("Please specify the target job role.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please paste the target job description.");
      return;
    }
    if (!useExisting && !file && !selectedResumeId) {
      setError("Please upload a resume file (PDF, DOCX, or TXT).");
      return;
    }

    setLoading(true);

    try {
      let res: Response;
      if (!useExisting && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("jobRole", jobRole);
        formData.append("jobDescriptionText", jobDescription);
        res = await fetch("/api/resumes/analyze", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/resumes/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            resumeId: selectedResumeId,
            jobRole,
            jobDescriptionText: jobDescription,
          }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to analyze resume. Please try again.");
      }

      if (!data.atsAnalysis) {
        throw new Error("Invalid response received from analyzer engine.");
      }

      setAnalysis(data.atsAnalysis);
      if (onAnalysisComplete) {
        onAnalysisComplete(data.atsAnalysis.overallAtsScore, jobRole);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during resume analysis.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 60) return "text-amber-500 border-amber-500/30 bg-amber-500/10";
    return "text-rose-500 border-rose-500/30 bg-rose-500/10";
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form onSubmit={handleAnalyze} className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 sm:p-6 space-y-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Target Role & JD */}
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Target Job Role *
              </label>
              <Input
                className="mt-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
                placeholder="e.g. Senior Backend Engineer"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Job Description *
              </label>
              <Textarea
                className="mt-1.5 min-h-[160px] rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs leading-relaxed resize-none"
                placeholder="Paste the full job description requirements and responsibilities here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Resume Upload / Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Resume Document *
              </label>
              {existingResumes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUseExisting(!useExisting)}
                  className="text-xs text-[#F64302] hover:underline font-semibold"
                >
                  {useExisting ? "Upload new file" : "Select saved resume"}
                </button>
              )}
            </div>

            {useExisting && existingResumes.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 p-2.5 text-xs font-mono"
                  disabled={loading}
                >
                  {existingResumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fileName} {r.atsAnalysis ? `(ATS: ${r.atsAnalysis.overallAtsScore}%)` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Re-analyzing will update your saved ATS report for this target role.
                </p>
              </div>
            ) : (
              <div>
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                    dragOver ? "border-[#F64302] bg-[#F64302]/5" : "border-black/10 dark:border-white/10 hover:border-[#F64302]/40 bg-white/40 dark:bg-black/30"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const dropped = e.dataTransfer.files[0];
                    if (dropped) setFile(dropped);
                  }}
                >
                  <UploadCloud className="h-8 w-8 text-[#F64302] mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {file ? file.name : "Drop resume file or click to browse"}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-1">PDF, DOCX, or TXT up to 5MB</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={(e) => {
                      const selected = e.target.files?.[0];
                      if (selected) setFile(selected);
                    }}
                    disabled={loading}
                  />
                </label>
                {file && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading}
            className="gap-2 px-6 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md shadow-[#F64302]/20"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing ATS Compatibility...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run ATS Resume Analysis
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Results Section */}
      {analysis && (
        <div className="space-y-6 animate-in fade-in duration-300 font-mono">
          {/* Top Score Banner */}
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="flex items-center gap-6">
                <div
                  className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border-2 font-mono ${getScoreColor(
                    analysis.overallAtsScore
                  )}`}
                >
                  <span className="font-bubbledot text-4xl font-bold">{analysis.overallAtsScore}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold">ATS Score</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">ATS Compatibility Audit</h2>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${getScoreColor(
                        analysis.overallAtsScore
                      )}`}
                    >
                      {analysis.overallAtsScore >= 80 ? "HIGH MATCH" : analysis.overallAtsScore >= 60 ? "MODERATE MATCH" : "NEEDS OPTIMIZATION"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">{analysis.summary}</p>
                </div>
              </div>

              <Button
                onClick={() => router.push("/interview")}
                className="gap-2 shrink-0 rounded-xl border border-[#F64302]/40 bg-[#F64302]/10 text-[#F64302] hover:bg-[#F64302]/20 font-bold text-xs uppercase tracking-wider"
                variant="outline"
              >
                Rehearse Interview Round <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Transparent Breakdown Equation */}
            <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                <TrendingUp className="h-4 w-4 text-[#F64302]" /> Transparent Scoring Breakdown
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Keyword Match */}
                <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Keyword Match</span>
                    <span>40% weight</span>
                  </div>
                  <div className="font-bubbledot text-2xl font-bold text-[#F64302]">
                    {analysis.breakdown.keywordMatch.score}%
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">{analysis.breakdown.keywordMatch.details}</p>
                </div>

                {/* 2. Formatting */}
                <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Formatting</span>
                    <span>20% weight</span>
                  </div>
                  <div className="font-bubbledot text-2xl font-bold text-[#F64302]">
                    {analysis.breakdown.formatting.score}%
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">{analysis.breakdown.formatting.details}</p>
                </div>

                {/* 3. Section Completeness */}
                <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Completeness</span>
                    <span>20% weight</span>
                  </div>
                  <div className="font-bubbledot text-2xl font-bold text-[#F64302]">
                    {analysis.breakdown.sectionCompleteness.score}%
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">{analysis.breakdown.sectionCompleteness.details}</p>
                </div>

                {/* 4. LLM Judgement */}
                <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Technical Judgement</span>
                    <span>20% weight</span>
                  </div>
                  <div className="font-bubbledot text-2xl font-bold text-[#F64302]">
                    {analysis.breakdown.llmJudgement.score}%
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">{analysis.breakdown.llmJudgement.details}</p>
                </div>
              </div>
              <p className="mt-3 font-mono text-[10px] text-muted-foreground text-center">
                Formula: {analysis.breakdown.calculationFormula}
              </p>
            </div>
          </div>

          {/* Keywords Breakdown (Matched vs Missing) */}
          <div className="grid gap-3 md:grid-cols-2">
            {/* Matched Keywords */}
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Matched Skills ({analysis.matchedKeywords.length})</span>
              </div>
              {analysis.matchedKeywords.length === 0 ? (
                <p className="text-xs text-muted-foreground">No direct keyword matches detected in the resume text.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.matchedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Keywords */}
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#F64302]">
                <AlertTriangle className="h-4 w-4 text-[#F64302]" />
                <span>Missing Skills from JD ({analysis.missingKeywords.length})</span>
              </div>
              {analysis.missingKeywords.length === 0 ? (
                <p className="text-xs text-emerald-500">All key JD requirements were identified in your resume!</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.missingKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-md border border-[#F64302]/30 bg-[#F64302]/10 px-2 py-0.5 text-[11px] font-semibold text-[#F64302]"
                    >
                      + {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Per-Section Feedback */}
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground">
              <LayoutList className="h-4 w-4 text-[#F64302]" />
              <span>Per-Section Feedback &amp; Completeness</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(analysis.sectionFeedback).map(([sectionKey, item]) => (
                <div key={sectionKey} className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">{sectionKey}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        item.status === "GOOD"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : item.status === "MISSING"
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      }`}
                    >
                      {item.status.replace("_", " ")} ({item.score}%)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.feedback}</p>
                  {item.suggestions && item.suggestions.length > 0 && (
                    <ul className="text-xs space-y-1 pt-1 list-disc list-inside text-muted-foreground">
                      {item.suggestions.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Concrete Rewrite Suggestions */}
          {analysis.rewriteSuggestions && analysis.rewriteSuggestions.length > 0 && (
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 space-y-4">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground">
                <Layers className="h-4 w-4 text-[#F64302]" />
                <span>Actionable Rewrite Recommendations</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Transform passive bullets into high-impact, ATS-optimized statements with action verbs and quantifiable metrics:
              </p>
              <div className="space-y-3">
                {analysis.rewriteSuggestions.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#F64302] uppercase tracking-wider text-[11px]">{item.section}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.suggestion, idx)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-semibold"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Rewrite</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 text-xs">
                      <div className="rounded-lg border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Original Phrasing</span>
                        <p className="text-muted-foreground italic">&ldquo;{item.original}&rdquo;</p>
                      </div>
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                        <span className="text-[10px] uppercase font-bold text-emerald-500 block mb-1">
                          ATS-Optimized Bullet
                        </span>
                        <p className="text-foreground font-semibold">&ldquo;{item.suggestion}&rdquo;</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      <strong className="text-foreground font-semibold">Why this scores higher:</strong> {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
