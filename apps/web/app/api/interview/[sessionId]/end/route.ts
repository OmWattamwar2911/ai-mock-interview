import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";
import { RoomServiceClient } from "livekit-server-sdk";
import { evaluateSession } from "@/lib/evaluation";

export async function POST(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    const { error, user } = await requireUser();
    if (error || !user) return error!;

    const body = await request.json().catch(() => ({}));
    const endReason = body?.endReason || "candidate_ended";

    const session = await prisma.interviewSession.findUnique({
        where: { id: params.sessionId },
    });

    if (!session || session.userId !== user.id) {
        return jsonError(404, "NOT_FOUND", "Interview session not found.");
    }

    // If LiveKit room is active, delete/close it gracefully so the worker unloads
    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (livekitUrl && apiKey && apiSecret && session.livekitRoom) {
        try {
            const roomService = new RoomServiceClient(
                livekitUrl.replace("ws://", "http://").replace("wss://", "https://"),
                apiKey,
                apiSecret
            );
            await roomService.deleteRoom(session.livekitRoom);
        } catch (err: any) {
            console.warn("[interview/end] Room deletion note:", err?.message);
        }
    }

    // Set end reason and timestamp
    await prisma.interviewSession.update({
        where: { id: params.sessionId },
        data: {
            endReason,
            endedAt: new Date(),
        },
    });

    // Idempotent partial evaluation: Ensure the candidate gets a report immediately even if ended early
    try {
        await evaluateSession(params.sessionId, endReason);
    } catch (evalErr: any) {
        console.warn("[interview/end] Immediate evaluation note:", evalErr?.message);
    }

    return jsonOk({ success: true, sessionId: params.sessionId, endReason });
}
