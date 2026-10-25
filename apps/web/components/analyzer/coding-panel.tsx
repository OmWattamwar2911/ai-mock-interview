"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  Code2,
  Trophy,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnifiedResultView } from "./unified-result-view";
import type { UnifiedAnalyzerResult } from "@/lib/analyzer/types";

interface CodingPanelProps {
  targetRole?: string;
  onAnalysisComplete?: (score: number) => void;
}

export function CodingPanel({
  targetRole = "Software Engineer",
  onAnalysisComplete,
}: CodingPanelProps) {
  const [platform, setPlatform] = useState<"leetcode" | "codeforces" | "codechef" | "hackerrank" | "geeksforgeeks">("leetcode");
  const [handle, setHandle] = useState("");
  const [isManualEntry, setIsManualEntry] = useState(false);

  // Manual fields
  const [totalSolved, setTotalSolved] = useState<number>(120);
  const [easySolved, setEasySolved] = useState<number>(45);
  const [mediumSolved, setMediumSolved] = useState<number>(60);
  const [hardSolved, setHardSolved] = useState<number>(15);
  const [rating, setRating] = useState<number>(1650);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnifiedAnalyzerResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!handle.trim()) {
      setError("Please enter your platform handle or username.");
      return;
    }

    setLoading(true);
    setLoadingStep(`Connecting to ${platform.toUpperCase()} profile...`);

    try {
      const payload: any = {
        platform,
        handle: handle.trim(),
        targetRole,
      };

      if (isManualEntry || platform === "codechef" || platform === "hackerrank" || platform === "geeksforgeeks") {
        payload.manualStats = {
          totalSolved: Number(totalSolved),
          easySolved: Number(easySolved),
          mediumSolved: Number(mediumSolved),
          hardSolved: Number(hardSolved),
          rating: Number(rating) || undefined,
        };
      }

      setLoadingStep("Evaluating algorithmic breadth and difficulty progression...");
      const res = await fetch("/api/analyzer/coding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to analyze coding profile.");
      }

      setResult(data.result);
      if (onAnalysisComplete) {
        onAnalysisComplete(data.result.score);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during coding profile analysis.");
    } finally {
      setLoading(false);
    }
  };

  const platformsList = [
    { id: "leetcode", name: "LeetCode", subtitle: "Live GraphQL Sync" },
    { id: "codeforces", name: "Codeforces", subtitle: "Official REST API" },
    { id: "codechef", name: "CodeChef", subtitle: "Manual Stats" },
    { id: "hackerrank", name: "HackerRank", subtitle: "Manual Stats" },
    { id: "geeksforgeeks", name: "GeeksforGeeks", subtitle: "Manual Stats" },
  ] as const;

  return (
    <div className="space-y-6 font-mono">
      {result ? (
        <div className="space-y-6">
          <UnifiedResultView result={result} onRetest={() => setResult(null)} />

          {/* Readiness Estimate & OA Practice CTA */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Interview Readiness Estimate */}
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground">
                <Trophy className="h-4 w-4 text-[#F64302]" />
                <span>Company Tier Readiness Estimates</span>
              </div>
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-black/40 border border-black/5 dark:border-white/10">
                  <span className="font-semibold text-foreground">Early-Stage &amp; High-Growth Startups</span>
                  <span className="font-bold text-emerald-500">
                    {(result.rewrites?.readinessEstimate as any)?.startup || "Ready"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-black/40 border border-black/5 dark:border-white/10">
                  <span className="font-semibold text-foreground">Mid-Tier Enterprise &amp; Scaleups</span>
                  <span className="font-bold text-[#F64302]">
                    {(result.rewrites?.readinessEstimate as any)?.midTier || "In Progress"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-black/40 border border-black/5 dark:border-white/10">
                  <span className="font-semibold text-foreground">Tier-1 FAANG &amp; Big Tech</span>
                  <span className="font-bold text-muted-foreground">
                    {(result.rewrites?.readinessEstimate as any)?.bigTech || "Needs Practice"}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Estimates based on problem volume, difficulty progression, and timed contest rating.
              </p>
            </div>

            {/* Direct Rehearse OA Link */}
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#F64302]">
                  <Code2 className="h-4 w-4" />
                  <span>Targeted OA Practice Link</span>
                </div>
                <h3 className="text-base font-bold text-foreground mt-2">
                  Practice Identified Weak Topics in Rehearse Sandbox
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Your analysis highlighted gaps in{" "}
                  <strong className="text-foreground">
                    {((result.rewrites?.weakestTopics as string[]) || ["Dynamic Programming", "Trees"]).slice(0, 2).join(" & ")}
                  </strong>. Run verified solutions against real test cases in the sandbox right now.
                </p>
              </div>

              <Link
                href="/oa"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#F64302] hover:bg-[#d93800] px-4 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md shadow-[#F64302]/20"
              >
                <span>Launch Rehearse OA Practice</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAnalyze} className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 sm:p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-foreground">Coding Profiles Auditor</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Syncs public problem-solving metrics from LeetCode, Codeforces, and manual profiles to assess volume, topic breadth, and difficulty progression.
            </p>
          </div>

          {/* Platform Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Select Coding Platform
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {platformsList.map((p) => {
                const active = platform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPlatform(p.id);
                      if (p.id === "codechef" || p.id === "hackerrank" || p.id === "geeksforgeeks") {
                        setIsManualEntry(true);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      active
                        ? "border-[#F64302] bg-[#F64302]/10 text-foreground"
                        : "border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="font-bold text-xs">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{p.subtitle}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Handle */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {platform.toUpperCase()} Handle / Username *
            </label>
            <Input
              className="mt-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
              placeholder={`Enter your ${platform} handle (e.g. neetcode)`}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Manual Entry Toggle / Fields */}
          {(isManualEntry || platform === "codechef" || platform === "hackerrank" || platform === "geeksforgeeks") && (
            <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Manual Stats Entry (Verified Without Scraping)
                </span>
                {platform !== "codechef" && platform !== "hackerrank" && platform !== "geeksforgeeks" && (
                  <button
                    type="button"
                    onClick={() => setIsManualEntry(false)}
                    className="text-[11px] text-[#F64302] hover:underline"
                  >
                    Switch to automated API fetch
                  </button>
                )}
              </div>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-5 text-xs">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Total Solved</label>
                  <Input
                    type="number"
                    value={totalSolved}
                    onChange={(e) => setTotalSolved(Number(e.target.value))}
                    className="rounded-xl bg-white/70 dark:bg-black/40 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Easy</label>
                  <Input
                    type="number"
                    value={easySolved}
                    onChange={(e) => setEasySolved(Number(e.target.value))}
                    className="rounded-xl bg-white/70 dark:bg-black/40 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Medium</label>
                  <Input
                    type="number"
                    value={mediumSolved}
                    onChange={(e) => setMediumSolved(Number(e.target.value))}
                    className="rounded-xl bg-white/70 dark:bg-black/40 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Hard</label>
                  <Input
                    type="number"
                    value={hardSolved}
                    onChange={(e) => setHardSolved(Number(e.target.value))}
                    className="rounded-xl bg-white/70 dark:bg-black/40 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Contest Rating</label>
                  <Input
                    type="number"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="rounded-xl bg-white/70 dark:bg-black/40 font-mono text-xs"
                  />
                </div>
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
              {platform === "leetcode"
                ? "Note: LeetCode uses a public GraphQL adapter. If Cloudflare blocks request, use manual stats entry."
                : "Official public endpoints used."}
            </span>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 px-6 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md shadow-[#F64302]/20"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {loadingStep || "Analyzing Coding Profile..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run Coding Audit
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
