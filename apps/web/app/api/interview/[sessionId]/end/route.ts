import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";
import { RoomServiceClient } from "livekit-server-sdk";

export async function POST(
    _request: Request,
    { params }: { params: { sessionId: string } }
) {
    const { error, user } = await requireUser();
    if (error || !user) return error!;

    const session = await prisma.interviewSession.findUnique({
        where: { id: params.sessionId },
    });

    if (!session || session.userId !== user.id) {
        return jsonError(404, "NOT_FOUND", "Interview session not found.");
    }

    // If LiveKit room is active, delete/close it gracefully
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

    await prisma.interviewSession.update({
        where: { id: params.sessionId },
        data: {
            status: "COMPLETED",
            endedAt: new Date(),
        },
    });

    return jsonOk({ success: true, sessionId: params.sessionId });
}
