import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";

const nameSchema = z.object({
    name: z.string().min(1).max(100),
});

export async function PATCH(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    const { error, user } = await requireUser();
    if (error || !user) return error!;

    const body = await request.json().catch(() => null);
    const parsed = nameSchema.safeParse(body);
    if (!parsed.success) {
        return jsonError(400, "VALIDATION_ERROR", "Invalid name payload");
    }

    const session = await prisma.interviewSession.findFirst({
        where: { id: params.sessionId, userId: user.id },
    });

    if (!session) {
        return jsonError(404, "NOT_FOUND", "Interview session not found.");
    }

    const updated = await prisma.interviewSession.update({
        where: { id: session.id },
        data: {
            candidateDisplayName: parsed.data.name.trim(),
        },
        select: {
            id: true,
            candidateDisplayName: true,
        },
    });

    return jsonOk({ success: true, candidateDisplayName: updated.candidateDisplayName });
}
