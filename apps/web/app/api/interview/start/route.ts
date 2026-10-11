import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export async function POST(_request: Request) {
    const { error, user } = await requireUser();
    if (error || !user) return error!;

    // --- Verify user has a resume and JD ---
    const [resume, jd] = await Promise.all([
        prisma.resume.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
        prisma.jobDescription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    ]);

    if (!resume || !jd) {
        return jsonError(400, "BAD_REQUEST", "Please upload a resume and job description before starting an interview.");
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !apiKey || !apiSecret) {
        return jsonError(503, "LIVEKIT_NOT_CONFIGURED", "LiveKit is not configured. Check LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET in .env.");
    }

    // --- Create the InterviewSession row ---
    const session = await prisma.interviewSession.create({
        data: {
            userId: user.id,
            resumeId: resume.id,
            jdId: jd.id,
            status: "CREATED",
            config: { type: "general", difficulty: "medium" },
            skillGap: {},
        },
    });

    // --- Create the LiveKit room ---
    const roomName = `interview-${session.id}`;
    const roomService = new RoomServiceClient(
        livekitUrl.replace("ws://", "http://").replace("wss://", "https://"),
        apiKey,
        apiSecret
    );

    try {
        await roomService.createRoom({ name: roomName, emptyTimeout: 300 });
    } catch (err: any) {
        // Room may already exist (idempotent), so only fail on unexpected errors
        if (!err?.message?.includes("already exists")) {
            console.error("[interview/start] Failed to create LiveKit room:", err);
            return jsonError(502, "LIVEKIT_ERROR", `Failed to create interview room: ${err.message}`);
        }
    }

    // --- Update session with the room name ---
    await prisma.interviewSession.update({
        where: { id: session.id },
        data: { livekitRoom: roomName, status: "IN_PROGRESS", startedAt: new Date() },
    });

    // --- Generate a short-lived participant token for the browser ---
    const at = new AccessToken(apiKey, apiSecret, {
        identity: user.id,
        name: user.name ?? "Candidate",
        ttl: "2h",
    });
    at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
    });
    const token = await at.toJwt();

    return jsonOk({
        sessionId: session.id,
        token,
        wsUrl: livekitUrl,
        roomName,
    });
}
