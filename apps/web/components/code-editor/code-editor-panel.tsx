"use client";

import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, Send, Terminal } from "lucide-react";

type Language = "python" | "javascript" | "java" | "cpp" | "c";
type TestCase = { input: string; expected: string };
type Result = { status: string; passed?: boolean; stdout?: string; stderr?: string; timeMs?: number };

export function CodeEditorPanel({
  statement,
  constraints,
  examples,
  starterCode,
  tests,
  onRun,
  onSubmit,
  onChange,
}: {
  statement: string;
  constraints?: string | null;
  examples?: unknown;
  starterCode: Record<string, string>;
  tests: TestCase[];
  onRun: (language: Language, sourceCode: string, input?: string) => Promise<Result>;
  onSubmit: (language: Language, sourceCode: string) => Promise<Result>;
  onChange?: (language: Language, sourceCode: string) => void;
}) {
  const [language, setLanguage] = useState<Language>("python");
  const [source, setSource] = useState(starterCode.python ?? "");
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"tests" | "custom" | "output">("tests");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = starterCode[language] ?? "";
    setSource(next);
    onChange?.(language, next);
  }, [language, starterCode, onChange]);

  async function run(submit: boolean) {
    setBusy(true);
    setTab("output");
    try {
      setResult(submit ? await onSubmit(language, source) : await onRun(language, source, input));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[620px] overflow-hidden rounded border border-border bg-surface lg:grid-cols-[minmax(260px,0.8fr)_minmax(420px,1.2fr)]">
      <section className="border-b border-border p-5 lg:border-b-0 lg:border-r">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Problem</p>
        <h2 className="mt-3 text-lg font-medium">{statement}</h2>
        {constraints ? <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-muted">{constraints}</p> : null}
        {Array.isArray(examples) ? <pre className="mt-5 overflow-auto border-t border-border pt-4 font-mono text-xs text-muted">{JSON.stringify(examples, null, 2)}</pre> : null}
      </section>
      <section className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <label className="flex items-center gap-2 text-xs text-muted">
            Language
            <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="rounded border border-border bg-background px-2 py-1 text-foreground">
              {(["python", "javascript", "java", "cpp", "c"] as Language[]).map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void run(false)} className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs hover:bg-elevated disabled:opacity-50"><Play className="h-3.5 w-3.5" />Run</button>
            <button type="button" disabled={busy} onClick={() => void run(true)} className="inline-flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-xs text-background hover:opacity-90 disabled:opacity-50"><Send className="h-3.5 w-3.5" />Submit</button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <Editor height="410px" language={language === "cpp" ? "cpp" : language} theme="vs-dark" value={source} onChange={(value) => { const next = value ?? ""; setSource(next); onChange?.(language, next); }} options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "var(--font-geist-mono)", padding: { top: 14 }, lineNumbersMinChars: 3, scrollBeyondLastLine: false }} />
        </div>
        <div className="border-t border-border">
          <div className="flex items-center gap-4 px-4 pt-3 text-xs">
            <Terminal className="h-3.5 w-3.5 text-muted" />
            {(["tests", "custom", "output"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "border-b border-foreground pb-2 text-foreground" : "pb-2 text-muted"}>{item === "tests" ? "Testcases" : item === "custom" ? "Custom Input" : "Output"}</button>)}
          </div>
          <div className="min-h-[120px] p-4 font-mono text-xs">
            {tab === "tests" ? <div className="space-y-2 text-muted">{tests.map((test, index) => <div key={`${test.input}-${index}`} className="flex justify-between border-b border-border pb-2"><span>Case {index + 1}</span><span>{test.input.slice(0, 32) || "empty input"}</span></div>)}</div> : null}
            {tab === "custom" ? <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="stdin" className="min-h-[100px] w-full resize-y bg-background p-2 text-foreground outline-none" /> : null}
            {tab === "output" ? <div className="space-y-2"><p className="flex items-center gap-2 text-foreground"><span className="inline-block h-2 w-2 rounded-full border border-foreground" />{result?.status ?? (busy ? "RUNNING" : "No run yet")}</p>{result?.stdout ? <pre className="whitespace-pre-wrap text-muted">{result.stdout}</pre> : null}{result?.stderr ? <pre className="whitespace-pre-wrap text-muted">{result.stderr}</pre> : null}</div> : null}
          </div>
        </div>
      </section>
    </div>
  );
}