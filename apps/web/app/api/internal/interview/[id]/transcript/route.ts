import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";

function requireBotSecret(request: NextRequest): boolean {
    const secret = request.headers.get("x-internal-secret");
    const expected = process.env.INTERNAL_BOT_SECRET || process.env.INTERNAL_API_KEY;
    return Boolean(expected && secret === expected);
}

const entrySchema = z.object({
    role: z.string(),
    text: z.string(),
    timestamp: z.string().optional(),
    phase: z.string().optional(),
});

/**
 * POST /api/internal/interview/[id]/transcript
 * Incrementally appends a final transcript line to the InterviewSession row in Postgres.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    if (!requireBotSecret(request)) {
        return jsonError(401, "UNAUTHORIZED", "Invalid or missing internal secret.");
    }

    const body = await request.json().catch(() => null);
    const parsed = entrySchema.safeParse(body);
    if (!parsed.success) {
        return jsonError(400, "VALIDATION_ERROR", `Invalid transcript line: ${parsed.error.message}`);
    }

    const session = await prisma.interviewSession.findUnique({
        where: { id: params.id },
        select: { transcript: true },
    });

    if (!session) {
        return jsonError(404, "NOT_FOUND", "Interview session not found.");
    }

    const currentList = Array.isArray(session.transcript) ? (session.transcript as any[]) : [];
    const updatedList = [...currentList, parsed.data];

    await prisma.interviewSession.update({
        where: { id: params.id },
        data: {
            transcript: updatedList as any,
        },
    });

    return jsonOk({ success: true, count: updatedList.length });
}
