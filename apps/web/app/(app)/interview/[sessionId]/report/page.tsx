import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Lightbulb, MessageSquareQuote } from "lucide-react";

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

    if (!report || report.session.userId !== user.id) {
        return (
            <div className="mx-auto max-w-4xl py-16 px-4 text-center">
                <h2 className="text-xl font-semibold mb-2">Report Not Ready Yet</h2>
                <p className="text-sm text-muted">
                    Your interview is being evaluated. Please refresh in a few moments.
                </p>
            </div>
        );
    }

    const { overallScore, categoryScores, strengths, weaknesses, improvementPlan } = report;
    const botSummary = (report.session.botSummary as any) || {};
    const perQuestionBot = Array.isArray(botSummary.perQuestion) ? botSummary.perQuestion : [];
    const transcript = Array.isArray(report.session.transcript) ? (report.session.transcript as any[]) : [];
    const hasLegacyQuestions = report.session.questions.length > 0;

    return (
        <div className="mx-auto max-w-4xl py-8 px-4 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Interview Feedback Report</h1>
                    <p className="text-sm text-muted">Session ID: {params.sessionId}</p>
                </div>
            </div>

            {/* Overall Score Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Overall Assessment Score</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-5xl font-mono font-bold text-primary">
                        {overallScore ? Number(overallScore).toFixed(1) : "N/A"}{" "}
                        <span className="text-muted opacity-50 text-2xl font-normal">/ 10</span>
                    </div>

                    {categoryScores && Object.keys(categoryScores as any).length > 0 && (
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(categoryScores as any).map(([k, v]) => (
                                <div key={k} className="border p-4 rounded bg-muted/20">
                                    <div className="text-xs text-muted font-medium uppercase">{k}</div>
                                    <div className="text-xl font-semibold mt-1">{Number(v).toFixed(1)}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Strengths & Weaknesses */}
                    <div className="mt-6 grid md:grid-cols-2 gap-4">
                        {strengths && strengths.length > 0 && (
                            <div className="border border-green-500/20 bg-green-500/5 p-4 rounded-lg">
                                <div className="flex items-center gap-2 font-medium text-green-600 dark:text-green-400 mb-2">
                                    <CheckCircle2 className="h-4 w-4" /> Key Strengths
                                </div>
                                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                                    {strengths.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {weaknesses && weaknesses.length > 0 && (
                            <div className="border border-amber-500/20 bg-amber-500/5 p-4 rounded-lg">
                                <div className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400 mb-2">
                                    <AlertTriangle className="h-4 w-4" /> Areas for Growth
                                </div>
                                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                                    {weaknesses.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Improvement Plan */}
                    {improvementPlan && improvementPlan.length > 0 && (
                        <div className="mt-4 border border-blue-500/20 bg-blue-500/5 p-4 rounded-lg">
                            <div className="flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400 mb-2">
                                <Lightbulb className="h-4 w-4" /> Recommended Action Items
                            </div>
                            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                                {improvementPlan.map((plan, i) => (
                                    <li key={i}>{plan}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bot Per-Question Feedback Breakdown */}
            {perQuestionBot.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Question-by-Question Breakdown</h2>
                    {perQuestionBot.map((qItem: any, idx: number) => (
                        <Card key={idx}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-medium flex items-center justify-between">
                                    <span>
                                        <span className="font-semibold text-muted uppercase text-xs mr-2 border rounded px-1.5 py-0.5">
                                            Q{idx + 1}
                                        </span>
                                        {qItem.question || `Interview Question ${idx + 1}`}
                                    </span>
                                    {qItem.score !== undefined && (
                                        <span className="text-sm font-mono font-semibold px-2 py-0.5 rounded bg-muted">
                                            {qItem.score}/10
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {qItem.summary && (
                                    <p className="text-muted-foreground">
                                        <strong>Response Summary:</strong> {qItem.summary}
                                    </p>
                                )}
                                {qItem.feedback && (
                                    <div className="p-3 border rounded bg-muted/10 text-muted-foreground">
                                        <strong>AI Feedback:</strong> {qItem.feedback}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Legacy Session Question Breakdown (if applicable) */}
            {hasLegacyQuestions && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Question Breakdown</h2>
                    {report.session.questions
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((q, idx) => {
                            const feedback = ((report.perQuestionSummary as any) || {})[q.id] || {};
                            return (
                                <Card key={q.id}>
                                    <CardHeader>
                                        <CardTitle className="text-base font-normal leading-relaxed">
                                            <span className="font-semibold text-muted uppercase tracking-widest text-xs mr-2 border rounded px-1">
                                                Q{idx + 1}
                                            </span>
                                            {(q.snapshot as any)?.text}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-4">
                                        <div className="flex gap-4">
                                            <span className="font-medium bg-muted px-2 py-1 rounded text-xs uppercase">
                                                Overall Score: {feedback.overallScore || "N/A"}/10
                                            </span>
                                        </div>
                                        <div className="p-4 border bg-background/50 rounded leading-relaxed">
                                            <strong>AI Feedback:</strong> {feedback.feedback || "No feedback available."}
                                        </div>
                                        {q.answerText && (
                                            <div className="mt-4 border-l-4 pl-4 py-2 opacity-80 text-muted-foreground italic bg-muted/10 rounded-r">
                                                "{q.answerText}"
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                </div>
            )}

            {/* Real-time Dialogue Transcript */}
            {transcript.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquareQuote className="h-5 w-5" /> Conversation Transcript
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {transcript.map((msg, i) => (
                            <div
                                key={i}
                                className={`p-3 rounded-lg text-sm ${msg.role === "assistant"
                                        ? "bg-muted/30 border border-border mr-8"
                                        : "bg-primary/5 border border-primary/20 ml-8 text-foreground"
                                    }`}
                            >
                                <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                                    {msg.role === "assistant" ? "Aria (AI Interviewer)" : "Candidate"}
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
