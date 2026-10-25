import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    const { error, user } = await requireUser();
    if (error || !user) return error;

    const session = await prisma.interviewSession.findFirst({
        where: { id: params.sessionId, userId: user.id },
        include: { questions: true, report: { select: { id: true } } }
    });

    if (!session) {
        return jsonError(404, "NOT_FOUND", "Session not found");
    }

    const sortedQuestions = session.questions.sort((a, b) => a.orderIndex - b.orderIndex);
    const formattedQuestions = sortedQuestions.map(q => ({
        id: q.id,
        orderIndex: q.orderIndex,
        text: (q.snapshot as any)?.text || "Unknown question",
        status: q.status
    }));

    return jsonOk({
        status: session.status,
        session: {
            id: session.id,
            status: session.status,
            errorMessage: session.errorMessage,
            endReason: session.endReason,
            candidateDisplayName: session.candidateDisplayName,
            integrity: session.integrity,
            transcript: session.transcript,
            botSummary: session.botSummary,
            hasReport: Boolean(session.report),
        },
        transcript: session.transcript,
        questions: formattedQuestions
    });
}
