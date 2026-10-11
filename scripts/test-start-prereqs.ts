import { config } from "dotenv";
config();
import { prisma } from "./apps/web/lib/prisma";
import { RoomServiceClient } from "livekit-server-sdk";

async function simulate() {
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? "set" : "missing");
    console.log("LIVEKIT_URL:", process.env.LIVEKIT_URL ? "set" : "missing");
    console.log("LIVEKIT_API_KEY:", process.env.LIVEKIT_API_KEY ? "set (" + process.env.LIVEKIT_API_KEY.slice(0, 4) + ")" : "missing");
    console.log("LIVEKIT_API_SECRET:", process.env.LIVEKIT_API_SECRET ? "set (" + process.env.LIVEKIT_API_SECRET.slice(0, 4) + ")" : "missing");

    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    console.log("Users in DB:", users.length, users.map(u => u.email));

    const livekitUrl = process.env.LIVEKIT_URL || "ws://localhost:7880";
    const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
    const apiSecret = process.env.LIVEKIT_API_SECRET || "devsecret";

    console.log("Testing RoomServiceClient...");
    const roomService = new RoomServiceClient(
        livekitUrl.replace("ws://", "http://").replace("wss://", "https://"),
        apiKey,
        apiSecret
    );

    try {
        await roomService.listRooms();
        console.log("LiveKit connection: SUCCESS");
    } catch (e: any) {
        console.log("LiveKit connection error:", e?.message || e);
    }
}

simulate().catch(console.error).finally(() => prisma.$disconnect());
