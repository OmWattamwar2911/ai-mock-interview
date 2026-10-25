"use client";

import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnifiedResultView } from "./unified-result-view";
import type { UnifiedAnalyzerResult } from "@/lib/analyzer/types";

interface PortfolioPanelProps {
  targetRole?: string;
  targetJdText?: string;
  onAnalysisComplete?: (score: number) => void;
}

export function PortfolioPanel({
  targetRole = "Software Engineer",
  targetJdText = "",
  onAnalysisComplete,
}: PortfolioPanelProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnifiedAnalyzerResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let cleanUrl = url.trim();
    if (!cleanUrl) {
      setError("Please enter your portfolio website URL.");
      return;
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
      setUrl(cleanUrl);
    }

    setLoading(true);
    setLoadingStep("Validating safe endpoint (SSRF & DNS guard)...");

    try {
      setLoadingStep("Auditing semantic HTML, meta tags, and case studies...");
      const res = await fetch("/api/analyzer/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cleanUrl,
          targetRole,
          targetJdText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to audit portfolio.");
      }

      setResult(data.result);
      if (onAnalysisComplete) {
        onAnalysisComplete(data.result.score);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during portfolio audit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {result ? (
        <UnifiedResultView result={result} onRetest={() => setResult(null)} />
      ) : (
        <form onSubmit={handleAnalyze} className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 sm:p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-foreground">Portfolio Website Auditor</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Audits semantic architecture, downloadable resume links, mobile responsiveness, accessibility tags, and project case study depth.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Portfolio or Personal Engineering Blog URL *
            </label>
            <div className="relative mt-1.5">
              <Input
                className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs pl-9"
                placeholder="https://yourname.dev or https://portfolio.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                required
              />
              <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Protected by server-side SSRF filters (localhost and private IPs strictly blocked). No third-party screenshots stored.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-muted-foreground">
              Maximum 5-second fetch timeout and 2MB payload cap.
            </span>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 px-6 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md shadow-[#F64302]/20"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {loadingStep || "Auditing Portfolio..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run Portfolio Audit
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
