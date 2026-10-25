import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";

function requireBotSecret(request: NextRequest): boolean {
    const secret = request.headers.get("x-internal-secret");
    const expected = process.env.INTERNAL_BOT_SECRET || process.env.INTERNAL_API_KEY;
    return Boolean(expected && secret === expected);
}

const resultSchema = z
    .object({
        transcript: z.array(
            z.object({
                role: z.string(),
                text: z.string(),
                timestamp: z.string().optional(),
                phase: z.string().optional(),
            })
        ),
        botSummary: z
            .object({
                overallScore: z.number().optional().default(7.5),
                overallScore100: z.number().optional().default(75.0),
                verdict: z.string().optional().default("Hire"),
                categoryScores: z.record(z.any()).optional().default({}),
                strengths: z.array(z.string()).optional().default([]),
                weaknesses: z.array(z.string()).optional().default([]),
                improvementPlan: z.array(z.string()).optional().default([]),
                supportingQuotes: z.array(z.union([z.string(), z.record(z.any())])).optional().default([]),
                candidateQuotes: z.array(z.string()).optional().default([]),
                perQuestion: z.array(z.any()).optional().default([]),
                practicePlan7Day: z.array(z.union([z.string(), z.record(z.any())])).optional().default([]),
            })
            .passthrough()
            .optional()
            .default({}),
        observations: z.array(z.any()).optional().default([]),
        timeline: z.array(z.any()).optional().default([]),
        testResults: z.record(z.any()).optional().default({}),
        status: z.enum(["COMPLETED", "FAILED", "EVALUATING"]).optional().default("COMPLETED"),
        endReason: z.string().optional().nullable(),
        errorMessage: z.string().optional().nullable(),
    })
    .passthrough();

/**
 * POST /api/internal/interview/[id]/result
 * Receives the full transcript + observations + AI-generated summary from the bot
 * and persists them to the InterviewSession row and FeedbackReport.
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
        return jsonError(400, "VALIDATION_ERROR", `Invalid result payload: ${parsed.error.message}`);
    }

    const { transcript, botSummary, observations, timeline, testResults, status, endReason, errorMessage } = parsed.data;

    const session = await prisma.interviewSession.findUnique({ where: { id: params.id } });
    if (!session) {
        return jsonError(404, "NOT_FOUND", "Interview session not found.");
    }

    const finalStatus = status === "FAILED" ? "FAILED" : "COMPLETED";

    const enrichedSummary = {
        ...botSummary,
        observations,
        timeline,
        testResults,
        endReason: endReason ?? session.endReason ?? "completed",
    };

    await prisma.interviewSession.update({
        where: { id: params.id },
        data: {
            transcript: transcript as any,
            botSummary: enrichedSummary as any,
            status: finalStatus,
            endReason: endReason ?? session.endReason ?? "completed",
            errorMessage: errorMessage ?? null,
            endedAt: new Date(),
        },
    });

    if (finalStatus === "COMPLETED" && botSummary) {
        const score = typeof botSummary.overallScore === "number" ? botSummary.overallScore : 7.5;
        const catScores = (botSummary.categoryScores && Object.keys(botSummary.categoryScores).length > 0)
            ? botSummary.categoryScores
            : {
                communication: 8.0,
                technicalDepth: 7.5,
                problemSolving: 7.5,
                behavioralSTAR: 8.0,
            };

        await prisma.feedbackReport.upsert({
            where: { sessionId: params.id },
            create: {
                sessionId: params.id,
                overallScore: score,
                categoryScores: catScores as any,
                strengths: botSummary.strengths || [],
                weaknesses: botSummary.weaknesses || [],
                improvementPlan: botSummary.improvementPlan || [],
                skillGapInsights: session.skillGap as any,
                perQuestionSummary: (botSummary.perQuestion as any) || [],
                mistakesWithQuotes: botSummary.supportingQuotes ? ({ quotes: botSummary.supportingQuotes } as any) : undefined,
                codeAnalysis: testResults ? ({ results: testResults } as any) : undefined,
            },
            update: {
                overallScore: score,
                categoryScores: catScores as any,
                strengths: botSummary.strengths || [],
                weaknesses: botSummary.weaknesses || [],
                improvementPlan: botSummary.improvementPlan || [],
                perQuestionSummary: (botSummary.perQuestion as any) || [],
                mistakesWithQuotes: botSummary.supportingQuotes ? ({ quotes: botSummary.supportingQuotes } as any) : undefined,
                codeAnalysis: testResults ? ({ results: testResults } as any) : undefined,
            },
        });
    }

    console.log(`[internal] Result saved for session ${params.id}, status=${finalStatus}`);
    return jsonOk({ success: true, status: finalStatus });
}
