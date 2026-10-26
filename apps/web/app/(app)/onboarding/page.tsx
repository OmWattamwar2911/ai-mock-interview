"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  UploadCloud,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import type { JdParsed, ResumeParsed, SkillGapResponse } from "@rehearse/shared";
import { Button } from "@/components/ui/button";
import { ChipList } from "@/components/chip-list";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento-card";
import { StatusChip } from "@/components/ui/status-chip";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { toast } from "@/components/ui/toast";

type ResumeRow = { id: string; fileName: string; parsed: ResumeParsed };
type JdRow = { id: string; title: string; parsed: JdParsed };

const STEPS = [
  { step: 1, label: "Resume" },
  { step: 2, label: "Job Description" },
  { step: 3, label: "Skill Gap" },
  { step: 4, label: "Start Rehearsal" },
];

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
    [resumeParsed]
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
      toast.success("Resume parsed successfully!");
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse resume");
      toast.error("Failed to parse resume");
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
      toast.success("Job description requirements extracted!");
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JD");
      toast.error("Failed to parse job description");
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
      toast.success("Job description parsed successfully!");
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JD");
      toast.error("Failed to parse job description");
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    if (!resume || !jd) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/skill-gap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resumeId: resume.id, jdId: jd.id }),
      });
      const data = (await res.json()) as { skillGap?: SkillGapResponse; error?: { message: string } };
      if (!res.ok || !data.skillGap) throw new Error(data.error?.message ?? "Failed to calculate skill gap");
      setGap(data.skillGap);
      setStep(4);
      toast.success("Skill gap matrix calculated!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate skill gap");
      toast.error("Failed to calculate skill gap");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-mono pb-12">
      {/* Page Header */}
      <PageHeader
        eyebrow="Interview Preparation"
        title="Prepare your interview"
        subtitle="Upload your resume and target job role. Aria cross-examines your background to identify skill gaps and generate relevant practice questions."
      />

      {/* Stepper Bar */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-3 sm:p-4">
        <div className="flex items-center justify-between overflow-x-auto gap-2">
          {STEPS.map((s, idx) => {
            const isCompleted = step > s.step;
            const isCurrent = step === s.step;
            return (
              <div key={s.step} className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={step < s.step}
                  onClick={() => setStep(s.step)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all duration-200 ${
                    isCurrent
                      ? "bg-black text-white dark:bg-white dark:text-black font-bold shadow-sm"
                      : isCompleted
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-500/20"
                      : "text-muted-foreground opacity-60 cursor-not-allowed"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bubbledot font-bold ${
                      isCurrent
                        ? "bg-[#F64302] text-white"
                        : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-black/10 dark:bg-white/10 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? "✓" : s.step}
                  </span>
                  <span>{s.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-500 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <SkeletonCard lines={4} hasHeader hasLeadingIcon />
      )}

      {/* Step 1: Upload Resume */}
      {!loading && step === 1 && (
        <BentoCard padded="spacious" className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-jetbrains font-bold text-foreground">
              Upload your resume
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
              Accepts PDF, DOCX, or TXT. Aria extracts your technical skills, work history, and project experience.
            </p>
          </div>

          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 sm:p-14 transition-all duration-200 ${
              dragOver
                ? "border-[#F64302] bg-[#F64302]/5"
                : "border-black/15 dark:border-white/15 bg-white/50 dark:bg-black/30 hover:border-[#F64302]/60 hover:bg-white/80 dark:hover:bg-black/50"
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
            <div className="h-14 w-14 rounded-2xl bg-[#F64302]/10 text-[#F64302] flex items-center justify-center mb-4">
              <UploadCloud className="h-7 w-7" />
            </div>
            <span className="font-mono text-sm font-bold text-foreground">
              Drop resume file here or click to browse
            </span>
            <span className="text-xs text-muted-foreground mt-1.5">
              Maximum file size 5MB (PDF or DOCX recommended)
            </span>
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
        </BentoCard>
      )}

      {/* Step 2: Target Job Description */}
      {!loading && step === 2 && (
        <BentoCard padded="spacious" className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-jetbrains font-bold text-foreground">
              Target job description
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
              Paste the vacancy details or upload a job specification document to customize Aria&apos;s interview round.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Role Title (Optional)
              </label>
              <Input
                className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
                placeholder="e.g. Senior Backend Engineer — Distributed Systems"
                value={jdTitle}
                onChange={(e) => setJdTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Job Description Text *
              </label>
              <Textarea
                className="h-44 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs resize-none"
                placeholder="Paste key responsibilities, qualifications, and required tech stack here…"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Or upload file (.pdf, .docx, .txt)
              </label>
              <Input
                className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadJdFile(file);
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-black/[0.05] dark:border-white/[0.06]">
            <Button
              variant="outline"
              className="rounded-xl font-mono text-xs font-semibold"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md shadow-[#F64302]/20"
              onClick={() => void submitJd()}
              disabled={loading || jdText.trim().length < 15}
            >
              Extract requirements →
            </Button>
          </div>
        </BentoCard>
      )}

      {/* Step 3: Review Skills & Compute Gap */}
      {!loading && step === 3 && resumeParsed && jdParsed && (
        <BentoCard padded="spacious" className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-jetbrains font-bold text-foreground">
              Review extracted attributes
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
              Verify detected candidate skills against target requirements before calculating the skill gap matrix.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 p-4 sm:p-5 rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-foreground">
                <FileText className="h-4 w-4 text-[#F64302]" />
                <span>Candidate Skill Profile ({resumeParsed.skills.length})</span>
              </div>
              <ChipList
                values={resumeParsed.skills}
                onChange={(skills) => setResumeParsed({ ...resumeParsed, skills })}
              />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-3">
                Experience highlights
              </p>
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

            <div className="space-y-3 p-4 sm:p-5 rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-foreground">
                <FileText className="h-4 w-4 text-[#F64302]" />
                <span>Target Role Requirements ({jdParsed.requiredSkills.length})</span>
              </div>
              <ChipList
                values={jdParsed.requiredSkills}
                onChange={(requiredSkills) => setJdParsed({ ...jdParsed, requiredSkills })}
              />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-3">
                Preferred additional skills
              </p>
              <ChipList
                values={jdParsed.preferredSkills}
                onChange={(preferredSkills) => setJdParsed({ ...jdParsed, preferredSkills })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-black/[0.05] dark:border-white/[0.06]">
            <Button
              variant="outline"
              className="rounded-xl font-mono text-xs font-semibold"
              onClick={() => setStep(2)}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md shadow-[#F64302]/20"
              onClick={() => void analyze()}
              disabled={loading}
            >
              Calculate skill gap →
            </Button>
          </div>
        </BentoCard>
      )}

      {/* Step 4: Skill Gap & Start Interview */}
      {!loading && step === 4 && gap && (
        <div className="space-y-6">
          {/* Hero Match Score Card */}
          <div className="rounded-2xl bg-black text-white p-6 sm:p-8 md:p-10 border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#F64302]">
                  Match Score Evaluation
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#F64302]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-jetbrains font-bold text-white">
                Skill alignment calculated
              </h2>
              <p className="text-xs sm:text-sm text-white/70 font-mono leading-relaxed">
                {gap.narrative}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 border border-white/20">
                <span className="font-bubbledot text-4xl font-bold text-[#F64302]">
                  {gap.matchScore}%
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-white/50 mt-1.5 tracking-wider">
                Role Alignment
              </span>
            </div>
          </div>

          {/* Grouped Skill Chips: Matched, Partial, Missing */}
          <div className="grid gap-3 md:grid-cols-3">
            {/* Matched */}
            <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Matched Skills ({gap.matched.length})</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {gap.matched.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No direct overlap detected.</p>
                ) : (
                  gap.matched.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-1 text-xs font-mono font-medium"
                    >
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Partial */}
            <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Partial Overlap ({gap.partial.length})</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {gap.partial.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No adjacent skills identified.</p>
                ) : (
                  gap.partial.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2 py-1 text-xs font-mono font-medium"
                    >
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Missing */}
            <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#F64302]">
                  <AlertCircle className="w-4 h-4" />
                  <span>Missing Gaps ({gap.missing.length})</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {gap.missing.length === 0 ? (
                  <p className="text-xs text-muted-foreground">All required skills matched!</p>
                ) : (
                  gap.missing.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-[#F64302]/10 text-[#F64302] border border-[#F64302]/20 px-2 py-1 text-xs font-mono font-medium"
                    >
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Row with Clear "Start Interview" CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              className="rounded-xl font-mono text-xs font-semibold"
              onClick={() => router.push("/documents")}
            >
              View saved documents
            </Button>

            <Button
              className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider px-8 h-12 shadow-lg shadow-[#F64302]/25 gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              onClick={() => router.push("/interview")}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start interview now →</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
