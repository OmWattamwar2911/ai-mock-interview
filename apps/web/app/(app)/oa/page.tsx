"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Briefcase,
  Timer,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Code2,
  ChevronRight,
  History,
  BookOpen,
  Award,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { CodeEditorPanel, Language, Result } from "@/components/code-editor/code-editor-panel";
import { PageHeader } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento-card";
import { DataRow } from "@/components/ui/data-row";
import { StatusChip } from "@/components/ui/status-chip";
import { Toolbar } from "@/components/ui/toolbar";
import { Button } from "@/components/ui/button";

const COMPANIES = [
  "ALL",
  "Google",
  "Amazon",
  "Meta",
  "Microsoft",
  "Apple",
  "Netflix",
  "Uber",
  "Stripe",
  "Bloomberg",
  "LinkedIn",
  "Salesforce",
  "Adobe",
];
const ROLES = [
  "ALL",
  "Backend",
  "Frontend",
  "Fullstack",
  "Systems",
  "DevOps",
  "Data Engineer",
];
const DIFFICULTIES = ["ALL", "EASY", "MEDIUM", "HARD"];

type OaQuestion = {
  id: string;
  title: string;
  text: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  skillTags: string[];
  companyTags: string[];
  roleTags: string[];
  constraints?: string | null;
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: Record<string, string>;
  testCases: Array<{ id: string; input: string; expected: string; hidden: boolean }>;
  totalTestCount: number;
  hiddenTestCount: number;
};

type SubmissionItem = {
  id: string;
  questionId: string;
  language: string;
  sourceCode: string;
  passedCount: number;
  totalCount: number;
  score: number;
  status: string;
  createdAt: string;
  question?: {
    id: string;
    title: string;
    difficulty: string;
    companyTags: string[];
  };
};

