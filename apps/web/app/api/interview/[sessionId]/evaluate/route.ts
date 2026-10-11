import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { callAiEngine } from "@/lib/services";

export async function POST(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    const { error, user } = await requireUser();
    if (error || !user) return error;

    const sessionId = params.sessionId;
    const body = await request.json().catch(() => ({}));

    const session = await prisma.interviewSession.findFirst({
        where: { id: sessionId, userId: user.id },
        include: { questions: true }
    });

    if (!session) {
        return jsonError(404, "NOT_FOUND", "Session not found");
    }

    if (session.status === "COMPLETED") {
        return jsonOk({ success: true });
    }

    const questions = session.questions.sort((a, b) => a.orderIndex - b.orderIndex);

    let totalScore = 0;
    const perQuestionSummary: Record<string, any> = {};

    for (const q of questions) {
        const textSnapshot = (q.snapshot as any)?.text || "Unknown question";
        const transcript = q.answerText || "";

        let evaluation: any = null;
        try {
            evaluation = (await callAiEngine("/v1/interview/evaluate", {
                question: textSnapshot,
                transcript: transcript
            })) as any;
        } catch (e: any) {
            console.error("Evaluation error:", e);
            evaluation = { overallScore: 5, feedback: "Estimated score due to AI evaluation failure." };
        }

        await prisma.sessionQuestion.update({
            where: { id: q.id },
            data: {
                feedback: evaluation,
                score: evaluation?.overallScore || 0,
            }
        });

        perQuestionSummary[q.id] = evaluation;
        totalScore += (evaluation?.overallScore || 0);
    }

    const overallAvg = questions.length > 0 ? (totalScore / questions.length) : 0;

    await prisma.feedbackReport.create({
        data: {
            sessionId: session.id,
            overallScore: overallAvg,
            categoryScores: {
                clarity: 5,
                relevance: 5,
                starMethod: 5,
                confidence: 5,
            },
            strengths: ["Completed the interview"],
            weaknesses: ["Needs deeper AI analysis in future version"],
            improvementPlan: ["Practice speaking confidently"],
            skillGapInsights: session.skillGap as any,
            perQuestionSummary,
        }
    });

    await prisma.interviewSession.update({
        where: { id: session.id },
        data: {
            status: "COMPLETED",
            endedAt: new Date(),
            integrity: { blurCount: body.blurCount || 0 }
        }
    });

    return jsonOk({ success: true, overallScore: overallAvg });
}
