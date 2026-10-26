import Link from "next/link";
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
  ArrowRight,
  Play,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento-card";
import { StatTile } from "@/components/ui/stat-tile";
import { ScoreNumeral } from "@/components/ui/score-numeral";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";

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
        take: 10,
        include: { session: { select: { jd: { select: { title: true } }, createdAt: true } } },
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
      : null;

  // Trend data points
  const recentScores = [...reports].reverse().map((r, i) => ({
    round: `R${i + 1}`,
    score: r.overallScore ? Math.round(r.overallScore * 10) : 70,
    title: r.session?.jd?.title || `Session ${i + 1}`,
  }));

  const latestReport = reports[0];
  const weakestArea =
    latestReport?.weaknesses && Array.isArray(latestReport.weaknesses) && latestReport.weaknesses.length > 0
      ? (latestReport.weaknesses[0]?.title || latestReport.weaknesses[0])
      : "Algorithmic Big-O Analysis";

  const strengthsList =
    latestReport?.strengths && Array.isArray(latestReport.strengths) && latestReport.strengths.length > 0
      ? latestReport.strengths.slice(0, 3)
      : ["Clear structural decomposition", "Strong syntax familiarity", "Concise verbal cadence"];

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-mono pb-12">
      {/* Page Header */}
      <PageHeader
        eyebrow="Longitudinal Performance"
        title="Performance trajectory"
        subtitle="Historical progression of your conversational fluency, architectural decomposition, and technical interview velocity."
      />

      {sessions.length === 0 && reports.length === 0 ? (
        <EmptyState
          title="No interview data recorded yet"
          description="Complete your first mock interview with Aria to generate speech rate metrics, competency scoring, and longitudinal trends."
          action={{ label: "Start first interview", href: "/interview" }}
        />
      ) : (
        <>
          {/* ── Top Row: Hero ScoreNumeral + Key Stats ─────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Hero Readiness ScoreNumeral (5 cols) */}
            <div className="md:col-span-5">
              <ScoreNumeral
                score={avgScore || 75}
                maxScore={100}
                label="Overall Readiness Benchmark"
                verdict={avgScore && avgScore >= 80 ? "Strong Hire" : avgScore && avgScore >= 65 ? "Hire" : "Needs Practice"}
                verdictType={avgScore && avgScore >= 80 ? "positive" : avgScore && avgScore >= 65 ? "positive" : "warning"}
                variant="ring"
                size="lg"
                className="h-full"
              />
            </div>

            {/* 3 StatTiles (7 cols) */}
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatTile
                label="Rounds Audited"
                value={String(completedSessions).padStart(2, "0")}
                icon={<Activity className="w-4 h-4" />}
                delta={{ value: `${completedSessions} total`, trend: "up" }}
              />
              <StatTile
                label="Speaking Cadence"
                value="138"
                unit="WPM"
                icon={<Clock className="w-4 h-4" />}
                delta={{ value: "Optimal pace", trend: "up" }}
              />
              <StatTile
                label="Code Pass Rate"
                value="88"
                unit="%"
                icon={<Code2 className="w-4 h-4" />}
                delta={{ value: "+6% test delta", trend: "up" }}
              />
            </div>
          </div>

          {/* ── Trend Chart with Accent & Soft Gridlines ───────────────────── */}
          <SectionCard
            title="Readiness score progression"
            subtitle="Historical score trajectory across completed rehearsal sessions"
          >
            {recentScores.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Complete at least one session to unlock score trend charts.
              </p>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="relative h-44 w-full rounded-xl bg-white/60 dark:bg-black/30 border border-black/[0.04] dark:border-white/[0.06] p-4 flex items-end justify-between gap-2 sm:gap-4">
                  {/* Soft Background Gridlines */}
                  <div className="absolute inset-x-4 inset-y-4 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-b border-black dark:border-white" />
                    <div className="border-b border-black dark:border-white" />
                    <div className="border-b border-black dark:border-white" />
                  </div>

                  {recentScores.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative z-10 flex-1 flex flex-col items-center justify-end h-full gap-2 group"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 text-[10px] font-mono font-bold bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5 rounded shadow">
                        {item.score}%
                      </div>
                      <div
                        className="w-full max-w-[48px] rounded-t-lg bg-[#F64302] transition-all duration-700 ease-out hover:brightness-110"
                        style={{ height: `${Math.max(15, item.score)}%` }}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                        {item.round}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Initial Baseline Session</span>
                  <span>Latest Rehearsal (Evaluated by Aria)</span>
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Two Column: Skills Coverage & What to Practise Next ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Skills Coverage (7 cols) */}
            <div className="lg:col-span-7">
              <SectionCard
                title="Competency evaluation index"
                subtitle="Aggregated dimension scores evaluated across technical rounds"
              >
                <div className="space-y-3 pt-1">
                  {[
                    { label: "Technical Accuracy & Data Structures", score: 8.4, pct: 84 },
                    { label: "Communication Cadence & Articulation", score: 8.0, pct: 80 },
                    { label: "Problem Decomposition & Edge Cases", score: 7.8, pct: 78 },
                    { label: "Behavioral STAR Methodology", score: 7.5, pct: 75 },
                    { label: "Algorithmic Complexity & Optimization", score: 7.2, pct: 72 },
                  ].map((metric) => (
                    <div key={metric.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground font-medium">{metric.label}</span>
                        <span className="font-bubbledot font-bold text-[#F64302]">
                          {metric.score.toFixed(1)} / 10
                        </span>
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
              </SectionCard>
            </div>

            {/* What to Practise Next (5 cols) */}
            <div className="lg:col-span-5">
              <BentoCard padded="normal" className="flex flex-col justify-between space-y-4 h-full">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
                    <Zap className="w-4 h-4 text-[#F64302]" />
                    <h2 className="font-jetbrains font-bold text-base text-foreground">
                      What to practise next
                    </h2>
                  </div>

                  <div className="space-y-2.5">
                    <div className="rounded-xl bg-white/70 dark:bg-black/40 border border-black/5 dark:border-white/10 p-3.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#F64302]">
                        Recommended Focus
                      </span>
                      <p className="font-jetbrains font-semibold text-xs text-foreground">
                        {weakestArea}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Aria noted this area could benefit from clearer step-by-step reasoning before jumping into code.
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/70 dark:bg-black/40 border border-black/5 dark:border-white/10 p-3.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Top Strength
                      </span>
                      <p className="font-jetbrains font-semibold text-xs text-foreground">
                        {typeof strengthsList[0] === "string" ? strengthsList[0] : (strengthsList[0]?.title || "Communication")}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Strong consistency in problem breakdown and structured explanation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/interview"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white py-2.5 text-xs font-mono font-bold uppercase tracking-wider shadow-md shadow-[#F64302]/20 transition-all hover:scale-[1.01]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch targeted drill →</span>
                  </Link>
                </div>
              </BentoCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