export default function OaPracticePage() {
  const [company, setCompany] = useState("ALL");
  const [role, setRole] = useState("ALL");
  const [difficulty, setDifficulty] = useState("ALL");
  const [questions, setQuestions] = useState<OaQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<OaQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [referenceSolution, setReferenceSolution] = useState<Record<string, string> | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [scoreBanner, setScoreBanner] = useState<{ score: number; passed: number; total: number; status: string } | null>(null);

  // Mobile layout switch (questions vs editor)
  const [mobileTab, setMobileTab] = useState<"list" | "editor">("editor");

  // OA Timer (60 minutes standard OA)
  const [timerSeconds, setTimerSeconds] = useState(60 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Fetch Questions
  useEffect(() => {
    async function loadQuestions() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (company !== "ALL") query.set("company", company);
        if (role !== "ALL") query.set("role", role);
        if (difficulty !== "ALL") query.set("difficulty", difficulty);

        const res = await fetch(`/api/oa/questions?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const rawItems: OaQuestion[] = data.questions || [];
          // Never render a card without a title
          const items = rawItems.filter((q) => Boolean(q.title && q.title.trim().length > 0));
          setQuestions(items);

          if (items.length > 0) {
            const savedId = typeof window !== "undefined" ? localStorage.getItem("rehearse_last_oa_question_id") : null;
            const matched = items.find((q) => q.id === (selectedQuestion?.id || savedId));
            const nextSelect = matched || items[0];
            setSelectedQuestion(nextSelect);
            if (typeof window !== "undefined") {
              localStorage.setItem("rehearse_last_oa_question_id", nextSelect.id);
            }
          } else {
            setSelectedQuestion(null);
          }
        }
      } catch (err) {
        console.error("Failed to load questions", err);
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, [company, role, difficulty]);

  // Load Submissions
  const loadSubmissions = async () => {
    try {
      const qId = selectedQuestion ? `?questionId=${selectedQuestion.id}` : "";
      const res = await fetch(`/api/oa/submissions${qId}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to load submissions", err);
    }
  };

  useEffect(() => {
    if (showSubmissions) {
      loadSubmissions();
    }
  }, [showSubmissions, selectedQuestion]);

  // Load Solution
  const handleToggleSolution = async () => {
    if (!showSolution && !referenceSolution && selectedQuestion) {
      try {
        const res = await fetch(`/api/oa/questions/${selectedQuestion.id}/solution`);
        if (res.ok) {
          const data = await res.json();
          setReferenceSolution(data.referenceSolution || {});
        }
      } catch (e) {
        console.error("Failed to fetch solution", e);
      }
    }
    setShowSolution(!showSolution);
  };

  // Run Code
  const handleRun = async (language: Language, sourceCode: string, customInput?: string): Promise<Result> => {
    if (!selectedQuestion) throw new Error("No question selected");
    const res = await fetch("/api/oa/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: selectedQuestion.id,
        language,
        sourceCode,
        submit: false,
        customInput: customInput?.trim() ? customInput : undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Execution failed");
    }
    const data = await res.json();
    return data;
  };

  // Submit Code
  const handleSubmit = async (language: Language, sourceCode: string): Promise<Result> => {
    if (!selectedQuestion) throw new Error("No question selected");
    const res = await fetch("/api/oa/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: selectedQuestion.id,
        language,
        sourceCode,
        submit: true,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Submission failed");
    }
    const data = await res.json();
    setScoreBanner({
      score: data.score,
      passed: data.passedCount,
      total: data.totalCount,
      status: data.status,
    });
    loadSubmissions();
    return data;
  };

  // Check solved set from submissions
  const solvedQuestionIds = new Set(
    submissions.filter((s) => s.status === "PASSED" || s.score === 100).map((s) => s.questionId)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f0eded] dark:bg-[#0b0b0b] text-foreground font-mono overflow-hidden">
      {/* ── Top Bar with Filter Chips & Simulation Timer ──────────────────── */}
      <header className="px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.06] bg-[#EBE8EB] dark:bg-[#141414] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 font-jetbrains font-bold text-sm text-foreground mr-2">
            <Code2 className="w-4 h-4 text-[#F64302]" />
            <span>OA Practice</span>
          </div>

          {/* Company Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:inline" />
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              aria-label="Filter by Company"
              className="rounded-lg px-2.5 py-1 text-[11px] font-mono bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-[#F64302]"
            >
              {COMPANIES.map((c) => (
                <option key={c} value={c} className="bg-background text-foreground">
                  {c === "ALL" ? "All Companies" : c}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:inline" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              aria-label="Filter by Role"
              className="rounded-lg px-2.5 py-1 text-[11px] font-mono bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-[#F64302]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r} className="bg-background text-foreground">
                  {r === "ALL" ? "All Roles" : r}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Chips */}
          <div className="flex items-center gap-1 border-l border-black/10 dark:border-white/10 pl-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold uppercase transition-colors ${
                  difficulty === d
                    ? "bg-[#F64302] text-white shadow-sm"
                    : "bg-white/60 dark:bg-black/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {d === "ALL" ? "All" : d}
              </button>
            ))}
          </div>
        </div>

        {/* Right Timer & Submissions Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Mobile view switcher */}
          <div className="flex md:hidden items-center rounded-lg bg-black/10 dark:bg-white/10 p-0.5 text-[11px]">
            <button
              onClick={() => setMobileTab("list")}
              className={`px-2 py-1 rounded-md ${mobileTab === "list" ? "bg-white dark:bg-black font-bold shadow-sm" : "text-muted-foreground"}`}
            >
              Problems
            </button>
            <button
              onClick={() => setMobileTab("editor")}
              className={`px-2 py-1 rounded-md ${mobileTab === "editor" ? "bg-white dark:bg-black font-bold shadow-sm" : "text-muted-foreground"}`}
            >
              Editor
            </button>
          </div>

          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs border ${
              timerSeconds < 300
                ? "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse"
                : "bg-white/70 dark:bg-black/40 border-black/10 dark:border-white/10 text-foreground"
            }`}
          >
            <Timer className="w-3.5 h-3.5 text-[#F64302]" />
            <span className="font-bubbledot font-bold tracking-tight text-sm">
              {formatTimer(timerSeconds)}
            </span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="hover:text-[#F64302] transition-colors ml-0.5"
              title={isTimerRunning ? "Pause timer" : "Start timer"}
            >
              {isTimerRunning ? "⏸" : "▶"}
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(60 * 60);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Reset timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => setShowSubmissions(!showSubmissions)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              showSubmissions
                ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                : "bg-white/70 dark:bg-black/40 border-black/10 dark:border-white/10 text-foreground hover:bg-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Submissions</span>
          </button>
        </div>
      </header>

      {/* Score Banner Notification */}
      {scoreBanner && (
        <div
          className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
            scoreBanner.score === 100
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#F64302]" />
            <span className="font-bold">
              Evaluation Result: {scoreBanner.status} ({scoreBanner.score}%)
            </span>
            <span className="text-muted-foreground">
              — Passed {scoreBanner.passed} of {scoreBanner.total} test cases
            </span>
          </div>
          <button
            onClick={() => setScoreBanner(null)}
            className="text-muted-foreground hover:text-foreground text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Split Layout: Questions Drawer + Code Editor ─────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawer / Question Selector */}
        <aside
          className={`w-full md:w-80 border-r border-black/[0.05] dark:border-white/[0.06] bg-[#EBE8EB] dark:bg-[#141414] flex flex-col shrink-0 ${
            mobileTab === "list" ? "flex" : "hidden md:flex"
          }`}
        >
          <div className="p-3.5 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
            <span className="font-jetbrains font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Challenges ({questions.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {loading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Loading OA questions…
              </div>
            ) : questions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
                <AlertCircle className="w-6 h-6 text-muted-foreground/60" />
                <p>No challenges match these filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setCompany("ALL");
                    setRole("ALL");
                    setDifficulty("ALL");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-[11px] hover:opacity-90 transition-opacity"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              questions.map((q) => {
                const isSelected = selectedQuestion?.id === q.id;
                const isSolved = solvedQuestionIds.has(q.id);

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelectedQuestion(q);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("rehearse_last_oa_question_id", q.id);
                      }
                      setShowSolution(false);
                      setReferenceSolution(null);
                      setScoreBanner(null);
                      setMobileTab("editor");
                    }}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all duration-200 border flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-white dark:bg-black/60 border-[#F64302] shadow-sm"
                        : "bg-white/60 dark:bg-black/30 border-black/[0.03] dark:border-white/[0.04] hover:bg-white dark:hover:bg-black/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isSolved ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-black/20 dark:bg-white/20 shrink-0" />
                        )}
                        <span className="font-jetbrains font-semibold text-foreground truncate">
                          {q.title}
                        </span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                          q.difficulty === "EASY"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : q.difficulty === "MEDIUM"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {q.companyTags.map((c) => (
                        <span
                          key={c}
                          className="bg-black/5 dark:bg-white/5 text-foreground font-semibold text-[9px] px-1.5 py-0.5 rounded"
                        >
                          {c}
                        </span>
                      ))}
                      {q.roleTags?.slice(0, 2).map((r) => (
                        <span
                          key={r}
                          className="bg-[#F64302]/10 text-[#F64302] font-semibold text-[9px] px-1.5 py-0.5 rounded"
                        >
                          {r}
                        </span>
                      ))}
                      {q.skillTags.slice(0, 1).map((s) => (
                        <span
                          key={s}
                          className="bg-black/5 dark:bg-white/5 text-muted-foreground text-[9px] px-1.5 py-0.5 rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Code Editor & Problem Panel */}
        <main
          className={`flex-1 flex flex-col overflow-hidden bg-background ${
            mobileTab === "editor" ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedQuestion ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <CodeEditorPanel
                key={selectedQuestion.id}
                title={selectedQuestion.title}
                statement={selectedQuestion.text}
                constraints={selectedQuestion.constraints}
                examples={selectedQuestion.examples}
                difficulty={selectedQuestion.difficulty}
                company={selectedQuestion.companyTags?.[0]}
                role={selectedQuestion.roleTags?.[0]}
                topicTags={selectedQuestion.skillTags || []}
                starterCode={selectedQuestion.starterCode || {}}
                tests={selectedQuestion.testCases || []}
                isLiveSession={false}
                onRun={handleRun}
                onSubmit={handleSubmit}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs flex-col gap-2.5 p-6 text-center">
              <Code2 className="w-8 h-8 text-muted-foreground/40" />
              <p className="font-semibold text-foreground text-sm">No challenge selected</p>
              <p className="text-muted-foreground max-w-sm">
                No coding challenges match your active filter criteria. Clear filters or select another role or company to continue practicing.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCompany("ALL");
                  setRole("ALL");
                  setDifficulty("ALL");
                }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[#F64302] text-white font-semibold text-xs hover:opacity-90 transition-opacity"
              >
                Clear all filters
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
