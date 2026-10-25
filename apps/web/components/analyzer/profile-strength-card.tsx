"use client";

import { useState } from "react";
import {
  Briefcase,
  Edit3,
  Check,
  TrendingUp,
  FileText,
  Linkedin,
  Github,
  Code2,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ProfileStrengthSummary, AnalyzerType } from "@/lib/analyzer/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ProfileStrengthCardProps {
  strength: ProfileStrengthSummary | null;
  targetRole: string;
  targetJdText: string;
  onUpdateContext: (role: string, jd: string) => Promise<void>;
  onSelectTab: (tab: AnalyzerType) => void;
  activeTab: AnalyzerType;
}

export function ProfileStrengthCard({
  strength,
  targetRole,
  targetJdText,
  onUpdateContext,
  onSelectTab,
  activeTab,
}: ProfileStrengthCardProps) {
  const [editingContext, setEditingContext] = useState(false);
  const [roleInput, setRoleInput] = useState(targetRole);
  const [jdInput, setJdInput] = useState(targetJdText);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateContext(roleInput, jdInput);
      setEditingContext(false);
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5";
    if (score >= 80) return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 60) return "text-amber-500 border-amber-500/30 bg-amber-500/10";
    return "text-[#F64302] border-[#F64302]/30 bg-[#F64302]/10";
  };

  const cardsList: Array<{
    type: AnalyzerType;
    label: string;
    icon: any;
    weight: number;
  }> = [
    { type: "RESUME", label: "Resume ATS", icon: FileText, weight: 35 },
    { type: "LINKEDIN", label: "LinkedIn", icon: Linkedin, weight: 20 },
    { type: "GITHUB", label: "GitHub", icon: Github, weight: 25 },
    { type: "CODING", label: "Coding Stats", icon: Code2, weight: 10 },
    { type: "PORTFOLIO", label: "Portfolio", icon: Globe, weight: 10 },
  ];

  return (
    <div className="space-y-3 font-mono">
      {/* ── UNIFIED PROFILE STRENGTH HEADER ───────────────────────────────── */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border-2 transition-all ${getScoreColor(
                strength?.overallScore ?? null
              )}`}
            >
              <span className="font-bubbledot text-4xl font-bold">
                {strength?.overallScore !== null && strength?.overallScore !== undefined
                  ? strength.overallScore
                  : "--"}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                {strength?.overallScore !== null ? "Strength" : "Pending"}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bubbledot text-xs text-[#F64302] uppercase tracking-wider">
                  01 / PROFESSIONAL PRESENCE
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] animate-pulse" />
              </div>
              <h1 className="text-xl sm:text-2xl font-jetbrains font-bold tracking-tight text-foreground">
                UNIFIED PROFILE STRENGTH
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                {strength?.completedCount === 0
                  ? "Run your first analysis below to compute your weighted recruiter presence score."
                  : `Combines ${strength?.completedCount} of 5 presence pillars, renormalised over completed analyzers with calibrated recruiting weights.`}
              </p>
            </div>
          </div>

          {/* Target Role & JD Context summary */}
          <div className="w-full md:w-auto self-stretch md:self-auto flex flex-col justify-between p-3.5 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 text-xs space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                <Briefcase className="w-3.5 h-3.5 text-[#F64302]" />
                <span>Shared Role Target</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingContext(!editingContext)}
                className="text-[11px] text-[#F64302] hover:underline flex items-center gap-1 font-semibold"
              >
                <Edit3 className="w-3 h-3" />
                <span>{editingContext ? "Close" : "Change"}</span>
              </button>
            </div>
            <p className="font-semibold text-foreground truncate max-w-xs">{targetRole || "Software Engineer"}</p>
            <span className="text-[10px] text-muted-foreground">
              {targetJdText ? `${targetJdText.slice(0, 45)}...` : "No JD description text loaded"}
            </span>
          </div>
        </div>

        {/* Expandable Shared Context Editor */}
        {editingContext && (
          <div className="mt-5 pt-5 border-t border-black/5 dark:border-white/10 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-foreground">
                Edit Shared Role &amp; Job Description Context
              </span>
              <span className="text-[10px] text-muted-foreground">
                All 5 analyzer tabs score relevance against this shared role.
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Target Job Role *
                </label>
                <Input
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Target Job Description Text
                </label>
                <Textarea
                  value={jdInput}
                  onChange={(e) => setJdInput(e.target.value)}
                  placeholder="Paste target job description to evaluate keyword coverage..."
                  className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs min-h-[70px] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingContext(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                {saving ? "Saving..." : <><Check className="w-3.5 h-3.5" /> Save Shared Target</>}
              </button>
            </div>
          </div>
        )}

        {/* ── 5 PILLARS BENTO CARDS ────────────────────────────────────────── */}
        <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {cardsList.map((card) => {
            const entry = strength?.scores[card.type];
            const isAnalyzed = entry && typeof entry.score === "number";
            const isCurrent = activeTab === card.type;
            const Icon = card.icon;

            return (
              <button
                key={card.type}
                type="button"
                onClick={() => onSelectTab(card.type)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2.5 ${
                  isCurrent
                    ? "border-[#F64302] bg-white dark:bg-black/60 shadow-sm"
                    : "border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 hover:border-[#F64302]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-[#F64302]" />
                    <span className="font-bold text-xs text-foreground">{card.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold">{card.weight}%</span>
                </div>

                <div className="flex items-baseline justify-between">
                  {isAnalyzed ? (
                    <span className="font-bubbledot text-2xl font-bold text-foreground">
                      {entry.score}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground font-semibold">Not analysed</span>
                  )}
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isAnalyzed
                        ? entry.score >= 80
                          ? "bg-emerald-500/15 text-emerald-500"
                          : entry.score >= 60
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-[#F64302]/15 text-[#F64302]"
                        : "bg-black/5 dark:bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {isAnalyzed ? "Verified" : "Pending"}
                  </span>
                </div>

                <div className="h-1 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#F64302]"
                    style={{ width: isAnalyzed ? `${entry.score}%` : "0%" }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
