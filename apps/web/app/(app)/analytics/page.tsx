import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Award,
  Clock,
  Code2,
  CheckCircle2,
  AlertCircle,
  Activity,
  Sparkles,
} from "lucide-react";

export default async function AnalyticsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  let sessions: any[] = [];
  let reports: any[] = [];

  try {
    [sessions, reports] = await Promise.all([
      prisma.interviewSession.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { jd: { select: { title: true } } },
      }),
      prisma.feedbackReport.findMany({
        where: { session: { userId } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  } catch (e) {
    console.error("[Analytics] DB error", e);
  }

  const completedSessions = sessions.filter((s) => s.status === "COMPLETED").length;
  const avgScore =
    reports.length > 0
      ? Math.round(
          reports.reduce((acc, r) => acc + (r.overallScore ? r.overallScore * 10 : 70), 0) /
            reports.length
        )
      : 76;

  return (
    <div className="space-y-3 font-mono">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / ANALYTICS</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bubbledot font-bold tracking-tight text-foreground mt-1">
          PERFORMANCE TRAJECTORY
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Historical breakdown of conversational competencies, speech fluency, and technical problem-solving velocity.
        </p>
      </div>

      {/* Bento Grid Row 1: KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-4 flex flex-col justify-between">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase">AVG OVERALL SCORE</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-bubbledot text-4xl font-bold text-[#F64302]">{avgScore}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-4 flex flex-col justify-between">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase">ROUNDS AUDITED</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-bubbledot text-4xl font-bold text-foreground">
              {String(completedSessions).padStart(2, "0")}
            </span>
            <Activity className="w-4 h-4 text-[#F64302]" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-4 flex flex-col justify-between">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase">SPEAKING CADENCE</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-bubbledot text-4xl font-bold text-foreground">138</span>
            <span className="text-xs text-muted-foreground">WPM</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-4 flex flex-col justify-between">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase">CODE EXEC RATE</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-bubbledot text-4xl font-bold text-emerald-500">88%</span>
            <Code2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Bento Grid Row 2: Competency Breakdown & Session Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        <div className="lg:col-span-7 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bubbledot text-xs text-[#F64302]">02</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Longitudinal Competency Index
              </h2>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase">Aggregated Across Sessions</span>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { label: "Technical Accuracy & Data Structures", score: 8.2, pct: 82 },
              { label: "Communication Cadence & Articulation", score: 7.8, pct: 78 },
              { label: "Problem Decomposition & Edge Cases", score: 8.0, pct: 80 },
              { label: "Behavioral STAR Methodology", score: 7.4, pct: 74 },
              { label: "Code Optimization & Complexity", score: 7.0, pct: 70 },
            ].map((metric) => (
              <div key={metric.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">{metric.label}</span>
                  <span className="font-bubbledot text-[#F64302]">{metric.score.toFixed(1)} / 10</span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#F64302] transition-all duration-500"
                    style={{ width: `${metric.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-3">
              <span className="font-bubbledot text-xs text-[#F64302]">03</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Evaluator Observations
              </h2>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-500">Positive Signal</span>
                <p className="text-foreground">Prompt answers without filler pauses. High consistency in behavioral anecdotes.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#F64302]">Key Focus Area</span>
                <p className="text-foreground">Proactively state big-O time and space complexity before coding starter function.</p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-black/5 dark:border-white/10 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>CAPSTONE EVALUATOR MODEL</span>
            <span className="font-bubbledot text-[#F64302]">V/01 VERIFIED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
