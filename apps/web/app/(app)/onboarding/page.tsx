"use client";

import { useEffect, useMemo, useState } from "react";
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
  RefreshCw,
  Plus,
  SkipForward,
} from "lucide-react";
import {
  calculateSkillGap,
  skillGapResponseSchema,
  type JdParsed,
  type ResumeParsed,
  type SkillGapResponse,
} from "@rehearse/shared";
import { Button } from "@/components/ui/button";
import { ChipList } from "@/components/chip-list";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento-card";
import { StatusChip } from "@/components/ui/status-chip";
import { toast } from "@/components/ui/toast";

type ResumeRow = { id: string; fileName: string; parsed: ResumeParsed };
type JdRow = { id: string; title: string; parsed: JdParsed };

interface ErrorState {
  message: string;
  errorId?: string;
  canRetry?: boolean;
  type?: "service" | "rate_limit" | "no_skills" | "generic";
}

const STEPS = [
  { step: 1, label: "Resume" },
  { step: 2, label: "Job Description" },
  { step: 3, label: "Skill Gap" },
  { step: 4, label: "Start Rehearsal" },
];

const LOADING_STEPS = [
  "Reading your resume...",
  "Reading the job description...",
  "Comparing skills & calculating alignment...",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [resume, setResume] = useState<ResumeRow | null>(null);
  const [resumeParsed, setResumeParsed] = useState<ResumeParsed | null>(null);

  const [jdText, setJdText] = useState("");
  const [jdTitle, setJdTitle] = useState("");
  const [jd, setJd] = useState<JdRow | null>(null);
  const [jdParsed, setJdParsed] = useState<JdParsed | null>(null);

  const [gap, setGap] = useState<SkillGapResponse | null>(null);

  // Prefetch candidate's existing resume and JD if available
  useEffect(() => {
    async function loadExisting() {
      try {
        const [resRes, jdRes] = await Promise.all([
          fetch("/api/resumes"),
          fetch("/api/jds"),
        ]);
        if (resRes.ok && jdRes.ok) {
          const resData = await resRes.json();
          const jdData = await jdRes.json();
          if (resData.resumes?.length > 0 && jdData.jobDescriptions?.length > 0) {
            const latestResume = resData.resumes[0];
            const latestJd = jdData.jobDescriptions[0];
            setResume(latestResume);
            setResumeParsed(latestResume.parsed);
            setJd(latestJd);
            setJdParsed(latestJd.parsed);

            // Compute skill alignment directly so candidate lands on Step 4 (Skill Gap)
            const computedGap = calculateSkillGap(
              latestResume.parsed?.skills || [],
              latestJd.parsed?.requiredSkills || [],
              latestJd.parsed?.preferredSkills || []
            );
            setGap(computedGap as any);
            setStep(4);
          }
        }
      } catch (e) {
        console.warn("Could not prefetch existing documents:", e);
      }
    }
    loadExisting();
  }, []);

  // Rotate loading step messages while loading
  useEffect(() => {
    if (!loading) return;
    setLoadingStepIdx(0);
    const interval = setInterval(() => {
      setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const experienceChips = useMemo(
    () =>
      (resumeParsed?.experience ?? [])
        .map((e) => [e.title, e.company].filter(Boolean).join(" @ "))
        .filter(Boolean),
    [resumeParsed],
  );

  async function uploadResume(file: File) {
    setLoading(true);
    setErrorState(null);
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
      console.error("[uploadResume] Error:", err);
      setErrorState({
        message: "Could not parse resume file. Please ensure it is a valid PDF or DOCX.",
        errorId: `ERR-RES-${Date.now().toString(36)}`,
        canRetry: true,
      });
      toast.error("Failed to parse resume");
    } finally {
      setLoading(false);
    }
  }

  async function submitJd() {
    if (!jdText.trim()) return;
    setLoading(true);
    setErrorState(null);
    try {
      const res = await fetch("/api/jds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: jdText, title: jdTitle || undefined }),
      });
      const data = (await res.json()) as { jobDescription?: JdRow; error?: { message: string } };
      if (!res.ok || !data.jobDescription)
        throw new Error(data.error?.message ?? "Failed to parse JD");
      setJd(data.jobDescription);
      setJdParsed(data.jobDescription.parsed);
      toast.success("Job description requirements extracted!");
      setStep(3);
    } catch (err) {
      console.error("[submitJd] Error:", err);
      setErrorState({
        message: "Could not parse job description. Please check the text and try again.",
        errorId: `ERR-JD-${Date.now().toString(36)}`,
        canRetry: true,
      });
      toast.error("Failed to parse job description");
    } finally {
      setLoading(false);
    }
  }

  async function uploadJdFile(file: File) {
    setLoading(true);
    setErrorState(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (jdTitle) formData.append("title", jdTitle);
      const res = await fetch("/api/jds", { method: "POST", body: formData });
      const data = (await res.json()) as { jobDescription?: JdRow; error?: { message: string } };
      if (!res.ok || !data.jobDescription)
        throw new Error(data.error?.message ?? "Failed to parse JD");
      setJd(data.jobDescription);
      setJdParsed(data.jobDescription.parsed);
      toast.success("Job description parsed successfully!");
      setStep(3);
    } catch (err) {
      console.error("[uploadJdFile] Error:", err);
      setErrorState({
        message: "Could not parse job description file. Try again with plain text or PDF.",
        errorId: `ERR-JDFILE-${Date.now().toString(36)}`,
        canRetry: true,
      });
      toast.error("Failed to parse job description");
    } finally {
      setLoading(false);
    }
  }

  async function analyze(recalculate = false) {
    if (!resume || !jd) return;
    setLoading(true);
    setErrorState(null);

    // 20-second client-side timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    try {
      const res = await fetch("/api/skill-gap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          resumeId: resume.id,
          jdId: jd.id,
          recalculate,
          resumeSkills: resumeParsed?.skills,
          requiredSkills: jdParsed?.requiredSkills,
          preferredSkills: jdParsed?.preferredSkills,
        }),
      });

      clearTimeout(timeoutId);

      const data = (await res.json().catch(() => null)) as {
        skillGap?: SkillGapResponse;
        matched?: string[];
        error?: { code: string; message: string };
      } | null;

      if (!res.ok) {
        const status = res.status;
        const errCode = data?.error?.code ?? "";
        if (status === 429 || errCode === "RATE_LIMITED") {
          throw new Error("RATE_LIMIT");
        }
        throw new Error(data?.error?.message ?? `HTTP ${status}`);
      }

      // Robust contract handling: supports both { skillGap: ... } and direct object
      const parsedGap =
        data?.skillGap ??
        (data && Array.isArray((data as SkillGapResponse).matched)
          ? (data as SkillGapResponse)
          : null);

      if (!parsedGap) {
        throw new Error("INVALID_PAYLOAD");
      }

      setGap(parsedGap);
      setStep(4);
      setErrorState(null);
      toast.success(recalculate ? "Skill gap recalculated!" : "Skill gap matrix calculated!");
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.error("[analyze] Skill gap calculation error:", err);

      const isAbort =
        (err as { name?: string })?.name === "AbortError" ||
        String(err).toLowerCase().includes("abort") ||
        String(err).toLowerCase().includes("timeout");
      const isRate = String(err).includes("RATE_LIMIT") || String(err).includes("429");

      const errorId = `ERR-SG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      if (isRate) {
        // Fall back to rule-based directly on the client to never block user
        const fallback = calculateSkillGap(
          resumeParsed?.skills || [],
          jdParsed?.requiredSkills || [],
          jdParsed?.preferredSkills || [],
        );
        const fallbackWithNote = skillGapResponseSchema.parse({
          ...fallback,
          note: "We hit the AI usage limit. Showing automatic matching instead.",
        });
        setGap(fallbackWithNote);
        setStep(4);
        toast.info("Showing automatic matching due to AI limit");
        return;
      }

      if (isAbort) {
        setErrorState({
          message: "Could not reach the analysis service. Try again",
          errorId,
          canRetry: true,
          type: "service",
        });
        toast.error("Analysis timed out");
      } else if (!resumeParsed?.skills?.length) {
        setErrorState({
          message: "Your resume has no readable skills. Add them below",
          errorId,
          canRetry: true,
          type: "no_skills",
        });
      } else {
        // Run safe client-side fallback so user is never stranded
        const fallback = calculateSkillGap(
          resumeParsed?.skills || [],
          jdParsed?.requiredSkills || [],
          jdParsed?.preferredSkills || [],
        );
        setGap(
          skillGapResponseSchema.parse({
            ...fallback,
            note: "Showing automatic matching. Analysis service was unreachable.",
          }),
        );
        setStep(4);
        toast.info("Loaded automatic skill matching");
      }
    } finally {
      setLoading(false);
    }
  }

  function skipToInterview() {
    if (!gap) {
      const fallback = calculateSkillGap(
        resumeParsed?.skills || [],
        jdParsed?.requiredSkills || [],
        jdParsed?.preferredSkills || [],
      );
      setGap(
        skillGapResponseSchema.parse({
          ...fallback,
          note: "Skipped skill gap analysis. Ready for rehearsal.",
        }),
      );
    }
    setStep(4);
  }

  function addSampleSkillsToResume() {
    if (!resumeParsed) return;
    const defaults = ["TypeScript", "JavaScript", "React", "Node.js", "SQL", "Git"];
    setResumeParsed({
      ...resumeParsed,
      skills: Array.from(new Set([...resumeParsed.skills, ...defaults])),
    });
    setErrorState(null);
    toast.success("Added sample skills to profile!");
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
                  disabled={step < s.step && !gap}
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

      {/* Specific Human Error Banner */}
      {errorState && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0 text-rose-500" />
            <div className="space-y-0.5">
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {errorState.message}
              </span>
              {errorState.errorId && (
                <p className="text-[10px] text-rose-500/70 font-mono">
                  Reference: {errorState.errorId}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {errorState.canRetry && (
              <Button
                variant="outline"
                className="h-8 rounded-xl font-mono text-xs border-rose-500/40 text-rose-500 hover:bg-rose-500/10 gap-1.5"
                onClick={() => void analyze(false)}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try again</span>
              </Button>
            )}
            <Button
              variant="outline"
              className="h-8 rounded-xl font-mono text-xs border-black/15 dark:border-white/15 text-foreground hover:bg-black/5 dark:hover:bg-white/5 gap-1.5"
              onClick={skipToInterview}
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip and start with resume & JD</span>
            </Button>
          </div>
        </div>
      )}

      {/* Loading State with Animated Stepper */}
      {loading && (
        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-8 sm:p-12 space-y-6 flex flex-col items-center justify-center text-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <RefreshCw className="h-8 w-8 text-[#F64302] animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-jetbrains font-bold text-foreground">
              {LOADING_STEPS[loadingStepIdx]}
            </h3>
            <p className="text-xs text-muted-foreground font-mono max-w-sm">
              Cross-referencing candidate background against job requirements using deterministic matching and AI insights.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            {LOADING_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === loadingStepIdx ? "w-6 bg-[#F64302]" : "w-2 bg-black/15 dark:bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-jetbrains font-bold text-foreground">
                Review extracted attributes
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                Verify detected candidate skills against target requirements before calculating the skill gap matrix. You can add or remove skills below.
              </p>
            </div>
            {resumeParsed.skills.length === 0 && (
              <Button
                variant="outline"
                onClick={addSampleSkillsToResume}
                className="h-8 rounded-xl font-mono text-xs border-[#F64302]/40 text-[#F64302] hover:bg-[#F64302]/10 gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add sample skills</span>
              </Button>
            )}
          </div>

          {/* Empty warnings if applicable */}
          {resumeParsed.skills.length === 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Your resume has no readable skills. Add them below before computing the gap.</span>
              </div>
              <Button
                variant="outline"
                onClick={addSampleSkillsToResume}
                className="h-7 px-2.5 text-[11px] rounded-lg border-amber-500/40 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300"
              >
                Add skills
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Candidate Skill Profile */}
            <div className="space-y-3 p-4 sm:p-5 rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#F64302]" />
                  <span>Candidate Skill Profile ({resumeParsed.skills.length})</span>
                </div>
              </div>
              <ChipList
                values={resumeParsed.skills}
                placeholder="Add skill (e.g. React, Python) and press Enter"
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

            {/* Target Role Requirements */}
            <div className="space-y-3 p-4 sm:p-5 rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#F64302]" />
                  <span>Target Role Requirements ({jdParsed.requiredSkills.length})</span>
                </div>
              </div>
              <ChipList
                values={jdParsed.requiredSkills}
                placeholder="Add required skill and press Enter"
                onChange={(requiredSkills) => setJdParsed({ ...jdParsed, requiredSkills })}
              />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-3">
                Preferred additional skills ({jdParsed.preferredSkills.length})
              </p>
              <ChipList
                values={jdParsed.preferredSkills}
                placeholder="Add preferred skill and press Enter"
                onChange={(preferredSkills) => setJdParsed({ ...jdParsed, preferredSkills })}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-black/[0.05] dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl font-mono text-xs font-semibold"
                onClick={() => setStep(2)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                className="rounded-xl font-mono text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={skipToInterview}
                disabled={loading}
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Skip to rehearsal</span>
              </Button>
            </div>

            <Button
              className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md shadow-[#F64302]/20 gap-2"
              onClick={() => void analyze(false)}
              disabled={loading}
            >
              <span>Calculate skill gap →</span>
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
              {gap.note && (
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] text-amber-300 font-mono">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{gap.note}</span>
                  </span>
                </div>
              )}
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

          {/* Extra Resume Skills (if detected) */}
          {gap.extraSkills && gap.extraSkills.length > 0 && (
            <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-foreground">
                  <FileText className="w-4 h-4 text-[#F64302]" />
                  <span>Additional Candidate Skills ({gap.extraSkills.length})</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Skills you bring beyond JD requirements</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {gap.extraSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-lg bg-black/5 dark:bg-white/5 text-foreground border border-black/10 dark:border-white/10 px-2 py-1 text-xs font-mono font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl font-mono text-xs font-semibold gap-1.5"
                onClick={() => setStep(3)}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Adjust skills</span>
              </Button>
              <Button
                variant="outline"
                className="rounded-xl font-mono text-xs font-semibold gap-1.5"
                onClick={() => void analyze(true)}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recalculate</span>
              </Button>
            </div>

            <Button
              className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider px-8 h-12 shadow-lg shadow-[#F64302]/25 gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              onClick={() => router.push("/interview")}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start rehearsal now →</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
