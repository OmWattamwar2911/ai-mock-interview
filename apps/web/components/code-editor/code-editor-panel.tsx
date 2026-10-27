"use client";

import { useEffect, useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import {
  Play,
  Send,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  EyeOff,
  HelpCircle,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  RotateCw,
} from "lucide-react";

export type Language = "python" | "javascript" | "java" | "cpp" | "c";

export type TestCase = {
  input: string;
  expected: string;
  hidden?: boolean;
};

export type ExecutionTestItem = {
  input: string;
  expected: string;
  passed: boolean;
  status: string;
  stdout?: string;
  stderr?: string;
  timeMs?: number;
  hidden?: boolean;
};

export type Result = {
  status: string;
  passedCount?: number;
  totalCount?: number;
  tests?: ExecutionTestItem[];
  stdout?: string;
  stderr?: string;
  timeMs?: number;
  compileError?: string | null;
  failures?: Array<{ input: string; expected: string; actual?: string }>;
};

export function CodeEditorPanel({
  title,
  statement,
  constraints,
  examples,
  difficulty,
  company,
  role,
  topicTags = [],
  starterCode = {},
  tests = [],
  isLiveSession = false,
  synced = false,
  statusMessage = null,
  hintsUsed = 0,
  maxHints = 3,
  onRun,
  onSubmit,
  onChange,
  onCursorChange,
  onRequestHint,
  onExplainApproach,
}: {
  title?: string;
  statement: string;
  constraints?: string | null;
  examples?: unknown;
  difficulty?: string;
  company?: string;
  role?: string;
  topicTags?: string[];
  starterCode?: Record<string, string> | null;
  tests?: TestCase[];
  isLiveSession?: boolean;
  synced?: boolean;
  statusMessage?: string | null;
  hintsUsed?: number;
  maxHints?: number;
  onRun: (language: Language, sourceCode: string, input?: string) => Promise<Result>;
  onSubmit: (language: Language, sourceCode: string) => Promise<Result>;
  onChange?: (language: Language, sourceCode: string, cursorLine?: number) => void;
  onCursorChange?: (line: number) => void;
  onRequestHint?: () => void;
  onExplainApproach?: () => void;
}) {
  const safeStarter = starterCode || {};
  const showLiveSession = isLiveSession ?? Boolean(synced || statusMessage !== null);
  const supportedLanguages: Language[] = (["python", "javascript", "java", "cpp", "c"] as Language[]).filter(
    (lang) => Boolean(safeStarter[lang])
  );
  const activeLanguages: Language[] = supportedLanguages.length > 0 ? supportedLanguages : ["python", "javascript"];

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rehearse_editor_language") as Language | null;
      if (saved && activeLanguages.includes(saved)) {
        return saved;
      }
    }
    return activeLanguages[0] || "python";
  });

  const [source, setSource] = useState(
    safeStarter[language] ?? safeStarter.python ?? safeStarter.javascript ?? ""
  );
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"tests" | "custom" | "output">("tests");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsSpent, setSecondsSpent] = useState(0);
  const editorRef = useRef<any>(null);

  // Timer for time spent on the coding problem
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSpent((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!activeLanguages.includes(language)) {
      setLanguage(activeLanguages[0] || "python");
    }
  }, [starterCode]);

  useEffect(() => {
    const next = (starterCode || {})[language] ?? "";
    setSource(next);
    onChange?.(language, next, 1);
  }, [language, starterCode, onChange]);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("rehearse_editor_language", newLang);
    }
  };

  async function run(submit: boolean) {
    setBusy(true);
    setTab("output");
    try {
      const res = submit ? await onSubmit(language, source) : await onRun(language, source, input);
      setResult(res);
    } catch (err: any) {
      setResult({
        status: "RUNTIME_ERROR",
        stderr: err?.message || "Execution failed",
      });
    } finally {
      setBusy(false);
    }
  }

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e: any) => {
      const line = e.position.lineNumber;
      onCursorChange?.(line);
      onChange?.(language, editor.getValue(), line);
    });
  };

  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-[minmax(300px,0.85fr)_minmax(460px,1.15fr)] shadow-sm">
      {/* Problem Description Column */}
      <section className="flex flex-col border-b border-border p-5 lg:border-b-0 lg:border-r overflow-y-auto max-h-[720px]">
        {/* Top Problem Header with Sync Indicator (Only in Live Interview Sessions) */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          {showLiveSession ? (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider font-mono ${
                  synced
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {synced ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Aria can see this problem
                  </>
                ) : (
                  <>
                    <RotateCw className="h-3 w-3 animate-spin text-amber-400" /> Syncing with Aria...
                  </>
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground font-semibold flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-primary" /> Problem Overview
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 font-mono text-xs text-muted ml-auto">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">{formatTimer(secondsSpent)}</span>
          </div>
        </div>

        {/* Title and Badges */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-b border-border/40 pb-3">
          {difficulty && (
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                difficulty.toUpperCase() === "EASY"
                  ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400"
                  : difficulty.toUpperCase() === "HARD"
                  ? "bg-rose-500/15 text-rose-500 dark:text-rose-400"
                  : "bg-amber-500/15 text-amber-500 dark:text-amber-400"
              }`}
            >
              {difficulty}
            </span>
          )}
          {company && (
            <span className="text-[10px] rounded bg-black/5 dark:bg-white/10 px-2 py-0.5 font-mono font-semibold text-foreground">
              {company}
            </span>
          )}
          {role && (
            <span className="text-[10px] rounded bg-primary/10 text-primary px-2 py-0.5 font-mono font-semibold">
              {role}
            </span>
          )}
          {topicTags.map((tag) => (
            <span key={tag} className="text-[10px] rounded bg-muted/20 px-2 py-0.5 font-mono text-muted-foreground">
              {tag}
            </span>
          ))}
          <span className="text-[10px] rounded bg-muted/20 px-2 py-0.5 font-mono text-muted-foreground ml-auto">
            {tests.length} Test Cases
          </span>
        </div>

        <h2 className="mt-3 text-base font-bold text-foreground tracking-tight">{title || statement}</h2>

        {title && statement !== title ? (
          <p className="mt-2.5 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans">{statement}</p>
        ) : null}

        {constraints ? (
          <div className="mt-4 rounded-lg border border-border/70 bg-background/50 p-3">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Constraints
            </p>
            <p className="whitespace-pre-wrap text-xs text-muted leading-relaxed font-mono">{constraints}</p>
          </div>
        ) : null}

        {Array.isArray(examples) && examples.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Examples
            </p>
            {examples.map((ex: any, idx: number) => (
              <div key={idx} className="rounded-lg border border-border/80 bg-background/60 p-3 text-xs font-mono">
                <span className="text-muted block text-[10px] uppercase font-sans mb-1 font-semibold">
                  Example {idx + 1}
                </span>
                <div className="space-y-0.5">
                  <div>
                    <span className="text-muted">Input: </span>
                    <span className="text-foreground font-semibold">{ex.input}</span>
                  </div>
                  <div>
                    <span className="text-muted">Output: </span>
                    <span className="text-emerald-400 font-semibold">{ex.output}</span>
                  </div>
                  {ex.explanation && (
                    <div className="pt-0.5 text-muted text-[11px] font-sans">
                      <span className="font-medium text-foreground/70">Explanation: </span>
                      {ex.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Code Editor Column */}
      <section className="flex min-h-0 flex-col">
        {/* Real-time Bot Reading Status Bar (Only in Live Interview Sessions) */}
        {showLiveSession && (
          <div className="flex flex-wrap items-center justify-between border-b border-border bg-surface/90 px-4 py-2 text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
              </span>
              <span className="text-muted text-[11px] font-mono">
                {statusMessage || "Aria is reading your code"}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-mono text-muted whitespace-nowrap">
                Hints used: <strong className="text-foreground">{hintsUsed}</strong>/{maxHints}
              </span>
              {onRequestHint && (
                <button
                  type="button"
                  onClick={onRequestHint}
                  disabled={hintsUsed >= maxHints}
                  className="inline-flex items-center gap-1 rounded bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  <HelpCircle className="h-3 w-3" />
                  Ask Aria for a hint
                </button>
              )}
              {onExplainApproach && (
                <button
                  type="button"
                  onClick={onExplainApproach}
                  className="inline-flex items-center gap-1 rounded border border-border hover:bg-elevated px-2 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap"
                >
                  <MessageSquare className="h-3 w-3 text-primary" />
                  Explain my approach
                </button>
              )}
            </div>
          </div>
        )}

        {/* Editor Controls Toolbar (Responsive with wrap and no right cut-off) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/50 px-4 py-2 min-w-0">
          <label className="flex items-center gap-2 text-xs font-medium text-muted shrink-0">
            Language:
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none font-mono"
            >
              {activeLanguages.map((item) => (
                <option key={item} value={item}>
                  {item === "cpp" ? "C++" : item.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              disabled={busy || tests.length === 0}
              title={tests.length === 0 ? "This problem has no test cases available" : "Run sample test cases"}
              onClick={() => void run(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="h-3.5 w-3.5 text-emerald-400" />
              Run Sample Tests
            </button>
            <button
              type="button"
              disabled={busy || tests.length === 0}
              title={tests.length === 0 ? "This problem has no test cases available" : "Submit solution against all test cases"}
              onClick={() => void run(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              Submit All Tests
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="min-h-0 flex-1">
          <Editor
            height="380px"
            language={language === "cpp" || language === "c" ? "cpp" : language}
            theme="vs-dark"
            value={source}
            onMount={handleEditorDidMount}
            onChange={(value) => {
              const next = value ?? "";
              setSource(next);
              const line = editorRef.current ? editorRef.current.getPosition()?.lineNumber : 1;
              onChange?.(language, next, line);
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "var(--font-geist-mono), monospace",
              padding: { top: 12 },
              lineNumbersMinChars: 3,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Console / Testcases Panel */}
        <div className="border-t border-border bg-surface/50">
          <div className="flex items-center justify-between border-b border-border/60 px-4 pt-2.5">
            <div className="flex items-center gap-4 text-xs font-medium">
              <Terminal className="h-3.5 w-3.5 text-muted" />
              {(["tests", "custom", "output"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`pb-2.5 transition-colors ${
                    tab === item
                      ? "border-b-2 border-primary text-primary font-semibold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {item === "tests" ? "Test Cases" : item === "custom" ? "Custom Input" : "Execution Console"}
                </button>
              ))}
            </div>

            {result?.passedCount !== undefined && (
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                  result.passedCount === result.totalCount
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                Passed {result.passedCount} / {result.totalCount}
              </span>
            )}
          </div>

          <div className="min-h-[140px] max-h-[220px] overflow-y-auto p-4 font-mono text-xs">
            {/* Tab 1: Test Cases */}
            {tab === "tests" && (
              <div className="space-y-2">
                {tests.map((test, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded border border-border/60 bg-background/50 p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      {test.hidden ? (
                        <span className="inline-flex items-center gap-1 rounded bg-muted/10 px-1.5 py-0.5 text-[10px] text-muted">
                          <EyeOff className="h-3 w-3" /> Hidden Case {index + 1}
                        </span>
                      ) : (
                        <span className="font-semibold text-foreground">Sample Case {index + 1}</span>
                      )}
                    </div>
                    <span className="text-muted text-[11px]">
                      {test.hidden ? "Protected test case" : `Input: ${test.input.slice(0, 28) || "empty"}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Custom Input */}
            {tab === "custom" && (
              <div className="space-y-1">
                <p className="text-[11px] text-muted font-sans">Provide custom standard input (stdin):</p>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter custom stdin here..."
                  className="min-h-[90px] w-full resize-y rounded border border-border bg-background p-2.5 text-foreground outline-none text-xs"
                />
              </div>
            )}

            {/* Tab 3: Execution Output */}
            {tab === "output" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        busy
                          ? "bg-amber-400 animate-ping"
                          : result?.status === "ACCEPTED"
                          ? "bg-emerald-400"
                          : result
                          ? "bg-rose-400"
                          : "bg-muted"
                      }`}
                    />
                    <span className="font-bold">
                      {result?.status ?? (busy ? "RUNNING SANDBOX..." : "No test run yet")}
                    </span>
                  </div>
                  {result?.timeMs !== undefined && (
                    <span className="flex items-center gap-1 text-[11px] text-muted">
                      <Clock className="h-3 w-3" /> {result.timeMs} ms
                    </span>
                  )}
                </div>

                {/* Per-test case results */}
                {result?.tests && result.tests.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {result.tests.map((t, i) => (
                      <div
                        key={i}
                        className={`rounded border p-2.5 text-xs ${
                          t.passed
                            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                            : "border-rose-500/20 bg-rose-500/5 text-rose-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-semibold">
                            {t.passed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-rose-400" />
                            )}
                            {t.hidden ? `Hidden Test ${i + 1}` : `Sample Test ${i + 1}`}
                          </span>
                          <span className="font-mono text-[10px] text-muted">
                            {t.timeMs !== undefined ? `${t.timeMs}ms` : ""} · {t.status}
                          </span>
                        </div>
                        {!t.hidden && !t.passed && (
                          <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                            <div>
                              Input: <code className="text-foreground">{t.input}</code>
                            </div>
                            <div>
                              Expected: <code className="text-foreground">{t.expected}</code>
                            </div>
                            {t.stdout && (
                              <div>
                                Output: <code className="text-rose-400">{t.stdout.trim()}</code>
                              </div>
                            )}
                            {t.stderr && <div className="text-rose-400">Stderr: {t.stderr}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {result?.stdout && !result?.tests && (
                  <pre className="whitespace-pre-wrap rounded bg-background p-2.5 text-muted leading-relaxed">
                    {result.stdout}
                  </pre>
                )}
                {result?.stderr && (
                  <pre className="whitespace-pre-wrap rounded bg-rose-500/10 p-2.5 text-rose-400 leading-relaxed">
                    {result.stderr}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
