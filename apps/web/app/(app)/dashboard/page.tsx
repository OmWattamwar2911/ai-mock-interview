import Link from "next/link";
import Image from "next/image";
import {
  Play,
  FileText,
  ArrowRight,
  Activity,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Code2,
  MessageSquare,
  FileSearch,
  ChevronRight,
  Zap,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resumeParsedSchema, jdParsedSchema } from "@rehearse/shared";
import { StatTile } from "@/components/ui/stat-tile";
import { SectionCard } from "@/components/ui/section-card";
import { DataRow } from "@/components/ui/data-row";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const firstName = session?.user?.name ? session.user.name.split(" ")[0] : "Candidate";

  let resumes: any[] = [];
  let jds: any[] = [];
  let sessions: any[] = [];
  let reports: any[] = [];
  let dbError: string | null = null;

  if (userId) {
    try {
      [resumes, jds, sessions, reports] = await Promise.all([
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
          include: {
            jd: { select: { title: true } },
            report: { select: { id: true, overallScore: true } },
          },
        }),
        prisma.feedbackReport.findMany({
          where: { session: { userId } },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            session: { select: { jd: { select: { title: true } } } },
          },
        }),
      ]);
    } catch (err: any) {
      console.error("[Dashboard] DB error:", err?.message ?? err);
      dbError = "Could not connect to database. Stored offline sessions are displayed.";
    }
  }

  const completedSessions = sessions.filter((s) => s.status === "COMPLETED").length;
  const totalSkillsCount = resumes.reduce((acc, r) => {
    const p = resumeParsedSchema.safeParse(r.parsed);
    return acc + (p.success ? p.data.skills.length : 0);
  }, 0);

  const latestReport = reports[0];
  const weakestArea =
    latestReport?.weaknesses && Array.isArray(latestReport.weaknesses) && latestReport.weaknesses.length > 0
      ? (latestReport.weaknesses[0]?.title || latestReport.weaknesses[0])
      : null;

  // Next best step determination based on existing data
  let nextStep = {
    title: "Start an interview rehearsal",
    desc: "Connect with Aria to practice real-time conversational and technical interview questions.",
    actionLabel: "Start interview",
    href: "/interview",
    icon: <Play className="w-4 h-4 fill-current" />,
  };

  if (resumes.length === 0) {
    nextStep = {
      title: "Complete your onboarding profile",
      desc: "Upload your resume in Prep to compute your skill-gap matrix and tailor Aria's technical questions.",
      actionLabel: "Upload resume",
      href: "/onboarding",
      icon: <Sparkles className="w-4 h-4" />,
    };
  } else if (jds.length === 0) {
    nextStep = {
      title: "Target a specific job description",
      desc: "Add a target role description so Aria tests company-specific competencies and domain questions.",
      actionLabel: "Add job description",
      href: "/onboarding",
      icon: <FileText className="w-4 h-4" />,
    };
  } else if (completedSessions === 0 && sessions.length > 0) {
    nextStep = {
      title: "Resume your interview session",
      desc: "You have an ongoing practice session waiting. Reconnect now to complete your evaluation.",
      actionLabel: "Resume session",
      href: `/interview/${sessions[0].id}`,
      icon: <Play className="w-4 h-4 fill-current" />,
    };
  } else if (latestReport) {
    nextStep = {
      title: `Review your report for ${latestReport.session?.jd?.title || "recent round"}`,
      desc: weakestArea
        ? `Aria flagged "${weakestArea}" as an area for improvement. Check concrete actionable fixes.`
        : "Inspect your evaluation report, speaking fluency analytics, and answer transcripts.",
      actionLabel: "View report",
      href: `/interview/${latestReport.sessionId}/report`,
      icon: <Award className="w-4 h-4" />,
    };
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono">
      {dbError && (
        <div className="rounded-2xl border border-[#F64302]/30 bg-[#F64302]/10 p-4 text-xs text-[#F64302]">
          <strong>Notice:</strong> {dbError}
        </div>
      )}

      {/* ── 1. Hero Card with Atmosphere Poster ───────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-black text-white p-6 sm:p-8 md:p-10 border border-white/10 shadow-2xl">
        {/* Atmosphere Poster Background */}
        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen">
          <Image
            src="/assets/rehearse/hero-poster.webp"
            alt="Atmospheric charcoal backdrop"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-[#F64302]">
              Welcome back, {firstName}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] animate-pulse" />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-jetbrains font-bold tracking-tight text-white leading-tight">
            Ready for your next rehearsal?
          </h1>

          <p className="text-xs sm:text-sm text-white/70 font-mono leading-relaxed">
            {completedSessions > 0
              ? `You have completed ${completedSessions} interview ${completedSessions === 1 ? "round" : "rounds"}.${
                  weakestArea ? ` Focus topic: ${weakestArea}.` : " Keep your fluency and technical cadence high."
                }`
              : "Aria voice agent is calibrated and ready to run an adaptive mock session with full-duplex audio and live code compiling."}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/interview"
              className="inline-flex h-11 items-center justify-center gap-2.5 rounded-xl bg-[#F64302] hover:bg-[#d93800] px-6 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-[#F64302]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Start interview</span>
            </Link>

            <Link
              href="/analyzer/resume"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-5 text-xs font-semibold text-white border border-white/10 transition-colors"
            >
              <FileSearch className="h-3.5 w-3.5 text-[#F64302]" />
              <span>Analyze my resume</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. Next Best Step Card ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F64302]/10 border border-[#F64302]/20 text-[#F64302]">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#F64302]">
                Recommended next step
              </span>
            </div>
            <h2 className="font-jetbrains font-bold text-sm sm:text-base text-foreground mt-0.5">
              {nextStep.title}
            </h2>
            <p className="font-mono text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
              {nextStep.desc}
            </p>
          </div>
        </div>

        <Link
          href={nextStep.href}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-[#F64302] dark:hover:bg-[#F64302] dark:hover:text-white px-5 text-xs font-bold uppercase tracking-wider transition-all duration-200"
        >
          <span>{nextStep.actionLabel}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── 3. Bento Row of Four Stat Tiles ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Interviews"
          value={String(sessions.length).padStart(2, "0")}
          icon={<Activity className="w-4 h-4" />}
          delta={sessions.length > 0 ? { value: `${sessions.length} total`, trend: "up" } : undefined}
        />
        <StatTile
          label="Rounds Completed"
          value={String(completedSessions).padStart(2, "0")}
          icon={<CheckCircle2 className="w-4 h-4" />}
          delta={completedSessions > 0 ? { value: `${completedSessions} evaluated`, trend: "up" } : undefined}
        />
        <StatTile
          label="Skills Found"
          value={String(totalSkillsCount).padStart(2, "0")}
          icon={<Award className="w-4 h-4" />}
          delta={totalSkillsCount > 0 ? { value: "Indexed", trend: "neutral" } : undefined}
        />
        <StatTile
          label="Target Roles"
          value={String(jds.length).padStart(2, "0")}
          icon={<FileText className="w-4 h-4" />}
          delta={jds.length > 0 ? { value: "Configured", trend: "neutral" } : undefined}
        />
      </div>

      {/* ── 4. Practice Shortcuts Strip ───────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
          Practice Shortcuts
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/interview"
            className="group rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-4 flex flex-col justify-between hover:-translate-y-0.5 hover:border-[#F64302]/40 transition-all duration-200 shadow-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-[#F64302] group-hover:bg-[#F64302] group-hover:text-white transition-colors">
              <Code2 className="h-4 w-4" />
            </div>
            <div className="mt-4">
              <p className="font-jetbrains font-bold text-xs text-foreground group-hover:text-[#F64302] transition-colors">
                Coding Round
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Live compiler &amp; tests</p>
            </div>
          </Link>

          <Link
            href="/interview"
            className="group rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-4 flex flex-col justify-between hover:-translate-y-0.5 hover:border-[#F64302]/40 transition-all duration-200 shadow-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-[#F64302] group-hover:bg-[#F64302] group-hover:text-white transition-colors">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="mt-4">
              <p className="font-jetbrains font-bold text-xs text-foreground group-hover:text-[#F64302] transition-colors">
                Behavioral Round
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">STAR method evaluation</p>
            </div>
          </Link>

          <Link
            href="/oa"
            className="group rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-4 flex flex-col justify-between hover:-translate-y-0.5 hover:border-[#F64302]/40 transition-all duration-200 shadow-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-[#F64302] group-hover:bg-[#F64302] group-hover:text-white transition-colors">
              <Clock className="h-4 w-4" />
            </div>
            <div className="mt-4">
              <p className="font-jetbrains font-bold text-xs text-foreground group-hover:text-[#F64302] transition-colors">
                OA Practice
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Timed company OA sets</p>
            </div>
          </Link>

          <Link
            href="/analyzer"
            className="group rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-4 flex flex-col justify-between hover:-translate-y-0.5 hover:border-[#F64302]/40 transition-all duration-200 shadow-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-[#F64302] group-hover:bg-[#F64302] group-hover:text-white transition-colors">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="mt-4">
              <p className="font-jetbrains font-bold text-xs text-foreground group-hover:text-[#F64302] transition-colors">
                Presence Analyzer
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">GitHub, resume &amp; LinkedIn</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 5. Two-Column Area: Recent Interviews & Your Documents ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Recent Interviews (8 cols) */}
        <div className="lg:col-span-8">
          <SectionCard
            title="Recent interviews"
            subtitle="Practice sessions conducted with Aria"
            action={{ label: "See all", href: "/interview" }}
          >
            {sessions.length === 0 ? (
              <EmptyState
                title="No interview sessions recorded"
                description="Launch an interview with Aria to test your technical explanations, coding velocity, and presence."
                action={{ label: "Start interview", href: "/interview" }}
              />
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 5).map((s) => {
                  const hasReport = !!s.report;
                  const score = s.report?.overallScore
                    ? Math.round(s.report.overallScore * 10)
                    : null;

                  return (
                    <DataRow
                      key={s.id}
                      icon={<Code2 className="w-4 h-4" />}
                      title={s.jd?.title || "Technical Interview Round"}
                      meta={
                        <>
                          <span>{s.createdAt.toISOString().slice(0, 10)}</span>
                          <span>·</span>
                          {score !== null ? (
                            <span className="font-bubbledot font-bold text-[#F64302]">
                              Score {score}/100
                            </span>
                          ) : (
                            <span className="text-muted-foreground">In progress</span>
                          )}
                        </>
                      }
                      trailingBadge={
                        <StatusChip
                          status={s.status === "COMPLETED" ? "completed" : "in_progress"}
                          size="sm"
                        />
                      }
                      action={
                        hasReport
                          ? {
                              label: "View report",
                              href: `/interview/${s.id}/report`,
                            }
                          : {
                              label: "Open",
                              href: `/interview/${s.id}`,
                            }
                      }
                    />
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Your Documents (4 cols) */}
        <div className="lg:col-span-4">
          <SectionCard
            title="Your documents"
            subtitle="Resumes and target roles"
            action={{ label: "Manage", href: "/documents" }}
          >
            {resumes.length === 0 && jds.length === 0 ? (
              <EmptyState
                title="No documents yet"
                description="Upload a resume to automatically extract your skills taxonomy."
                action={{ label: "Upload", href: "/onboarding" }}
              />
            ) : (
              <div className="space-y-2">
                {resumes.slice(0, 3).map((r) => {
                  const parsed = resumeParsedSchema.safeParse(r.parsed);
                  const count = parsed.success ? parsed.data.skills.length : 0;
                  return (
                    <DataRow
                      key={r.id}
                      icon={<FileText className="w-3.5 h-3.5" />}
                      title={r.fileName}
                      meta={
                        <span className="text-xs">
                          <span className="font-bubbledot font-bold text-[#F64302]">{count}</span> skills found
                        </span>
                      }
                      trailingBadge={
                        <span className="rounded-md bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">
                          Resume
                        </span>
                      }
                    />
                  );
                })}

                {jds.slice(0, 2).map((j) => {
                  const parsed = jdParsedSchema.safeParse(j.parsed);
                  const reqCount = parsed.success ? parsed.data.requiredSkills.length : 0;
                  return (
                    <DataRow
                      key={j.id}
                      icon={<FileText className="w-3.5 h-3.5" />}
                      title={j.title}
                      meta={
                        <span className="text-xs">
                          <span className="font-bubbledot font-bold text-[#F64302]">{reqCount}</span> required skills
                        </span>
                      }
                      trailingBadge={
                        <span className="rounded-md bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">
                          Target JD
                        </span>
                      }
                    />
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
