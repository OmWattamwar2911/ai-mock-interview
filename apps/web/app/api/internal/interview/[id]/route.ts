import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { safeDecrypt } from "@/lib/crypto";

/** Shared-secret guard used by the bot worker */
function requireBotSecret(request: NextRequest): boolean {
    const secret = request.headers.get("x-internal-secret");
    return secret === process.env.INTERNAL_BOT_SECRET;
}

/**
 * GET /api/internal/interview/[id]
 * Returns the resume text, job description, skill gap, and config
 * so the bot can build its system prompt context.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    if (!requireBotSecret(request)) {
        return jsonError(401, "UNAUTHORIZED", "Invalid or missing internal secret.");
    }

    const session = await prisma.interviewSession.findUnique({
        where: { id: params.id },
        include: {
            resume: { select: { encryptedText: true, parsed: true } },
            jd: { select: { title: true, encryptedText: true, parsed: true } },
        },
    });

    if (!session) {
        return jsonError(404, "NOT_FOUND", "Interview session not found.");
    }

    // Decrypt resume text (may be empty if encryption is not configured)
    let resumeText = "";
    try { resumeText = safeDecrypt(session.resume.encryptedText); } catch { /* ignore */ }

    return jsonOk({
        sessionId: session.id,
        config: session.config,
        skillGap: session.skillGap,
        resume: {
            text: resumeText,
            parsed: session.resume.parsed,
        },
        jd: {
            title: session.jd.title,
            parsed: session.jd.parsed,
        },
    });
}
