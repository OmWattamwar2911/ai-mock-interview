import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export async function POST(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    const { error, user } = await requireUser();
    if (error || !user) return error;

    const sessionId = params.sessionId;

    const formData = await request.formData().catch(() => null);
    if (!formData) {
        return jsonError(400, "BAD_REQUEST", "Invalid form data");
    }

    const orderIndexStr = formData.get("orderIndex")?.toString();
    const transcript = formData.get("transcript")?.toString();
    const videoFile = formData.get("video") as File | null;

    if (orderIndexStr === undefined) {
        return jsonError(400, "VALIDATION_ERROR", "orderIndex is required");
    }
    const orderIndex = parseInt(orderIndexStr, 10);

    const session = await prisma.interviewSession.findFirst({
        where: { id: sessionId, userId: user.id },
        include: { questions: true }
    });
    if (!session) {
        return jsonError(404, "NOT_FOUND", "Session not found");
    }

    const sessionQuestion = session.questions.find(q => q.orderIndex === orderIndex);
    if (!sessionQuestion) {
        return jsonError(404, "NOT_FOUND", "Question not found");
    }

    let videoPath = "";
    if (videoFile) {
        const uploadDir = join(process.cwd(), "public", "uploads");
        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }
        const ext = videoFile.name.split(".").pop() || "webm";
        const fileName = `${sessionId}-${orderIndex}.${ext}`;
        const filePath = join(uploadDir, fileName);
        const arrayBuffer = await videoFile.arrayBuffer();
        writeFileSync(filePath, Buffer.from(arrayBuffer));
        videoPath = `/uploads/${fileName}`;
    }

    const existingSnapshot = sessionQuestion.snapshot as any ?? {};

    await prisma.sessionQuestion.update({
        where: { id: sessionQuestion.id },
        data: {
            answerText: transcript || "",
            snapshot: {
                ...existingSnapshot,
                videoUrl: videoPath,
            },
            status: "ANSWERED"
        }
    });

    return jsonOk({ success: true, videoPath, transcript });
}
