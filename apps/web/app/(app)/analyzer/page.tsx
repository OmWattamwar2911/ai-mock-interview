"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileText,
  Linkedin,
  Github,
  Code2,
  Globe,
  History,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { ProfileStrengthCard } from "@/components/analyzer/profile-strength-card";
import { ResumeAtsPanel } from "@/components/analyzer/resume-ats-panel";
import { LinkedInPanel } from "@/components/analyzer/linkedin-panel";
import { GitHubPanel } from "@/components/analyzer/github-panel";
import { CodingPanel } from "@/components/analyzer/coding-panel";
import { PortfolioPanel } from "@/components/analyzer/portfolio-panel";
import { AnalyzerHistoryDrawer } from "@/components/analyzer/analyzer-history-drawer";
import { PageHeader } from "@/components/ui/page-header";
import type { AnalyzerType, ProfileStrengthSummary, UnifiedAnalyzerResult } from "@/lib/analyzer/types";

function AnalyzerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get("tab") || "resume").toUpperCase() as AnalyzerType;

  const validTabs: AnalyzerType[] = ["RESUME", "LINKEDIN", "GITHUB", "CODING", "PORTFOLIO"];
  const [activeTab, setActiveTab] = useState<AnalyzerType>(
    validTabs.includes(tabParam) ? tabParam : "RESUME"
  );

  const [strength, setStrength] = useState<ProfileStrengthSummary | null>(null);
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [targetJdText, setTargetJdText] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  // Sync tab with URL
  const switchTab = (tab: AnalyzerType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab.toLowerCase());
    router.replace(`/analyzer?${params.toString()}`, { scroll: false });
  };

  const loadProfileStrength = async () => {
    try {
      const res = await fetch("/api/analyzer/profile-strength");
      if (res.ok) {
        const data = await res.json();
        setStrength(data.strength);
        if (data.context) {
          setTargetRole(data.context.targetRole || "Software Engineer");
          setTargetJdText(data.context.jobDescriptionText || "");
        }
      }
    } catch (err) {
      console.error("Failed to load profile strength:", err);
    }
  };

  useEffect(() => {
    loadProfileStrength();
  }, []);

  const handleUpdateContext = async (role: string, jd: string) => {
    setTargetRole(role);
    setTargetJdText(jd);
    await fetch("/api/analyzer/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetRole: role, jobDescriptionText: jd }),
    });
  };

  const tabsConfig: Array<{
    type: AnalyzerType;
    label: string;
    icon: any;
    desc: string;
  }> = [
    { type: "RESUME", label: "Resume ATS", icon: FileText, desc: "ATS score, keyword density, and bullet rewrites" },
    { type: "LINKEDIN", label: "LinkedIn", icon: Linkedin, desc: "Recruiter headline clarity, impact verbs, resume consistency" },
    { type: "GITHUB", label: "GitHub", icon: Github, desc: "Repo quality, CI/CD, unit tests, code hygiene" },
    { type: "CODING", label: "Coding Profiles", icon: Code2, desc: "LeetCode & Codeforces volume, topics, contest readiness" },
    { type: "PORTFOLIO", label: "Portfolio", icon: Globe, desc: "Semantic HTML, case study depth, resume links, mobile audit" },
  ];

  return (
    <div className="space-y-6 font-mono pb-12">
      <PageHeader
        eyebrow="Profile intelligence"
        title="Analyzer"
        subtitle="Check how your resume, LinkedIn, GitHub and coding profiles read to a recruiter, and get concrete fixes."
        action={
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/70 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 border border-black/5 dark:border-white/10 text-foreground transition-all shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-[#F64302]" />
            <span>Past runs</span>
          </button>
        }
      />

      {/* ── TOP BANNER & STRENGTH OVERVIEW ───────────────────────────────── */}
      <ProfileStrengthCard
        strength={strength}
        targetRole={targetRole}
        targetJdText={targetJdText}
        onUpdateContext={handleUpdateContext}
        onSelectTab={switchTab}
        activeTab={activeTab}
      />

      {/* ── TABS NAVIGATION BAR ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Analyzer Tabs">
          {tabsConfig.map((t) => {
            const active = activeTab === t.type;
            const Icon = t.icon;
            return (
              <button
                key={t.type}
                role="tab"
                aria-selected={active}
                onClick={() => switchTab(t.type)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-[#F64302] text-white shadow-sm"
                    : "bg-white/60 dark:bg-black/40 text-muted-foreground hover:text-foreground hover:bg-white/80 dark:hover:bg-black/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors self-end sm:self-auto"
        >
          <History className="w-3.5 h-3.5 text-[#F64302]" />
          <span>Past Runs &amp; Compare</span>
        </button>
      </div>

      {/* ── ACTIVE ANALYZER PANEL ────────────────────────────────────────── */}
      <div className="pt-2">
        {activeTab === "RESUME" && (
          <ResumeAtsPanel
            initialTargetRole={targetRole}
            initialJobDescription={targetJdText}
            onAnalysisComplete={() => loadProfileStrength()}
          />
        )}

        {activeTab === "LINKEDIN" && (
          <LinkedInPanel
            targetRole={targetRole}
            targetJdText={targetJdText}
            onAnalysisComplete={() => loadProfileStrength()}
          />
        )}

        {activeTab === "GITHUB" && (
          <GitHubPanel
            targetRole={targetRole}
            targetJdText={targetJdText}
            onAnalysisComplete={() => loadProfileStrength()}
          />
        )}

        {activeTab === "CODING" && (
          <CodingPanel
            targetRole={targetRole}
            onAnalysisComplete={() => loadProfileStrength()}
          />
        )}

        {activeTab === "PORTFOLIO" && (
          <PortfolioPanel
            targetRole={targetRole}
            targetJdText={targetJdText}
            onAnalysisComplete={() => loadProfileStrength()}
          />
        )}
      </div>

      {/* ── HISTORY DRAWER ───────────────────────────────────────────────── */}
      <AnalyzerHistoryDrawer
        type={activeTab}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectRun={(run) => {
          // You can view or inspect the past run
        }}
      />
    </div>
  );
}

export default function AnalyzerPage() {
  return (
    <Suspense fallback={<p className="text-xs font-mono text-muted-foreground p-8">Loading Professional Analyzer...</p>}>
      <AnalyzerContent />
    </Suspense>
  );
}
