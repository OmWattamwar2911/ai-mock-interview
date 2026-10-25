"use client";

import { useState, useMemo } from "react";
import {
  Printer,
  Copy,
  Check,
  RotateCcw,
  Search,
  Filter,
  MessageSquareQuote,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface TranscriptItem {
  role?: string;
  speaker?: string;
  text: string;
  timestamp?: string;
  phase?: string;
}

export function ReportInteractiveActions({
  sessionId,
  overallScore,
  verdict,
  strengths,
  weaknesses,
}: {
  sessionId: string;
  overallScore: number | null;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
}) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = [
      `Rehearse AI Interview Performance Audit`,
      `Session ID: ${sessionId}`,
      `Score: ${overallScore !== null ? `${overallScore} / 10` : "Not evaluated"}`,
      `Verdict: ${verdict}`,
      ``,
      `Key Strengths:`,
      ...strengths.map((s) => `• ${s}`),
      ``,
      `Targeted Growth Areas:`,
      ...weaknesses.map((w) => `• ${w}`),
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button
        variant="outline"
        onClick={handleCopySummary}
        className="h-9 px-3 text-xs gap-1.5 border-black/10 dark:border-white/10 hover:border-[#F64302]/40"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-[#F64302]" />}
        {copied ? "Summary Copied!" : "Copy Summary"}
      </Button>

      <Button
        variant="outline"
        onClick={handlePrint}
        className="h-9 px-3 text-xs gap-1.5 border-black/10 dark:border-white/10 hover:border-[#F64302]/40"
      >
        <Printer className="h-3.5 w-3.5 text-[#F64302]" />
        Save / Print PDF
      </Button>

      <Link
        href="/interview"
        className="h-9 px-4 rounded-xl bg-[#F64302] hover:bg-[#F64302]/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-[#F64302]/20"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Practice Again
      </Link>
    </div>
  );
}

export function ReportInteractiveTranscript({
  transcript,
}: {
  transcript: TranscriptItem[];
}) {
  const [search, setSearch] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState<"all" | "candidate" | "aria">("all");

  const filtered = useMemo(() => {
    return transcript.filter((item) => {
      const isBot = item.role === "assistant" || item.speaker === "Aria" || item.speaker === "bot";
      if (speakerFilter === "candidate" && isBot) return false;
      if (speakerFilter === "aria" && !isBot) return false;
      if (search.trim()) {
        return (item.text || "").toLowerCase().includes(search.toLowerCase());
      }
      return true;
    });
  }, [transcript, search, speakerFilter]);

  if (!transcript || transcript.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="h-4 w-4 text-[#F64302]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Searchable Dialogue Transcript ({transcript.length} turns)
          </h3>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs rounded-lg bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#F64302]"
            />
          </div>

          <div className="flex rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/30 p-0.5 text-xs">
            <button
              onClick={() => setSpeakerFilter("all")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                speakerFilter === "all" ? "bg-[#F64302] text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSpeakerFilter("candidate")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                speakerFilter === "candidate" ? "bg-[#F64302] text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Candidate
            </button>
            <button
              onClick={() => setSpeakerFilter("aria")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                speakerFilter === "aria" ? "bg-[#F64302] text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Aria
            </button>
          </div>
        </div>
      </div>

      {/* Transcript Items */}
      <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No spoken utterances match your search.
          </p>
        ) : (
          filtered.map((msg, i) => {
            const isBot = msg.role === "assistant" || msg.speaker === "Aria" || msg.speaker === "bot";
            return (
              <div
                key={i}
                className={`p-3 rounded-xl text-xs leading-relaxed transition-all ${
                  isBot
                    ? "bg-[#F64302]/10 border border-[#F64302]/25 mr-6 sm:mr-10"
                    : "bg-white/80 dark:bg-black/50 border border-black/5 dark:border-white/10 ml-6 sm:ml-10 text-foreground"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-1">
                  <span className={isBot ? "text-[#F64302] font-bold" : "text-foreground font-bold"}>
                    {isBot ? "Aria (AI Interviewer)" : "Candidate"}
                  </span>
                  <div className="flex items-center gap-2">
                    {msg.phase && (
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-muted-foreground">
                        {msg.phase}
                      </span>
                    )}
                    {msg.timestamp && (
                      <span className="font-mono text-muted-foreground text-[9px]">{msg.timestamp}</span>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
