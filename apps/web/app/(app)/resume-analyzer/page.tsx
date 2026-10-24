"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
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
  Award,
} from "lucide-react";
import type { AtsAnalysis, ResumeParsed } from "@rehearse/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ResumeAnalyzerPage() {
  const router = useRouter();

  // Inputs
  const [jobRole, setJobRole] = useState("Software Engineer");
  const [jobDescription, setJobDescription] = useState("");
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
    <div className="mx-auto max-w-5xl space-y-8 py-6 px-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          <h1 className="text-3xl font-bold tracking-tight">ATS Resume Analyzer</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          Upload your resume and enter a target job description to compute a transparent ATS score,
          pinpoint missing keywords, and get concrete bullet rewrite suggestions.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAnalyze} className="rounded-xl border border-border bg-surface p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Target Role & JD */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Target Job Role *
              </label>
              <Input
                className="mt-1.5"
                placeholder="e.g. Senior Backend Engineer"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Job Description *
              </label>
              <Textarea
                className="mt-1.5 min-h-[160px] font-mono text-xs leading-relaxed"
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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Resume Document *
              </label>
              {existingResumes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUseExisting(!useExisting)}
                  className="text-xs text-primary hover:underline font-medium"
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
                  className="w-full rounded-md border border-border bg-background p-2.5 text-sm"
                  disabled={loading}
                >
                  {existingResumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fileName} {r.atsAnalysis ? `(ATS: ${r.atsAnalysis.overallAtsScore}%)` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted">
                  Re-analyzing will update your saved ATS report for this target role.
                </p>
              </div>
            ) : (
              <div>
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                    dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-elevated"
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
                  <UploadCloud className="h-8 w-8 text-muted mb-2" />
                  <span className="text-sm font-medium">
                    {file ? file.name : "Drop your resume or click to browse"}
                  </span>
                  <span className="text-xs text-muted mt-1">PDF, DOCX, or TXT up to 5MB</span>
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
          <div className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={loading} className="gap-2 px-6">
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing ATS Compatibility...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run ATS Analysis
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Results Section */}
      {analysis && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Top Score Banner */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
              <div className="flex items-center gap-6">
                <div
                  className={`flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-2xl border-2 font-mono ${getScoreColor(
                    analysis.overallAtsScore
                  )}`}
                >
                  <span className="text-4xl font-bold">{analysis.overallAtsScore}</span>
                  <span className="text-[10px] uppercase tracking-wider font-sans font-semibold">ATS Score</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">ATS Compatibility Result</h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getScoreColor(
                        analysis.overallAtsScore
                      )}`}
                    >
                      {analysis.overallAtsScore >= 80 ? "High Match" : analysis.overallAtsScore >= 60 ? "Moderate Match" : "Needs Optimization"}
                    </span>
                  </div>
                  <p className="text-sm text-muted max-w-xl">{analysis.summary}</p>
                </div>
              </div>

              <Button
                onClick={() => router.push("/interview")}
                className="gap-2 shrink-0 border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                variant="outline"
              >
                Start AI Mock Interview <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Transparent Breakdown Equation */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted mb-4">
                <TrendingUp className="h-4 w-4" /> Transparent Scoring Breakdown
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Keyword Match */}
                <div className="rounded-lg border border-border bg-background p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Keyword Match</span>
                    <span className="font-mono">40% weight</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    {analysis.breakdown.keywordMatch.score}%
                  </div>
                  <p className="text-xs text-muted leading-tight">{analysis.breakdown.keywordMatch.details}</p>
                </div>

                {/* 2. Formatting */}
                <div className="rounded-lg border border-border bg-background p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Formatting</span>
                    <span className="font-mono">20% weight</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    {analysis.breakdown.formatting.score}%
                  </div>
                  <p className="text-xs text-muted leading-tight">{analysis.breakdown.formatting.details}</p>
                </div>

                {/* 3. Section Completeness */}
                <div className="rounded-lg border border-border bg-background p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Completeness</span>
                    <span className="font-mono">20% weight</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    {analysis.breakdown.sectionCompleteness.score}%
                  </div>
                  <p className="text-xs text-muted leading-tight">{analysis.breakdown.sectionCompleteness.details}</p>
                </div>

                {/* 4. LLM Judgement */}
                <div className="rounded-lg border border-border bg-background p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>LLM Judgement</span>
                    <span className="font-mono">20% weight</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    {analysis.breakdown.llmJudgement.score}%
                  </div>
                  <p className="text-xs text-muted leading-tight">{analysis.breakdown.llmJudgement.details}</p>
                </div>
              </div>
              <p className="mt-3 font-mono text-[11px] text-muted text-center">
                Formula: {analysis.breakdown.calculationFormula}
              </p>
            </div>
          </div>

          {/* Keywords Breakdown (Matched vs Missing) */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Matched Keywords */}
            <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>Matched Keywords &amp; Skills ({analysis.matchedKeywords.length})</span>
                </div>
              </div>
              {analysis.matchedKeywords.length === 0 ? (
                <p className="text-xs text-muted">No direct keyword matches detected in the resume text.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analysis.matchedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Keywords */}
            <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>Missing Keywords from JD ({analysis.missingKeywords.length})</span>
                </div>
              </div>
              {analysis.missingKeywords.length === 0 ? (
                <p className="text-xs text-emerald-400">All key JD requirements were identified in your resume!</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analysis.missingKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400"
                    >
                      + {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Per-Section Feedback */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
            <div className="flex items-center gap-2 font-semibold text-lg">
              <LayoutList className="h-5 w-5 text-primary" />
              <span>Per-Section Feedback &amp; Completeness</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(analysis.sectionFeedback).map(([sectionKey, item]) => (
                <div key={sectionKey} className="rounded-lg border border-border bg-background p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold capitalize">{sectionKey}</span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        item.status === "GOOD"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : item.status === "MISSING"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {item.status.replace("_", " ")} ({item.score}%)
                    </span>
                  </div>
                  <p className="text-xs text-muted">{item.feedback}</p>
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
            <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Layers className="h-5 w-5 text-primary" />
                <span>Concrete Rewrite Suggestions</span>
              </div>
              <p className="text-xs text-muted">
                Transform passive bullets into high-impact, ATS-optimized statements with action verbs and quantifiable metrics:
              </p>
              <div className="space-y-4">
                {analysis.rewriteSuggestions.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-background p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary uppercase tracking-wider">{item.section}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.suggestion, idx)}
                        className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
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
                      <div className="rounded border border-border/60 bg-muted/10 p-3">
                        <span className="text-[10px] uppercase font-semibold text-muted block mb-1">Original Phrasing</span>
                        <p className="text-muted-foreground italic">&ldquo;{item.original}&rdquo;</p>
                      </div>
                      <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-3">
                        <span className="text-[10px] uppercase font-semibold text-emerald-500 block mb-1">
                          ATS-Optimized Suggestion
                        </span>
                        <p className="text-foreground font-medium">&ldquo;{item.suggestion}&rdquo;</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted">
                      <strong>Why this scores higher:</strong> {item.reason}
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
