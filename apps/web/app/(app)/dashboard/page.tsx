import Link from "next/link";
import { Play, FileText, ArrowRight, Activity, Award, CheckCircle2, Clock } from "lucide-react";
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

  const completedSessions = sessions.filter((s) => s.status === "COMPLETED").length;
  const totalSkillsCount = resumes.reduce((acc, r) => {
    const p = resumeParsedSchema.safeParse(r.parsed);
    return acc + (p.success ? p.data.skills.length : 0);
  }, 0);

  return (
    <div className="space-y-3 font-mono">
      {dbError && (
        <div className="rounded-2xl border border-[#F64302]/30 bg-[#F64302]/10 p-4 text-xs text-[#F64302]">
          <strong className="font-bold">DATABASE NOTICE:</strong> {dbError}
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 sm:p-6 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / DASHBOARD</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bubbledot font-bold tracking-tight text-foreground">
            CANDIDATE WORKSPACE
          </h1>
          <p className="text-xs text-muted-foreground">
            Welcome back, <span className="text-foreground font-semibold">{session?.user?.name || "Candidate"}</span>. Aria voice agent is standing by.
          </p>
        </div>

        <Link
          href="/onboarding"
          className="inline-flex h-11 items-center justify-center gap-2.5 rounded-xl bg-[#F64302] hover:bg-[#d93800] px-5 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md shadow-[#F64302]/20 shrink-0"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>+ Initialize Session</span>
        </Link>
      </div>

      {/* Quick Metrics Bar (Bento Row 1) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-4 flex flex-col justify-between">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase">SESSIONS REHEARSED</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-bubbledot text-3xl font-bold text-foreground">
              {String(sessions.length).padStart(2, "0")}
            </span>
            <Activity className="w-4 h-4 text-[#F64302]" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-4 flex flex-col justify-between">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase">COMPLETED ROUNDS</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-bubbledot text-3xl font-bold text-foreground">
              {String(completedSessions).padStart(2, "0")}
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#F64302]" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-4 flex flex-col justify-between">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase">INDEXED SKILLS</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-bubbledot text-3xl font-bold text-foreground">
              {String(totalSkillsCount).padStart(2, "0")}
            </span>
            <Award className="w-4 h-4 text-[#F64302]" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-4 flex flex-col justify-between">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase">TARGET ROLES</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-bubbledot text-3xl font-bold text-foreground">
              {String(jds.length).padStart(2, "0")}
            </span>
            <FileText className="w-4 h-4 text-[#F64302]" />
          </div>
        </div>
      </div>

      {/* Main Content (Bento Row 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Recent Interviews Card (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bubbledot text-xs text-[#F64302]">02</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Recent Rehearsals</h2>
            </div>
            <Link
              href="/interview"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              All sessions <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#F64302]/10 border border-[#F64302]/30 text-[#F64302]">
                <Play className="h-4 w-4 fill-current" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide">No Rehearsals Recorded Yet</h3>
              <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                Upload your resume and a target job description to compute your skill gap matrix, then launch an adaptive technical session with Aria.
              </p>
              <Link
                href="/onboarding"
                className="inline-flex h-9 items-center justify-center rounded-xl bg-foreground text-background px-4 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Begin Onboarding Prep →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s, idx) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-3.5 flex items-center justify-between hover:border-[#F64302]/50 transition-all duration-200"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bubbledot text-xs text-muted-foreground">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm font-semibold text-foreground tracking-tight">{s.jd.title}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{s.createdAt.toISOString().slice(0, 10)}</span>
                      <span>·</span>
                      <span className="font-mono uppercase text-[#F64302]">{s.status}</span>
                    </div>
                  </div>

                  <Link
                    href={`/interview/${s.id}`}
                    className="h-8 px-3 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-[#F64302] hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    Enter <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Saved Documents Card (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bubbledot text-xs text-[#F64302]">03</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Saved Dossier</h2>
            </div>
            <Link href="/documents" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {resumes.length === 0 && jds.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-2">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
              <h4 className="text-xs font-bold uppercase tracking-wide">No Documents Saved</h4>
              <p className="text-[11px] text-muted-foreground">Upload your resume and JD to enable adaptive questioning.</p>
              <Link
                href="/onboarding"
                className="inline-block mt-2 text-xs text-[#F64302] hover:underline"
              >
                Upload Now →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {resumes.map((r) => {
                const parsed = resumeParsedSchema.safeParse(r.parsed);
                return (
                  <div
                    key={r.id}
                    className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-3 hover:border-[#F64302]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                        {r.fileName}
                      </p>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-muted-foreground">
                        Resume
                      </span>
                    </div>
                    <p className="mt-1 font-bubbledot text-xs text-[#F64302]">
                      {parsed.success ? parsed.data.skills.length : 0} SKILLS PARSED
                    </p>
                  </div>
                );
              })}
              {jds.map((j) => {
                const parsed = jdParsedSchema.safeParse(j.parsed);
                return (
                  <div
                    key={j.id}
                    className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-3 hover:border-[#F64302]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                        {j.title}
                      </p>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-muted-foreground">
                        Target JD
                      </span>
                    </div>
                    <p className="mt-1 font-bubbledot text-xs text-[#F64302]">
                      {parsed.success ? parsed.data.requiredSkills.length : 0} REQUIRED SKILLS
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
