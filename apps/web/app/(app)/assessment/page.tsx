"use client";

import { useEffect, useState } from "react";
import { Clock3, FileQuestion, Plus, ArrowRight, CheckCircle2 } from "lucide-react";
import { CodeEditorPanel } from "@/components/code-editor/code-editor-panel";
import { Button } from "@/components/ui/button";

type JD = { id: string; title: string };
type Question = { id: string; text: string; options: string[]; marks: number };
type Coding = {
  id: string;
  statement: string;
  constraints?: string | null;
  examples?: unknown;
  starterCode: Record<string, string>;
  testCases: { input: string; expected: string }[];
};
type Assessment = {
  id: string;
  title: string;
  durationSec: number;
  totalMarks: number;
  sections: { type: string; durationSec: number; questions: Question[]; coding: Coding[] }[];
};
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

  useEffect(() => {
    void fetch("/api/jds")
      .then((response) => response.json())
      .then((body: { jobDescriptions?: JD[] }) => {
        const items = body.jobDescriptions ?? [];
        setJds(items);
        setSelectedJd(items[0]?.id ?? "");
      });
  }, []);

  useEffect(() => {
    if (!attempt || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1_000);
    return () => window.clearInterval(timer);
  }, [attempt, seconds]);

  // Submit on timer expire
  useEffect(() => {
    if (attempt && seconds === 0) void submit(true);
  }, [attempt, seconds]);

  async function createAssessment() {
    const response = await fetch("/api/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jdId: selectedJd }),
    });
    const body = (await response.json()) as { assessment?: Assessment; error?: { message: string } };
    if (!response.ok || !body.assessment) return setNotice(body.error?.message ?? "Could not create assessment");
    setAssessment(body.assessment);
    setNotice("Assessment ready. Start when you are ready.");
  }

  async function start() {
    if (!assessment) return;
    const response = await fetch(`/api/assessments/${assessment.id}/attempts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const body = (await response.json()) as { attempt?: { id: string }; assessment?: Assessment };
    if (body.attempt && body.assessment) {
      setAttempt({ id: body.attempt.id, assessment: body.assessment });
      setAssessment(body.assessment);
      setSeconds(body.assessment.durationSec);
      setRound("MCQ");
    }
  }

  async function submit(autoSubmitted = false) {
    if (!attempt) return;
    const response = await fetch(`/api/assessment-attempts/${attempt.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers, autoSubmitted }),
    });
    const body = (await response.json()) as { score?: number; totalMarks?: number };
    setNotice(`Assessment submitted: ${body.score ?? 0} / ${body.totalMarks ?? 0} marks`);
    setAttempt(null);
  }

  async function runCode(language: string, sourceCode: string, input?: string) {
    const response = await fetch(`/api/assessment-attempts/${attempt?.id}/coding`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: currentCoding?.id, language, sourceCode, submit: false }),
    });
    return await response.json();
  }

  async function submitCode(language: string, sourceCode: string) {
    const response = await fetch(`/api/assessment-attempts/${attempt?.id}/coding`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: currentCoding?.id, language, sourceCode, submit: true }),
    });
    return await response.json();
  }

  const mcq = attempt?.assessment.sections.find((section) => section.type === "MCQ_ROUND");
  const coding = attempt?.assessment.sections.find((section) => section.type === "CODING_ROUND");
  const currentCoding = coding?.coding[codingIndex];

  // ── Coding Round View ──
  if (attempt && round === "CODING" && currentCoding) {
    return (
      <main className="space-y-3 font-mono">
        <header className="flex flex-wrap items-center justify-between gap-3 p-5 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10">
          <div>
            <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">02 / CODING ROUND</span>
            <h1 className="mt-1 text-xl font-bold text-foreground">{currentCoding.statement}</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black text-white font-mono text-sm border border-white/10 shadow-sm">
            <Clock3 className="h-4 w-4 text-[#F64302]" />
            <span className="font-bubbledot text-base text-[#F64302]">
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
        </header>

        <CodeEditorPanel
          statement={currentCoding.statement}
          constraints={currentCoding.constraints}
          examples={currentCoding.examples}
          starterCode={currentCoding.starterCode}
          tests={currentCoding.testCases}
          onRun={runCode}
          onSubmit={submitCode}
        />

        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            disabled={codingIndex === 0}
            onClick={() => setCodingIndex((index) => index - 1)}
            className="rounded-xl font-mono text-xs"
          >
            ← Previous Problem
          </Button>
          <Button
            onClick={() =>
              codingIndex < (coding?.coding.length ?? 1) - 1
                ? setCodingIndex((index) => index + 1)
                : void submit()
            }
            className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider"
          >
            {codingIndex < (coding?.coding.length ?? 1) - 1 ? "Next Problem →" : "Finish Assessment"}
          </Button>
        </div>
      </main>
    );
  }

  // ── MCQ Round View ──
  if (attempt && round === "MCQ" && mcq) {
    return (
      <main className="max-w-4xl mx-auto space-y-3 font-mono">
        <header className="flex items-center justify-between p-5 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10">
          <div>
            <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / MCQ ROUND</span>
            <h1 className="mt-1 text-2xl font-bubbledot font-bold text-foreground">KNOWLEDGE VERIFICATION</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black text-white font-mono text-sm border border-white/10">
            <Clock3 className="h-4 w-4 text-[#F64302]" />
            <span className="font-bubbledot text-base text-[#F64302]">
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
        </header>

        <div className="space-y-2.5">
          {mcq.questions.map((question, index) => (
            <fieldset
              key={question.id}
              className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 space-y-3"
            >
              <legend className="font-bubbledot text-xs text-[#F64302] px-2">
                QUESTION {String(index + 1).padStart(2, "0")} / {String(mcq.questions.length).padStart(2, "0")}
              </legend>
              <p className="font-semibold text-sm text-foreground leading-relaxed">{question.text}</p>
              <div className="grid gap-2 pt-1">
                {question.options.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-3 text-xs text-foreground hover:border-[#F64302]/50 transition-colors"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === option}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                      className="accent-[#F64302]"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => {
              setCodingIndex(0);
              setRound("CODING");
            }}
            className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider"
          >
            Continue to Coding Round →
          </Button>
        </div>
      </main>
    );
  }

  // ── Assessment Configuration View ──
  return (
    <main className="space-y-3 font-mono">
      <header className="p-5 sm:p-6 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / ONLINE ASSESSMENT</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] animate-pulse" />
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bubbledot font-bold tracking-tight text-foreground">
          TIMED COMPETENCY TEST
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Deterministic scoring with timed multiple choice questions and sandbox compiler coding tests.
        </p>
      </header>

      <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-[#EBE8EB] dark:bg-[#141414] p-5 sm:p-6 space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Target Job Description
          </label>
          <select
            value={selectedJd}
            onChange={(event) => setSelectedJd(event.target.value)}
            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 p-2.5 text-xs text-foreground font-mono focus:border-[#F64302] focus:ring-1 focus:ring-[#F64302] outline-none"
          >
            {jds.map((jd) => (
              <option key={jd.id} value={jd.id}>
                {jd.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-2">
          <Button
            onClick={() => void createAssessment()}
            disabled={!selectedJd}
            variant="outline"
            className="rounded-xl font-mono text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-[#F64302]" />
            Build Assessment
          </Button>

          {assessment && (
            <Button
              onClick={() => void start()}
              className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider gap-1.5"
            >
              <FileQuestion className="h-3.5 w-3.5" />
              Start Assessment →
            </Button>
          )}
        </div>

        {assessment && (
          <div className="p-3.5 rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/30 text-xs text-muted-foreground flex items-center justify-between">
            <span className="font-semibold text-foreground">{assessment.title}</span>
            <span className="font-bubbledot text-[#F64302]">
              {assessment.totalMarks} MARKS · {Math.round(assessment.durationSec / 60)} MINUTES
            </span>
          </div>
        )}

        {notice && (
          <div className="rounded-xl border border-[#F64302]/30 bg-[#F64302]/10 p-3 text-xs text-[#F64302]">
            {notice}
          </div>
        )}
      </section>
    </main>
  );
}
