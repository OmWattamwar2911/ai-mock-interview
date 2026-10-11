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
        include: { questions: true }
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
        session: {
            id: session.id,
            status: session.status,
            integrity: session.integrity
        },
        questions: formattedQuestions
    });
}
