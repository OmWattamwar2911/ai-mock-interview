import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";

function requireBotSecret(request: NextRequest): boolean {
    const secret = request.headers.get("x-internal-secret");
    const expected = process.env.INTERNAL_BOT_SECRET || process.env.INTERNAL_API_KEY;
    return Boolean(expected && secret === expected);
}

const nameSchema = z.object({
    candidateDisplayName: z.string().min(1).max(100),
});

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    if (!requireBotSecret(request)) {
        return jsonError(401, "UNAUTHORIZED", "Invalid or missing internal secret.");
    }

    const body = await request.json().catch(() => null);
    const parsed = nameSchema.safeParse(body);
    if (!parsed.success) {
        return jsonError(400, "VALIDATION_ERROR", "Invalid name payload");
    }

    const session = await prisma.interviewSession.update({
        where: { id: params.id },
        data: {
            candidateDisplayName: parsed.data.candidateDisplayName,
        },
        select: {
            id: true,
            candidateDisplayName: true,
        },
    });

    return jsonOk({ success: true, session });
}
