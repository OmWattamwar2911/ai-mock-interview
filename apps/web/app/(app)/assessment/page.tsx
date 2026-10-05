"use client";

import { useEffect, useState } from "react";
import { Clock3, FileQuestion, Plus } from "lucide-react";
import { CodeEditorPanel } from "@/components/code-editor/code-editor-panel";

type JD = { id: string; title: string };
type Question = { id: string; text: string; options: string[]; marks: number };
type Coding = { id: string; statement: string; constraints?: string | null; examples?: unknown; starterCode: Record<string, string>; testCases: { input: string; expected: string }[] };
type Assessment = { id: string; title: string; durationSec: number; totalMarks: number; sections: { type: string; durationSec: number; questions: Question[]; coding: Coding[] }[] };
type Attempt = { id: string; assessment: Assessment };

export default function AssessmentPage() {
  const [jds, setJds] = useState<JD[]>([]);
  const [selectedJd, setSelectedJd] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [codingIndex, setCodingIndex] = useState(0);
  const [round, setRound] = useState<"MCQ" | "CODING">("MCQ");
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => { void fetch("/api/jds").then((response) => response.json()).then((body: { jobDescriptions?: JD[] }) => { const items = body.jobDescriptions ?? []; setJds(items); setSelectedJd(items[0]?.id ?? ""); }); }, []);
  useEffect(() => { if (!attempt || seconds <= 0) return; const timer = window.setInterval(() => setSeconds((value) => value - 1), 1_000); return () => window.clearInterval(timer); }, [attempt, seconds]);
  // The timer intentionally observes only attempt and seconds; submit captures the current answer snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (attempt && seconds === 0) void submit(true); }, [attempt, seconds]);

  async function createAssessment() {
    const response = await fetch("/api/assessments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jdId: selectedJd }) });
    const body = await response.json() as { assessment?: Assessment; error?: { message: string } };
    if (!response.ok || !body.assessment) return setNotice(body.error?.message ?? "Could not create assessment");
    setAssessment(body.assessment); setNotice("Assessment ready. Start when you are ready.");
  }
  async function start() {
    if (!assessment) return;
    const response = await fetch(`/api/assessments/${assessment.id}/attempts`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const body = await response.json() as { attempt?: { id: string }; assessment?: Assessment };
    if (body.attempt && body.assessment) { setAttempt({ id: body.attempt.id, assessment: body.assessment }); setAssessment(body.assessment); setSeconds(body.assessment.durationSec); setRound("MCQ"); }
  }
  async function submit(autoSubmitted = false) {
    if (!attempt) return;
    const response = await fetch(`/api/assessment-attempts/${attempt.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers, autoSubmitted }) });
    const body = await response.json() as { score?: number; totalMarks?: number };
    setNotice(`Assessment submitted: ${body.score ?? 0} / ${body.totalMarks ?? 0}`); setAttempt(null);
  }
  async function runCode(language: string, sourceCode: string, input?: string) {
    const response = await fetch(`/api/assessment-attempts/${attempt?.id}/coding`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: currentCoding?.id, language, sourceCode, submit: false }) });
    return await response.json();
  }
  async function submitCode(language: string, sourceCode: string) {
    const response = await fetch(`/api/assessment-attempts/${attempt?.id}/coding`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: currentCoding?.id, language, sourceCode, submit: true }) });
    return await response.json();
  }

  const mcq = attempt?.assessment.sections.find((section) => section.type === "MCQ_ROUND");
  const coding = attempt?.assessment.sections.find((section) => section.type === "CODING_ROUND");
  const currentCoding = coding?.coding[codingIndex];
  if (attempt && round === "CODING" && currentCoding) return <main className="space-y-5"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Coding round</p><h1 className="mt-2 text-2xl font-medium">{currentCoding.statement}</h1></div><p className="flex items-center gap-2 font-mono text-sm"><Clock3 className="h-4 w-4" />{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p></header><CodeEditorPanel statement={currentCoding.statement} constraints={currentCoding.constraints} examples={currentCoding.examples} starterCode={currentCoding.starterCode} tests={currentCoding.testCases} onRun={runCode} onSubmit={submitCode} /><div className="flex justify-between"><button type="button" disabled={codingIndex === 0} onClick={() => setCodingIndex((index) => index - 1)} className="rounded border border-border px-4 py-2 text-sm disabled:opacity-40">Previous problem</button><button type="button" onClick={() => codingIndex < (coding?.coding.length ?? 1) - 1 ? setCodingIndex((index) => index + 1) : void submit()} className="rounded bg-accent px-4 py-2 text-sm text-background">{codingIndex < (coding?.coding.length ?? 1) - 1 ? "Next problem" : "Finish assessment"}</button></div></main>;
  if (attempt && round === "MCQ" && mcq) return <main className="mx-auto max-w-3xl space-y-6"><header className="flex items-center justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">MCQ round</p><h1 className="mt-2 text-2xl font-medium">Assessment questions</h1></div><p className="font-mono text-sm">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p></header><div className="space-y-4">{mcq.questions.map((question, index) => <fieldset key={question.id} className="rounded border border-border bg-surface p-5"><legend className="font-mono text-xs text-muted">{index + 1} / {mcq.questions.length}</legend><p className="mt-2 font-medium">{question.text}</p><div className="mt-4 grid gap-2">{question.options.map((option) => <label key={option} className="flex cursor-pointer items-center gap-3 rounded border border-border p-3 text-sm hover:bg-elevated"><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))} />{option}</label>)}</div></fieldset>)}</div><button type="button" onClick={() => { setCodingIndex(0); setRound("CODING"); }} className="rounded bg-accent px-4 py-2 text-sm text-background">Continue to coding round</button></main>;
  return <main className="mx-auto max-w-3xl space-y-8"><header><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Online assessment</p><h1 className="mt-3 text-3xl font-medium">MCQs plus a timed coding round</h1><p className="mt-2 text-sm text-muted">One continuous assessment with deterministic scoring and hidden tests.</p></header><section className="rounded border border-border bg-surface p-5"><label className="text-sm text-muted">Job description<select value={selectedJd} onChange={(event) => setSelectedJd(event.target.value)} className="mt-2 block w-full rounded border border-border bg-background p-2 text-foreground">{jds.map((jd) => <option key={jd.id} value={jd.id}>{jd.title}</option>)}</select></label><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void createAssessment()} disabled={!selectedJd} className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 text-sm disabled:opacity-40"><Plus className="h-4 w-4" />Build assessment</button>{assessment ? <button type="button" onClick={() => void start()} className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm text-background"><FileQuestion className="h-4 w-4" />Start</button> : null}</div>{assessment ? <p className="mt-4 text-sm text-muted">{assessment.title} · {assessment.totalMarks} marks · {Math.round(assessment.durationSec / 60)} minutes</p> : null}{notice ? <p className="mt-4 border-t border-border pt-4 text-sm">{notice}</p> : null}</section></main>;
}