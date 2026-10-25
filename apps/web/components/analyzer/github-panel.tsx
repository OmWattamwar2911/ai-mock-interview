"use client";

import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  GitBranch,
  Star,
  FolderGit2,
  CheckCircle2,
  XCircle,
  Key,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnifiedResultView } from "./unified-result-view";
import type { UnifiedAnalyzerResult } from "@/lib/analyzer/types";
import type { GitHubCollectedData } from "@/lib/analyzer/github";

interface GitHubPanelProps {
  targetRole?: string;
  targetJdText?: string;
  onAnalysisComplete?: (score: number) => void;
}

export function GitHubPanel({
  targetRole = "Software Engineer",
  targetJdText = "",
  onAnalysisComplete,
}: GitHubPanelProps) {
  const [username, setUsername] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnifiedAnalyzerResult | null>(null);
  const [githubData, setGithubData] = useState<GitHubCollectedData | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Please enter your GitHub username or profile URL.");
      return;
    }

    setLoading(true);
    setLoadingStep("Connecting to official GitHub REST API...");

    try {
      setLoadingStep("Inspecting repository trees, CI workflows, and test files...");
      const res = await fetch("/api/analyzer/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          targetRole,
          targetJdText,
          githubToken: githubToken.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to analyze GitHub profile.");
      }

      setResult(data.result);
      if (data.data) {
        setGithubData(data.data);
      }
      if (onAnalysisComplete) {
        onAnalysisComplete(data.result.score);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during GitHub analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {result ? (
        <div className="space-y-6">
          <UnifiedResultView result={result} onRetest={() => setResult(null)} />

          {/* GitHub Deep-Dive Cards */}
          {githubData && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Language Distribution */}
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground">
                  <GitBranch className="h-4 w-4 text-[#F64302]" />
                  <span>Language Distribution Across Original Repos</span>
                </div>
                <div className="space-y-2 pt-1">
                  {Object.entries(githubData.languages).map(([lang, bytes]) => (
                    <div key={lang} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{lang}</span>
                        <span className="text-muted-foreground text-[11px]">{Math.round(bytes / 1024)} KB</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F64302]"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                8,
                                Math.round(
                                  (bytes /
                                    Math.max(1, Object.values(githubData.languages).reduce((a, b) => a + b, 0))) *
                                    100
                                )
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Repos Checklist */}
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground">
                  <FolderGit2 className="h-4 w-4 text-[#F64302]" />
                  <span>Showcase Repositories Checklist</span>
                </div>
                <div className="space-y-2">
                  {githubData.repos.slice(0, 5).map((r) => (
                    <div
                      key={r.name}
                      className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-3 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground truncate max-w-[200px]">{r.name}</span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Star className="w-3 h-3 text-[#F64302]" /> {r.stars}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {r.hasReadme ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                          README
                        </span>
                        <span className="flex items-center gap-1">
                          {r.hasTests ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                          Tests
                        </span>
                        <span className="flex items-center gap-1">
                          {r.hasCi ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                          CI Actions
                        </span>
                        <span className="flex items-center gap-1">
                          {r.license ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                          License
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleAnalyze} className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 sm:p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-foreground">GitHub Profile &amp; Repository Auditor</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Audits open-source activity, repository engineering hygiene (READMEs, CI/CD, tests), and project tech stack match against your target role.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              GitHub Username or Profile URL *
            </label>
            <Input
              className="mt-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
              placeholder="e.g. torvalds or https://github.com/torvalds"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
            <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
              <span>Public profile data only. We never access private repositories or request OAuth scopes.</span>
              <button
                type="button"
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="inline-flex items-center gap-1 text-[#F64302] hover:underline font-medium"
              >
                <Key className="w-3 h-3" />
                {showTokenInput ? "Hide API Token" : "Have a GitHub PAT? (Optional)"}
                {showTokenInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {showTokenInput && (
            <div className="rounded-xl border border-[#F64302]/20 bg-[#F64302]/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F64302]" />
                  GitHub Personal Access Token (PAT)
                </label>
                <span className="text-[10px] text-[#F64302] font-semibold">5,000 req/hr rate limit</span>
              </div>
              <Input
                type="password"
                className="rounded-lg border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/60 font-mono text-xs"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (fine-grained or classic token)"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                disabled={loading}
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Tokens need <strong>zero scopes/permissions</strong> (public data only). Rehearse also features automatic public web inspection fallback so audits never fail when rate limits are exhausted.
              </p>
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
              Cached for 6 hours per username to respect GitHub REST rate limits.
            </span>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 px-6 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md shadow-[#F64302]/20"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {loadingStep || "Auditing GitHub..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run GitHub Audit
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
