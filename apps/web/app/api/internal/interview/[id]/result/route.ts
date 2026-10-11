import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";

function requireBotSecret(request: NextRequest): boolean {
    return request.headers.get("x-internal-secret") === process.env.INTERNAL_BOT_SECRET;
}

const resultSchema = z.object({
    transcript: z.array(z.object({ role: z.string(), text: z.string() })),
    botSummary: z.object({
        overallScore: z.number(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        improvementPlan: z.array(z.string()),
        perQuestion: z.array(z.any()),
    }).passthrough(),
});

/**
 * POST /api/internal/interview/[id]/result
 * Receives the full transcript + AI-generated summary from the bot
 * and persists them to the InterviewSession row.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    if (!requireBotSecret(request)) {
        return jsonError(401, "UNAUTHORIZED", "Invalid or missing internal secret.");
    }

    const body = await request.json().catch(() => null);
    const parsed = resultSchema.safeParse(body);
    if (!parsed.success) {
        return jsonError(400, "VALIDATION_ERROR", "Invalid result payload from bot.");
    }

    const { transcript, botSummary } = parsed.data;

    const session = await prisma.interviewSession.findUnique({ where: { id: params.id } });
    if (!session) {
        return jsonError(404, "NOT_FOUND", "Interview session not found.");
    }

    await prisma.interviewSession.update({
        where: { id: params.id },
        data: {
            transcript: transcript as any,
            botSummary: botSummary as any,
            status: "COMPLETED",
            endedAt: new Date(),
        },
    });

    // Also create / update the FeedbackReport so the existing report page still works
    await prisma.feedbackReport.upsert({
        where: { sessionId: params.id },
        create: {
            sessionId: params.id,
            overallScore: botSummary.overallScore,
            categoryScores: {},
            strengths: botSummary.strengths,
            weaknesses: botSummary.weaknesses,
            improvementPlan: botSummary.improvementPlan,
            skillGapInsights: session.skillGap as any,
            perQuestionSummary: botSummary.perQuestion as any,
        },
        update: {
            overallScore: botSummary.overallScore,
            strengths: botSummary.strengths,
            weaknesses: botSummary.weaknesses,
            improvementPlan: botSummary.improvementPlan,
            perQuestionSummary: botSummary.perQuestion as any,
        },
    });

    console.log(`[internal] Result saved for session ${params.id}, score=${botSummary.overallScore}`);
    return jsonOk({ success: true });
}
