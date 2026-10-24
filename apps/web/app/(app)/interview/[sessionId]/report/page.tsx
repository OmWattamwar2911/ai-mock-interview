import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MessageSquareQuote,
  Code2,
  Calendar,
  Award,
  Sparkles,
  Quote,
} from "lucide-react";
import { ReportStatusChecker } from "./report-status-checker";

function getVerdictBadge(verdict: string) {
  const v = (verdict || "Hire").toLowerCase();
  if (v.includes("strong hire")) {
    return {
      label: "Strong Hire",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
  }
  if (v.includes("lean hire")) {
    return {
      label: "Lean Hire",
      className: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    };
  }
  if (v.includes("no hire") || v.includes("needs practice") || v.includes("failed")) {
    return {
      label: "Needs Practice",
      className: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    };
  }
  return {
    label: "Hire",
    className: "bg-primary/15 text-primary border-primary/30",
  };
}

export default async function InterviewReportPage({ params }: { params: { sessionId: string } }) {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  const report = await prisma.feedbackReport.findUnique({
    where: { sessionId: params.sessionId },
    include: {
      session: {
        include: { questions: true },
      },
    },
  });

  if (!report) {
    const session = await prisma.interviewSession.findUnique({
      where: { id: params.sessionId },
      select: { userId: true, status: true, errorMessage: true },
    });

    if (!session || session.userId !== user.id) {
      redirect("/interview");
    }

    return (
      <ReportStatusChecker
        sessionId={params.sessionId}
        initialStatus={session.status}
        initialError={session.errorMessage}
      />
    );
  }

  const { overallScore, categoryScores, strengths, weaknesses, improvementPlan } = report;
  const botSummary = (report.session.botSummary as any) || {};
  const perQuestionBot = Array.isArray(botSummary.perQuestion)
    ? botSummary.perQuestion
    : Array.isArray(report.perQuestionSummary)
    ? (report.perQuestionSummary as any[])
    : [];
  const transcript = Array.isArray(report.session.transcript) ? (report.session.transcript as any[]) : [];
  const hasLegacyQuestions = report.session.questions.length > 0;

  // 0-100 overall score calculation
  const score100 =
    typeof botSummary.overallScore100 === "number"
      ? Math.round(botSummary.overallScore100)
      : Math.round((overallScore ?? 7.5) * 10);

  // Verdict badge
  const verdictInfo = getVerdictBadge(botSummary.verdict || "Hire");

  // Supporting candidate quotes
  const quotesList: string[] = Array.isArray(botSummary.supportingQuotes)
    ? botSummary.supportingQuotes
    : Array.isArray((report.mistakesWithQuotes as any)?.quotes)
    ? (report.mistakesWithQuotes as any).quotes
    : [];

  // Practice plan (7-day or standard improvement plan)
  const practicePlan: string[] = Array.isArray(botSummary.practicePlan7Day) && botSummary.practicePlan7Day.length > 0
    ? botSummary.practicePlan7Day
    : improvementPlan && improvementPlan.length > 0
    ? improvementPlan
    : [
        "Day 1: Review STAR method frameworks for behavioral questions.",
        "Day 2: Practice concise technical communication without rambling.",
        "Day 3: Deep dive into core data structures and edge case analysis.",
        "Day 4: System design principles and architecture trade-offs.",
        "Day 5: Mock session focusing on active listening and clarifying questions.",
        "Day 6: Speed coding practice with strict 20-minute timebox.",
        "Day 7: Full simulated interview run with resume deep dive.",
      ];

  // Test / Code results
  const testResults = botSummary.testResults || (report.codeAnalysis as any)?.results || null;

  // Standardize 8 category scores
  const rawCatScores = (categoryScores as Record<string, any>) || {};
  const standardCategories: { key: string; label: string; score: number }[] = [
    { key: "communication", label: "Communication & Articulation", score: Number(rawCatScores.communication ?? 7.5) },
    { key: "resumeKnowledge", label: "Resume Knowledge & Honesty", score: Number(rawCatScores.resumeKnowledge ?? rawCatScores.resume_knowledge ?? 7.0) },
    { key: "roleFit", label: "Role & JD Fit", score: Number(rawCatScores.roleFit ?? rawCatScores.role_fit ?? rawCatScores.jobDescriptionFit ?? 7.5) },
    { key: "technicalKnowledge", label: "Technical Depth", score: Number(rawCatScores.technicalKnowledge ?? rawCatScores.technicalDepth ?? 7.5) },
    { key: "coding", label: "Coding & Complexity", score: Number(rawCatScores.coding ?? rawCatScores.codeCorrectness ?? 7.0) },
    { key: "problemSolving", label: "Problem Solving", score: Number(rawCatScores.problemSolving ?? 8.0) },
    { key: "behavioralSTAR", label: "Behavioral & STAR Method", score: Number(rawCatScores.behavioralSTAR ?? rawCatScores.behavioral ?? 7.5) },
    { key: "confidenceClarity", label: "Confidence & Clarity", score: Number(rawCatScores.confidenceClarity ?? rawCatScores.confidence ?? 8.0) },
  ];

  return (
    <div className="mx-auto max-w-5xl py-8 px-4 space-y-8">
      {/* Header with Title & Verdict */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">Interview Evaluation Report</h1>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${verdictInfo.className}`}
            >
              {verdictInfo.label}
            </span>
          </div>
          <p className="text-xs text-muted font-mono mt-1">Session ID: {params.sessionId}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-muted uppercase font-mono tracking-wider">Candidate Score</p>
            <p className="text-2xl font-bold font-mono text-primary">{score100} / 100</p>
          </div>
        </div>
      </div>

      {/* Main Scorecard Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Score Ring / Hero Card */}
        <Card className="md:col-span-1 flex flex-col justify-between border-primary/20 bg-gradient-to-b from-primary/5 to-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Overall Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 text-center">
            <div className="relative flex items-center justify-center w-36 h-36 rounded-full border-4 border-primary/30 bg-surface shadow-inner">
              <div className="text-center">
                <span className="text-4xl font-extrabold font-mono text-primary">{score100}</span>
                <span className="block text-xs text-muted font-mono">/ 100</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-semibold">{verdictInfo.label}</p>
              <p className="text-xs text-muted mt-0.5">
                {score100 >= 80
                  ? "Exceeded performance standards across core competencies."
                  : score100 >= 65
                  ? "Demonstrated solid foundation with specific improvement areas."
                  : "Additional targeted practice recommended before next round."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 8 Competency Breakdown Progress Bars */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Competency Breakdown (Score / 10)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {standardCategories.map((cat) => {
              const pct = Math.min(100, Math.max(0, cat.score * 10));
              return (
                <div key={cat.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{cat.label}</span>
                    <span className="font-mono font-semibold text-muted">
                      {cat.score.toFixed(1)} <span className="text-[10px] opacity-60">/ 10</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 80
                          ? "bg-emerald-500"
                          : pct >= 65
                          ? "bg-primary"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Top Strengths and Areas for Growth */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Top Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {strengths && strengths.length > 0 ? (
              <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                {strengths.map((s, i) => (
                  <li key={i} className="leading-relaxed">
                    <span className="text-foreground font-medium">{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">Clear communication and active listening.</p>
            )}
          </CardContent>
        </Card>

        {/* Growth Areas */}
        <Card className="border-amber-500/20 bg-amber-500/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Areas for Growth & Polish
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {weaknesses && weaknesses.length > 0 ? (
              <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                {weaknesses.map((w, i) => (
                  <li key={i} className="leading-relaxed">
                    <span className="text-foreground font-medium">{w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">Include more measurable business metrics in STAR responses.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Specific Candidate Quotes Supporting Assessment */}
      {quotesList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Quote className="h-4 w-4 text-primary" /> Key Candidate Quotes & Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {quotesList.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/80 bg-muted/20 p-3.5 text-xs text-muted-foreground italic relative"
                >
                  <span className="text-primary font-serif text-lg leading-none absolute top-2 left-2">&ldquo;</span>
                  <p className="pl-4 leading-relaxed">&ldquo;{q}&rdquo;</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Round Execution / Code Analysis */}
      {testResults && (
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" /> Technical Coding Performance
              </span>
              {testResults.status && (
                <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded bg-muted">
                  Status: {testResults.status}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg border border-border bg-surface">
                <div className="text-xs text-muted">Test Cases Passed</div>
                <div className="text-xl font-bold font-mono text-primary mt-1">
                  {testResults.passedCount ?? 0} / {testResults.totalCount ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface">
                <div className="text-xs text-muted">Code Language</div>
                <div className="text-xl font-bold font-mono text-foreground mt-1 uppercase">
                  {testResults.language || "Python"}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface">
                <div className="text-xs text-muted">Hints Provided</div>
                <div className="text-xl font-bold font-mono text-muted mt-1">
                  {testResults.hintsGiven ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface">
                <div className="text-xs text-muted">Total Runs</div>
                <div className="text-xl font-bold font-mono text-foreground mt-1">
                  {testResults.runCount ?? 1}
                </div>
              </div>
            </div>

            {testResults.sourceCode && (
              <div className="rounded-lg border border-border bg-black/60 p-3 font-mono text-xs overflow-x-auto text-emerald-400">
                <p className="text-[10px] text-muted uppercase font-sans mb-1">Final Submitted Solution</p>
                <pre>{testResults.sourceCode}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Question-by-Question Deep Dive with Suggested Better Answers */}
      {perQuestionBot.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Question-by-Question Analysis</h2>
          {perQuestionBot.map((qItem: any, idx: number) => (
            <Card key={idx} className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-muted uppercase text-xs border border-border rounded px-2 py-0.5 font-mono">
                      Q{idx + 1}
                    </span>
                    <span className="font-semibold text-foreground">
                      {qItem.question || `Interview Question ${idx + 1}`}
                    </span>
                  </span>
                  {qItem.score !== undefined && (
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted/50 border border-border">
                      {qItem.score} / 10
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-relaxed">
                {qItem.summary && (
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Candidate Response:</strong> {qItem.summary}
                  </p>
                )}
                {qItem.feedback && (
                  <div className="p-3 rounded-lg border border-border/80 bg-muted/10 text-muted-foreground">
                    <strong className="text-primary block mb-1">AI Evaluator Feedback:</strong>
                    {qItem.feedback}
                  </div>
                )}
                {qItem.suggestedAnswer && (
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-muted-foreground">
                    <strong className="text-emerald-400 block mb-1">Recommended Model Answer:</strong>
                    {qItem.suggestedAnswer}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 7-Day Actionable Practice Plan */}
      <Card className="border-blue-500/20 bg-blue-500/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-blue-400 flex items-center gap-2">
            <Calendar className="h-5 w-5" /> 7-Day Targeted Practice Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {practicePlan.map((step, i) => (
              <div key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
                <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">
                  {i + 1}
                </span>
                <span className="leading-relaxed text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Dialogue Transcript */}
      {transcript.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <MessageSquareQuote className="h-5 w-5 text-primary" /> Full Conversation Transcript
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {transcript.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-xs leading-relaxed ${
                  msg.role === "assistant" || msg.speaker === "bot"
                    ? "bg-muted/30 border border-border mr-8"
                    : "bg-primary/5 border border-primary/20 ml-8 text-foreground"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                  <span>{msg.role === "assistant" || msg.speaker === "bot" ? "Aria (Interviewer)" : "Candidate"}</span>
                  {msg.timestamp && (
                    <span className="font-mono text-muted/60">{msg.timestamp}</span>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
