"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText, UploadCloud } from "lucide-react";
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
    <div className="mx-auto max-w-3xl py-2">
      <h1 className="text-3xl font-semibold tracking-tight">Prepare your interview</h1>
      <p className="mt-2 text-sm text-muted">Upload a resume, add a job description, then review the skill gap.</p>
      <div className="mt-4 flex items-center gap-2 text-sm text-muted">
        <span className={step >= 1 ? "font-medium text-foreground" : ""}>1. Resume</span>
        <ArrowRight className="h-4 w-4" />
        <span className={step >= 2 ? "font-medium text-foreground" : ""}>2. Job description</span>
        <ArrowRight className="h-4 w-4" />
        <span className={step >= 3 ? "font-medium text-foreground" : ""}>3. Review</span>
        <ArrowRight className="h-4 w-4" />
        <span className={step >= 4 ? "font-medium text-foreground" : ""}>4. Gap</span>
      </div>

      <div className="relative mt-8 overflow-hidden rounded border border-border bg-surface p-6">
        {step === 1 ? <div className="grid-dot pointer-events-none absolute inset-0" /> : null}
        {error ? <div className="relative mb-6 rounded border border-border-strong p-4 text-sm">{error}</div> : null}

        {step === 1 && (
          <div className="relative space-y-6">
            <div>
              <h2 className="text-xl font-medium">Upload your resume</h2>
              <p className="mt-1 text-sm text-muted">PDF, DOCX, or TXT. Max 5MB.</p>
            </div>
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded border border-dashed border-border-strong p-12 transition-colors duration-200 hover:bg-elevated ${dragOver ? "bg-elevated" : ""}`}
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
              <UploadCloud className="mb-4 h-10 w-10 text-muted" />
              <span className="font-medium">Drop a file or click to browse</span>
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
            {loading ? <p className="text-center font-mono text-sm text-muted">Parsing resume…</p> : null}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-medium">Add the job description</h2>
              <p className="mt-1 text-sm text-muted">Paste text or upload a file. Saved JDs can be reused later.</p>
            </div>
            <Input placeholder="Role title (optional)" value={jdTitle} onChange={(e) => setJdTitle(e.target.value)} />
            <Textarea
              className="h-56"
              placeholder="Paste job description here…"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              disabled={loading}
            />
            <label className="block text-sm text-muted">
              Or upload a JD file
              <Input
                className="mt-2"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadJdFile(file);
                }}
              />
            </label>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                Back
              </Button>
              <Button onClick={() => void submitJd()} disabled={loading || jdText.trim().length < 20}>
                {loading ? "Parsing…" : "Next"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && resumeParsed && jdParsed && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-medium">Review extracted chips</h2>
              <p className="mt-1 text-sm text-muted">Add or remove skills before the gap analysis.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4" /> Your skills
                </h3>
                <ChipList
                  values={resumeParsed.skills}
                  onChange={(skills) => setResumeParsed({ ...resumeParsed, skills })}
                />
                <p className="text-xs uppercase tracking-wide text-muted">Experience</p>
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
                <p className="text-xs uppercase tracking-wide text-muted">Education</p>
                <ChipList
                  values={educationChips}
                  onChange={(chips) =>
                    setResumeParsed({
                      ...resumeParsed,
                      education: chips.map((chip) => {
                        const [degree, school] = chip.split(", ");
                        return { degree: degree ?? chip, school: school ?? "" };
                      }),
                    })
                  }
                  placeholder="Degree, School"
                />
              </div>
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4" /> Required skills
                </h3>
                <ChipList
                  values={jdParsed.requiredSkills}
                  onChange={(requiredSkills) => setJdParsed({ ...jdParsed, requiredSkills })}
                />
                <p className="text-xs uppercase tracking-wide text-muted">Preferred</p>
                <ChipList
                  values={jdParsed.preferredSkills}
                  onChange={(preferredSkills) => setJdParsed({ ...jdParsed, preferredSkills })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>
                Back
              </Button>
              <Button onClick={() => void analyze()} disabled={loading}>
                {loading ? "Analyzing…" : "Analyze skill gap"}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && gap && (
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <div className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full border border-foreground bg-elevated">
                <span className="font-mono text-2xl">{gap.matchScore}%</span>
              </div>
              <h2 className="text-2xl font-medium">Match score</h2>
              <p className="mx-auto max-w-lg text-muted">{gap.narrative}</p>
            </div>
            <div className="grid gap-4 text-sm md:grid-cols-3">
              <div className="space-y-3 rounded border border-border bg-background p-4">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 fill-foreground text-background" />
                  Matched ({gap.matched.length})
                </div>
                <ul className="space-y-1 text-muted">
                  {gap.matched.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3 rounded border border-border bg-background p-4">
                <div className="flex items-center gap-2 font-medium">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-muted" />
                  Missing ({gap.missing.length})
                </div>
                <ul className="space-y-1 text-muted">
                  {gap.missing.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3 rounded border border-border bg-background p-4">
                <div className="flex items-center gap-2 font-medium">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  </span>
                  Partial ({gap.partial.length})
                </div>
                <ul className="space-y-1 text-muted">
                  {gap.partial.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => router.push("/documents")}>
                Saved documents
              </Button>
              <Button onClick={() => router.push("/dashboard")} className="gap-2">
                Go to dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-xs text-muted">
              Interview question generation is the next step after this onboarding flow.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
