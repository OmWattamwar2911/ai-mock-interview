"use client";

import { useEffect, useState, useTransition } from "react";
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
} from "lucide-react";
import { CodeEditorPanel, Language, Result } from "@/components/code-editor/code-editor-panel";

const COMPANIES = ["ALL", "Google", "Amazon", "Stripe", "Meta", "Microsoft", "Uber"];
const ROLES = ["ALL", "Backend", "Systems", "Frontend", "Fullstack"];
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
          const items: OaQuestion[] = data.questions || [];
          setQuestions(items);
          if (items.length > 0 && (!selectedQuestion || !items.find((q) => q.id === selectedQuestion.id))) {
            setSelectedQuestion(items[0]);
            setShowSolution(false);
            setReferenceSolution(null);
            setScoreBanner(null);
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

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background text-foreground overflow-hidden">
      {/* Top Filter and OA Controls Bar */}
      <header className="px-4 py-2 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            <Code2 className="w-4 h-4 text-primary" />
            <span>OA Practice</span>
          </div>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Company Selector */}
          <div className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-muted" />
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              aria-label="Filter by Company"
              className="bg-elevated border border-border rounded px-2 py-1 text-xs focus:outline-none"
            >
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "All Companies" : c}
                </option>
              ))}
            </select>
          </div>

          {/* Role Selector */}
          <div className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-muted" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              aria-label="Filter by Role"
              className="bg-elevated border border-border rounded px-2 py-1 text-xs focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r === "ALL" ? "All Roles" : r}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Selector */}
          <div className="flex items-center gap-1">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              aria-label="Filter by Difficulty"
              className="bg-elevated border border-border rounded px-2 py-1 text-xs focus:outline-none"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d === "ALL" ? "All Difficulties" : d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timer & History Controls */}
        <div className="flex items-center gap-3">
          {/* 60m Simulation Timer */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono font-bold text-xs border ${
              timerSeconds < 300
                ? "bg-rose-500/10 border-rose-500 text-rose-400 animate-pulse"
                : "bg-elevated border-border text-foreground"
            }`}
          >
            <Timer className="w-3.5 h-3.5 text-muted" />
            <span>{formatTimer(timerSeconds)}</span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="ml-1 hover:text-primary transition-colors"
              title={isTimerRunning ? "Pause Timer" : "Start OA Timer"}
            >
              {isTimerRunning ? "⏸" : "▶"}
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(60 * 60);
              }}
              className="hover:text-muted transition-colors text-[10px]"
              title="Reset Timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => setShowSubmissions(!showSubmissions)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors ${
              showSubmissions ? "bg-primary text-primary-foreground border-primary" : "bg-elevated border-border text-foreground hover:bg-surface"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Submissions</span>
          </button>
        </div>
      </header>

      {/* Score Banner Notification */}
      {scoreBanner && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
            scoreBanner.score === 100
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span className="font-semibold">
              Submission Result: {scoreBanner.status} ({scoreBanner.score}%)
            </span>
            <span className="text-muted">
              Passed {scoreBanner.passed} of {scoreBanner.total} test cases (including hidden evaluation tests)
            </span>
          </div>
          <button
            onClick={() => setScoreBanner(null)}
            className="text-muted hover:text-foreground text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split Layout: Question Drawer + Code Editor Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawer / Question Selector */}
        <aside className="w-80 border-r border-border bg-surface flex flex-col shrink-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-xs uppercase tracking-wider text-muted">
              Questions ({questions.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="p-4 text-center text-xs text-muted">Loading questions...</div>
            ) : questions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">No questions found matching criteria.</div>
            ) : (
              questions.map((q) => {
                const isSelected = selectedQuestion?.id === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelectedQuestion(q);
                      setShowSolution(false);
                      setReferenceSolution(null);
                      setScoreBanner(null);
                    }}
                    className={`w-full text-left p-3 text-xs transition-colors hover:bg-elevated flex flex-col gap-1.5 ${
                      isSelected ? "bg-elevated border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-foreground line-clamp-1">{q.title}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          q.difficulty === "EASY"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : q.difficulty === "MEDIUM"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {q.companyTags.map((c) => (
                        <span key={c} className="bg-surface text-muted text-[10px] px-1.5 py-0.2 rounded border border-border">
                          {c}
                        </span>
                      ))}
                      {q.roleTags.map((r) => (
                        <span key={r} className="bg-surface text-muted text-[10px] px-1.5 py-0.2 rounded border border-border">
                          {r}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Middle/Right: Code Editor & Submissions or Solution */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {selectedQuestion ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Optional Solutions & Submissions bar */}
              <div className="px-4 py-1.5 bg-surface border-b border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted">Target Company:</span>
                  <span className="font-semibold text-foreground">
                    {selectedQuestion.companyTags.join(", ") || "General"}
                  </span>
                  <span className="text-muted ml-2">Roles:</span>
                  <span className="text-foreground">{selectedQuestion.roleTags.join(", ")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleSolution}
                    className="flex items-center gap-1 px-2 py-0.5 rounded border border-border hover:bg-elevated text-xs transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    <span>{showSolution ? "Hide Solution" : "View Reference Solution"}</span>
                  </button>
                </div>
              </div>

              {/* Reference Solution Drawer / Banner if open */}
              {showSolution && (
                <div className="p-4 bg-elevated/70 border-b border-border max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-primary flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> Reference Solutions (Official Canonical Answers)
                    </span>
                    <button onClick={() => setShowSolution(false)} className="text-xs text-muted hover:text-foreground">
                      Close
                    </button>
                  </div>
                  {referenceSolution ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(referenceSolution).map(([lang, code]) => (
                        <div key={lang} className="bg-surface rounded p-2 border border-border text-xs">
                          <div className="font-bold text-[11px] uppercase text-muted mb-1">{lang}</div>
                          <pre className="font-mono text-[11px] overflow-x-auto p-2 bg-background rounded text-foreground max-h-40">
                            {code}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted">Loading reference solution...</div>
                  )}
                </div>
              )}

              {/* Submissions Modal / Overlay */}
              {showSubmissions && (
                <div className="p-4 bg-surface border-b border-border max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs flex items-center gap-1">
                      <History className="w-3.5 h-3.5 text-primary" /> Submissions History
                    </span>
                    <button onClick={() => setShowSubmissions(false)} className="text-xs text-muted hover:text-foreground">
                      Close
                    </button>
                  </div>
                  {submissions.length === 0 ? (
                    <div className="text-xs text-muted py-2">No submissions recorded for this question yet.</div>
                  ) : (
                    <div className="divide-y divide-border text-xs">
                      {submissions.map((sub) => (
                        <div key={sub.id} className="py-2 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            {sub.status === "ACCEPTED" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400" />
                            )}
                            <span className="font-semibold">{sub.status}</span>
                            <span className="text-muted uppercase text-[10px]">({sub.language})</span>
                            <span className="text-muted">
                              Score: {sub.score}% ({sub.passedCount}/{sub.totalCount} tests)
                            </span>
                          </div>
                          <span className="text-[10px] text-muted">
                            {new Date(sub.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* The Monaco Editor + Test Cases Panel */}
              <div className="flex-1 overflow-hidden">
                <CodeEditorPanel
                  key={selectedQuestion.id}
                  title={selectedQuestion.title}
                  statement={selectedQuestion.text}
                  constraints={selectedQuestion.constraints}
                  examples={selectedQuestion.examples}
                  starterCode={selectedQuestion.starterCode || {}}
                  tests={selectedQuestion.testCases.map((t) => ({
                    input: t.input,
                    expected: t.expected,
                    hidden: t.hidden,
                  }))}
                  onRun={handleRun}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted text-xs">
              Select a question to begin practice
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
