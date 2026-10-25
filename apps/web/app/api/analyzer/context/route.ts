import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";

const contextSchema = z.object({
  targetRole: z.string().min(1, "Target role is required"),
  jobDescriptionText: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  try {
    const json = await request.json();
    const parsed = contextSchema.safeParse(json);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid payload");
    }

    const { targetRole, jobDescriptionText } = parsed.data;

    const updated = await prisma.userProfileContext.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        targetRole,
        jobDescriptionText,
      },
      update: {
        targetRole,
        jobDescriptionText,
      },
    });

    return jsonOk({ context: updated });
  } catch (err: any) {
    console.error("[analyzer/context] Error:", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to update profile context");
  }
}
