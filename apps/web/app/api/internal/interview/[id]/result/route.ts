import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";
import { evaluateSession } from "@/lib/evaluation";

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
                overallScore: z.number().nullable().optional(),
                overallScore100: z.number().nullable().optional(),
                verdict: z.string().optional(),
                categoryScores: z.record(z.any()).optional(),
                strengths: z.array(z.string()).optional(),
                weaknesses: z.array(z.string()).optional(),
                improvementPlan: z.array(z.string()).optional(),
                supportingQuotes: z.array(z.union([z.string(), z.record(z.any())])).optional(),
                candidateQuotes: z.array(z.string()).optional(),
                perQuestion: z.array(z.any()).optional(),
                practicePlan7Day: z.array(z.union([z.string(), z.record(z.any())])).optional(),
            })
            .passthrough()
            .optional(),
        observations: z.array(z.any()).optional().default([]),
        timeline: z.array(z.any()).optional().default([]),
        testResults: z.record(z.any()).optional(),
        status: z.enum(["COMPLETED", "FAILED", "EVALUATING"]).optional().default("COMPLETED"),
        endReason: z.string().optional().nullable(),
        errorMessage: z.string().optional().nullable(),
    })
    .passthrough();

/**
 * POST /api/internal/interview/[id]/result
 * Receives the transcript + raw observations from the bot.
 * Persists transcript and initiates evidence-based evaluation without injecting synthetic defaults.
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
        ...(botSummary || {}),
        observations,
        timeline,
        testResults: testResults || (botSummary as any)?.testResults,
        endReason: endReason ?? session.endReason ?? "completed",
    };

    // Update session state with incoming transcript and metadata
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

    // Run strict evidence-based evaluation if completed or evaluating
    if (finalStatus === "COMPLETED") {
        try {
            await evaluateSession(params.id, true);
        } catch (evalErr) {
            console.error(`[internal] Evidence evaluation failed for ${params.id}:`, evalErr);
        }
    }

    console.log(`[internal] Result processed cleanly for session ${params.id}, status=${finalStatus}`);
    return jsonOk({ success: true, status: finalStatus });
}
