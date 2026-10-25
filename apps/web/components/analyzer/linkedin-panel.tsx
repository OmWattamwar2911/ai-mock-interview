"use client";

import { useState } from "react";
import {
  UploadCloud,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FileText,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedResultView } from "./unified-result-view";
import type { UnifiedAnalyzerResult } from "@/lib/analyzer/types";
import type { LinkedInSections } from "@/lib/analyzer/linkedin";

interface LinkedInPanelProps {
  targetRole?: string;
  targetJdText?: string;
  onAnalysisComplete?: (score: number) => void;
}

export function LinkedInPanel({
  targetRole = "Software Engineer",
  targetJdText = "",
  onAnalysisComplete,
}: LinkedInPanelProps) {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [profileUrl, setProfileUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  // Sections
  const [sections, setSections] = useState<LinkedInSections>({
    headline: "",
    about: "",
    experience: "",
    skills: "",
    education: "",
    projects: "",
    certifications: "",
    recommendations: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnifiedAnalyzerResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "upload" && !file && !sections.headline) {
      setError("Please select or drop your LinkedIn profile PDF export.");
      return;
    }

    if (mode === "paste" && !sections.headline && !sections.experience && !sections.about) {
      setError("Please paste at least your Headline, Experience, or About section.");
      return;
    }

    setLoading(true);
    setLoadingStep("Parsing profile sections...");

    try {
      let res: Response;
      if (mode === "upload" && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("targetRole", targetRole);
        formData.append("targetJdText", targetJdText);
        if (profileUrl) formData.append("profileUrl", profileUrl);

        setLoadingStep("Running keyword coverage & consistency audit...");
        res = await fetch("/api/analyzer/linkedin", {
          method: "POST",
          body: formData,
        });
      } else {
        setLoadingStep("Evaluating against target role heuristics...");
        res = await fetch("/api/analyzer/linkedin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...sections,
            profileUrl,
            targetRole,
            targetJdText,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to analyze LinkedIn profile.");
      }

      setResult(data.result);
      if (data.sections) {
        setSections(data.sections);
      }
      if (onAnalysisComplete) {
        onAnalysisComplete(data.result.score);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during LinkedIn analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {result ? (
        <UnifiedResultView result={result} onRetest={() => setResult(null)} />
      ) : (
        <form onSubmit={handleAnalyze} className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 sm:p-6 space-y-6 shadow-sm font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">LinkedIn Profile Auditor</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Evaluates keyword density, headline clarity, experience metrics, and cross-checks resume consistency without scraping.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  mode === "upload"
                    ? "bg-[#F64302] text-white shadow-sm"
                    : "bg-white/60 dark:bg-black/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                Upload Profile PDF
              </button>
              <button
                type="button"
                onClick={() => setMode("paste")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  mode === "paste"
                    ? "bg-[#F64302] text-white shadow-sm"
                    : "bg-white/60 dark:bg-black/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                Paste Text Sections
              </button>
            </div>
          </div>

          {/* Profile URL (optional label) */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                LinkedIn Profile URL (Optional Label)
              </label>
              <Input
                className="mt-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
                placeholder="https://linkedin.com/in/username"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setShowHowTo(!showHowTo)}
                className="inline-flex items-center gap-1.5 text-xs text-[#F64302] hover:underline font-semibold"
              >
                <HelpCircle className="w-4 h-4" />
                <span>How to export your profile PDF from LinkedIn</span>
              </button>
            </div>
          </div>

          {/* How-to Callout */}
          {showHowTo && (
            <div className="rounded-xl border border-[#F64302]/30 bg-[#F64302]/10 p-4 text-xs space-y-2 text-foreground">
              <strong className="text-[#F64302] font-bold">Official LinkedIn PDF Export Steps:</strong>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Log in to LinkedIn on your desktop browser.</li>
                <li>Navigate to your personal profile page.</li>
                <li>Click the <strong className="text-foreground font-semibold">More</strong> button located next to your profile picture / Open to button.</li>
                <li>Select <strong className="text-foreground font-semibold">Save to PDF</strong>.</li>
                <li>Upload that generated PDF below. We parse the text client/server side with zero scraping or credential access.</li>
              </ol>
            </div>
          )}

          {/* Input Mode 1: PDF Upload */}
          {mode === "upload" && (
            <div>
              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                  dragOver
                    ? "border-[#F64302] bg-[#F64302]/5"
                    : "border-black/10 dark:border-white/10 hover:border-[#F64302]/40 bg-white/40 dark:bg-black/30"
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
                  {file ? file.name : "Drop exported LinkedIn PDF here or click to browse"}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">LinkedIn generated PDF format up to 5MB</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,application/pdf"
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

          {/* Input Mode 2: Paste Sections */}
          {mode === "paste" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Headline *
                  </label>
                  <Input
                    className="mt-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
                    placeholder="e.g. Senior Software Engineer | Distributed Systems | Python · Go"
                    value={sections.headline}
                    onChange={(e) => setSections({ ...sections, headline: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Skills (Comma Separated)
                  </label>
                  <Input
                    className="mt-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
                    placeholder="Python, PostgreSQL, Docker, AWS, Distributed Systems"
                    value={sections.skills}
                    onChange={(e) => setSections({ ...sections, skills: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  About / Summary Section
                </label>
                <Textarea
                  className="mt-1.5 min-h-[110px] rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs leading-relaxed resize-none"
                  placeholder="Paste your profile About summary..."
                  value={sections.about}
                  onChange={(e) => setSections({ ...sections, about: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Experience Bullets &amp; Roles
                </label>
                <Textarea
                  className="mt-1.5 min-h-[140px] rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs leading-relaxed resize-none"
                  placeholder="Paste work experience titles, companies, dates, and bullet descriptions..."
                  value={sections.experience}
                  onChange={(e) => setSections({ ...sections, experience: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-muted-foreground">
              Privacy Guarantee: Zero web scraping. We never ask for your password or LinkedIn session tokens.
            </span>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 px-6 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md shadow-[#F64302]/20"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {loadingStep || "Analyzing LinkedIn Profile..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run LinkedIn Audit
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
