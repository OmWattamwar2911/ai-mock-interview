import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";
import { evaluateSession } from "@/lib/evaluation";

export async function POST(
    _request: Request,
    { params }: { params: { sessionId: string } }
) {
    const { error, user } = await requireUser();
    if (error || !user) return error!;

    const session = await prisma.interviewSession.findFirst({
        where: { id: params.sessionId, userId: user.id },
    });

    if (!session) {
        return jsonError(404, "NOT_FOUND", "Interview session not found.");
    }

    try {
        await prisma.interviewSession.update({
            where: { id: session.id },
            data: { status: "EVALUATING", errorMessage: null },
        });

        const result = await evaluateSession(session.id, session.endReason || "completed");

        return jsonOk({
            success: true,
            sessionId: session.id,
            status: "COMPLETED",
            overallScore: result.botSummary.overallScore,
        });
    } catch (e: any) {
        console.error("Evaluation retry failed:", e);
        await prisma.interviewSession.update({
            where: { id: session.id },
            data: {
                status: "FAILED",
                errorMessage: e?.message || "Evaluation failed during retry",
            },
        });
        return jsonError(500, "EVALUATION_FAILED", e?.message || "Failed to generate evaluation report");
    }
}
