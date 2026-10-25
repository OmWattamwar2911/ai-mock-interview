"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText, UploadCloud, ChevronRight } from "lucide-react";
import type { JdParsed, ResumeParsed, SkillGapResponse } from "@rehearse/shared";
import { Button } from "@/components/ui/button";
import { ChipList } from "@/components/chip-list";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ResumeRow = { id: string; fileName: string; parsed: ResumeParsed };
type JdRow = { id: string; title: string; parsed: JdParsed };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const [resume, setResume] = useState<ResumeRow | null>(null);
  const [resumeParsed, setResumeParsed] = useState<ResumeParsed | null>(null);

  const [jdText, setJdText] = useState("");
  const [jdTitle, setJdTitle] = useState("");
  const [jd, setJd] = useState<JdRow | null>(null);
  const [jdParsed, setJdParsed] = useState<JdParsed | null>(null);

  const [gap, setGap] = useState<SkillGapResponse | null>(null);

  const experienceChips = useMemo(
    () => (resumeParsed?.experience ?? []).map((e) => [e.title, e.company].filter(Boolean).join(" @ ")).filter(Boolean),
    [resumeParsed],
  );
  const educationChips = useMemo(
    () => (resumeParsed?.education ?? []).map((e) => [e.degree, e.school].filter(Boolean).join(", ")).filter(Boolean),
    [resumeParsed],
  );

  async function uploadResume(file: File) {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/resumes", { method: "POST", body: formData });
      const data = (await res.json()) as { resume?: ResumeRow; error?: { message: string } };
      if (!res.ok || !data.resume) throw new Error(data.error?.message ?? "Failed to parse resume");
      setResume(data.resume);
      setResumeParsed(data.resume.parsed);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse resume");
    } finally {
      setLoading(false);
    }
  }

  async function submitJd() {
    if (!jdText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/jds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: jdText, title: jdTitle || undefined }),
      });
      const data = (await res.json()) as { jobDescription?: JdRow; error?: { message: string } };
      if (!res.ok || !data.jobDescription) throw new Error(data.error?.message ?? "Failed to parse JD");
      setJd(data.jobDescription);
      setJdParsed(data.jobDescription.parsed);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JD");
    } finally {
      setLoading(false);
    }
  }

  async function uploadJdFile(file: File) {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (jdTitle) formData.append("title", jdTitle);
      const res = await fetch("/api/jds", { method: "POST", body: formData });
      const data = (await res.json()) as { jobDescription?: JdRow; error?: { message: string } };
      if (!res.ok || !data.jobDescription) throw new Error(data.error?.message ?? "Failed to parse JD");
      setJd(data.jobDescription);
      setJdParsed(data.jobDescription.parsed);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JD");
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    if (!resume || !jd || !resumeParsed || !jdParsed) return;
    setLoading(true);
    setError("");
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/resumes", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: resume.id, parsed: resumeParsed }),
        }),
        fetch("/api/jds", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: jd.id, parsed: jdParsed }),
        }),
      ]);
      if (!r1.ok || !r2.ok) throw new Error("Could not save edited chips");
      const res = await fetch("/api/skill-gap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resumeId: resume.id, jdId: jd.id }),
      });
      const data = (await res.json()) as SkillGapResponse & { error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to analyze skill gap");
      setGap(data);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze skill gap");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 font-mono">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / PREPARATION</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-jetbrains font-bold tracking-tight text-foreground mt-1">
          SKILL GAP ONBOARDING
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Ingest resume and target job description to build an adaptive question bank.
        </p>

        {/* Step indicator */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-black/5 dark:border-white/10 text-xs">
          {[
            { num: "01", label: "Resume" },
            { num: "02", label: "Job Description" },
            { num: "03", label: "Skill Chips" },
            { num: "04", label: "Gap Matrix" },
          ].map((s, idx) => {
            const stepNum = idx + 1;
            const active = step >= stepNum;
            const current = step === stepNum;
            return (
              <div key={s.num} className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                    current
                      ? "bg-[#F64302] text-white font-bold"
                      : active
                      ? "bg-black/10 dark:bg-white/10 text-foreground font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="font-bubbledot">{s.num}</span> {s.label}
                </span>
                {idx < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form Card */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 sm:p-6 shadow-sm">
        {error ? (
          <div className="mb-4 rounded-xl border border-[#F64302]/30 bg-[#F64302]/10 p-3 text-xs text-[#F64302]">
            {error}
          </div>
        ) : null}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <span className="font-bubbledot text-xs text-[#F64302]">STEP 01</span>
              <h2 className="text-lg font-bold uppercase tracking-tight text-foreground">Upload Candidate Resume</h2>
              <p className="text-xs text-muted-foreground">Supported: PDF, DOCX, TXT (Maximum 5MB). Parser extracts skills and projects.</p>
            </div>

            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all duration-200 ${
                dragOver
                  ? "border-[#F64302] bg-[#F64302]/5"
                  : "border-black/15 dark:border-white/15 bg-white/40 dark:bg-black/30 hover:border-[#F64302]/60 hover:bg-white/60 dark:hover:bg-black/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) void uploadResume(file);
              }}
            >
              <div className="h-12 w-12 rounded-xl bg-[#F64302]/10 text-[#F64302] flex items-center justify-center mb-3">
                <UploadCloud className="h-6 w-6" />
              </div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Drop file here or click to browse
              </span>
              <span className="text-[11px] text-muted-foreground mt-1">Parses skills, work experience, and educational background</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadResume(file);
                }}
                disabled={loading}
              />
            </label>
            {loading ? <p className="text-center font-mono text-xs text-[#F64302] animate-pulse">Parsing and extracting resume entities…</p> : null}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <span className="font-bubbledot text-xs text-[#F64302]">STEP 02</span>
              <h2 className="text-lg font-bold uppercase tracking-tight text-foreground">Target Job Description</h2>
              <p className="text-xs text-muted-foreground">Paste job description text or upload vacancy document.</p>
            </div>

            <Input
              className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 font-mono text-xs"
              placeholder="Role title (e.g. Senior Backend Engineer - Python)"
              value={jdTitle}
              onChange={(e) => setJdTitle(e.target.value)}
            />
            <Textarea
              className="h-48 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 font-mono text-xs resize-none"
              placeholder="Paste complete job specification, responsibilities, and qualifications here…"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              disabled={loading}
            />

            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                Or upload JD document
              </label>
              <Input
                className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 font-mono text-xs"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadJdFile(file);
                }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-xl font-mono text-xs"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider"
                onClick={() => void submitJd()}
                disabled={loading || jdText.trim().length < 20}
              >
                {loading ? "Parsing JD…" : "Extract Requirements →"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && resumeParsed && jdParsed && (
          <div className="space-y-4">
            <div>
              <span className="font-bubbledot text-xs text-[#F64302]">STEP 03</span>
              <h2 className="text-lg font-bold uppercase tracking-tight text-foreground">Verify Extracted Skill Chips</h2>
              <p className="text-xs text-muted-foreground">Review and edit candidate vs role attributes before computing gap.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 p-4 rounded-xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/30">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-foreground">
                  <FileText className="h-4 w-4 text-[#F64302]" /> Candidate Skill Profile
                </h3>
                <ChipList
                  values={resumeParsed.skills}
                  onChange={(skills) => setResumeParsed({ ...resumeParsed, skills })}
                />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground pt-2">Experience Highlights</p>
                <ChipList
                  values={experienceChips}
                  onChange={(chips) =>
                    setResumeParsed({
                      ...resumeParsed,
                      experience: chips.map((chip) => {
                        const [title, company] = chip.split(" @ ");
                        return { title: title ?? chip, company: company ?? "", bullets: [] };
                      }),
                    })
                  }
                  placeholder="Title @ Company"
                />
              </div>

              <div className="space-y-3 p-4 rounded-xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/30">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-foreground">
                  <FileText className="h-4 w-4 text-[#F64302]" /> Target Role Requirements
                </h3>
                <ChipList
                  values={jdParsed.requiredSkills}
                  onChange={(requiredSkills) => setJdParsed({ ...jdParsed, requiredSkills })}
                />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground pt-2">Preferred Additional Skills</p>
                <ChipList
                  values={jdParsed.preferredSkills}
                  onChange={(preferredSkills) => setJdParsed({ ...jdParsed, preferredSkills })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl font-mono text-xs" onClick={() => setStep(2)} disabled={loading}>
                Back
              </Button>
              <Button
                className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider"
                onClick={() => void analyze()}
                disabled={loading}
              >
                {loading ? "Computing Matrix…" : "Compute Skill Gap →"}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && gap && (
          <div className="space-y-6">
            <div className="text-center space-y-2 py-4">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-black text-white border-2 border-[#F64302] shadow-xl">
                <span className="font-bubbledot text-3xl font-bold text-[#F64302]">{gap.matchScore}%</span>
              </div>
              <h2 className="font-jetbrains text-xl font-bold uppercase tracking-tight text-foreground">
                MATCH SCORE EVALUATION
              </h2>
              <p className="mx-auto max-w-lg text-xs text-muted-foreground">{gap.narrative}</p>
            </div>

            <div className="grid gap-2.5 md:grid-cols-3 text-xs">
              <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold uppercase text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Matched ({gap.matched.length})
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  {gap.matched.map((s) => (
                    <li key={s} className="truncate">• {s}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold uppercase text-[#F64302]">
                  <span className="h-3 w-3 rounded-full border-2 border-[#F64302]" />
                  Missing ({gap.missing.length})
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  {gap.missing.map((s) => (
                    <li key={s} className="truncate">• {s}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold uppercase text-amber-500">
                  <span className="h-3 w-3 rounded-full bg-amber-500/20 border border-amber-500" />
                  Partial ({gap.partial.length})
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  {gap.partial.map((s) => (
                    <li key={s} className="truncate">• {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl font-mono text-xs" onClick={() => router.push("/documents")}>
                Saved Documents
              </Button>
              <Button
                className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider gap-2"
                onClick={() => router.push("/dashboard")}
              >
                Go to Candidate Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
