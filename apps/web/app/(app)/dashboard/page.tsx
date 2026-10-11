import Link from "next/link";
import { Play, FileText, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resumeParsedSchema, jdParsedSchema } from "@rehearse/shared";

type DashboardResume = Awaited<ReturnType<typeof prisma.resume.findMany>>[number];
type DashboardJobDescription = Awaited<ReturnType<typeof prisma.jobDescription.findMany>>[number];
type DashboardSession = {
  id: string;
  status: string;
  createdAt: Date;
  jd: { title: string };
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  let resumes: DashboardResume[] = [];
  let jds: DashboardJobDescription[] = [];
  let sessions: DashboardSession[] = [];

  let dbError: string | null = null;

  if (userId) {
    try {
      [resumes, jds, sessions] = await Promise.all([
        prisma.resume.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.jobDescription.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.interviewSession.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { jd: { select: { title: true } } },
        }),
      ]);
    } catch (err: any) {
      console.error("[Dashboard] DB error:", err?.message ?? err);
      dbError = "Could not connect to the database. Please ensure the database server is running and try again.";
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {dbError && (
        <div className="rounded border border-border bg-surface px-4 py-3 text-sm text-muted">
          <strong>Database unavailable:</strong> {dbError}
        </div>
      )}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted">Welcome back, {session?.user?.name || "Candidate"}.</p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex h-10 items-center justify-center gap-2 rounded bg-accent px-4 text-sm font-medium text-background transition-colors duration-150 hover:opacity-90"
        >
          <Play className="h-4 w-4 fill-current" />
          Start new interview
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Recent interviews</h2>
          </div>
          {sessions.length === 0 ? (
            <div className="relative overflow-hidden rounded border border-border bg-surface px-4 py-12 text-center">
              <div className="grid-dot pointer-events-none absolute inset-0" />
              <div className="relative">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-elevated">
                  <Play className="h-5 w-5 text-muted" />
                </div>
                <h3 className="text-lg font-medium">No interviews yet</h3>
                <p className="mx-auto mt-1 mb-6 max-w-sm text-sm text-muted">
                  Upload a resume and a job description to compute your skill gap, then generate questions in the next
                  phase.
                </p>
                <Link
                  href="/onboarding"
                  className="inline-flex h-10 items-center justify-center rounded border border-border px-4 text-sm hover:bg-elevated"
                >
                  Start your first prep
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li key={s.id} className="rounded border border-border bg-surface p-4">
                  <p className="font-medium">{s.jd.title}</p>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {s.status} · {s.createdAt.toISOString().slice(0, 10)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Saved documents</h2>
            <Link href="/documents" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
              Manage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {resumes.length === 0 && jds.length === 0 ? (
            <div className="rounded border border-border bg-surface p-4">
              <FileText className="h-8 w-8 text-muted" />
              <h4 className="mt-2 text-sm font-medium">Nothing saved yet</h4>
              <p className="mt-0.5 text-xs text-muted">Upload during onboarding.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resumes.map((r) => {
                const parsed = resumeParsedSchema.safeParse(r.parsed);
                return (
                  <div key={r.id} className="rounded border border-border bg-surface p-4">
                    <p className="text-sm font-medium">{r.fileName}</p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {parsed.success ? parsed.data.skills.length : 0} skills
                    </p>
                  </div>
                );
              })}
              {jds.map((j) => {
                const parsed = jdParsedSchema.safeParse(j.parsed);
                return (
                  <div key={j.id} className="rounded border border-border bg-surface p-4">
                    <p className="text-sm font-medium">{j.title}</p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {parsed.success ? parsed.data.requiredSkills.length : 0} required skills
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
