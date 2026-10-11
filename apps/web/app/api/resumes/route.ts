import { Prisma } from "@prisma/client";
import { resumeParsedSchema } from "@rehearse/shared";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { callAiEngine } from "@/lib/services";
import { safeEncrypt } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024;

export async function GET() {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  const resumes = await prisma.resume.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, fileType: true, parsed: true, createdAt: true },
  });
  return jsonOk({ resumes });
}

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  if (!rateLimit(clientKey(request.headers, "ai"), 12, 60_000)) {
    return jsonError(429, "RATE_LIMITED", "Too many parse requests");
  }

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError(400, "VALIDATION_ERROR", "Expected multipart form data");
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "VALIDATION_ERROR", "file is required");
  if (file.size > MAX_BYTES) return jsonError(400, "VALIDATION_ERROR", "File must be 5MB or smaller");
  if (!file.name.match(/\.(pdf|docx|txt)$/i)) {
    return jsonError(400, "VALIDATION_ERROR", "Upload a PDF, DOCX, or TXT file");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    // Guard: verify the user still exists in DB (stale JWT after a DB reset would cause FK error)
    const userExists = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (!userExists) {
      return jsonError(401, "USER_NOT_FOUND", "Your session is outdated. Please sign out and sign in again.");
    }

    const payload = (await callAiEngine("/v1/parse/resume", {
      fileBase64: buf.toString("base64"),
      mime: file.type || "application/octet-stream",
    })) as { parsed: unknown; text: string };
    const parsed = resumeParsedSchema.parse(payload.parsed);

    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        encryptedText: safeEncrypt(payload.text),
        parsed: parsed as Prisma.InputJsonValue,
      },
      select: { id: true, fileName: true, fileType: true, parsed: true, createdAt: true },
    });
    await writeAudit(user.id, "resume.upload", { resumeId: resume.id });
    return jsonOk({ resume }, 201);
  } catch (err) {
    // Don't leak raw Prisma messages — map FK violations to a friendly message
    if (err instanceof Error && err.message.includes("Foreign key constraint")) {
      return jsonError(401, "USER_NOT_FOUND", "Your session references a user that no longer exists. Please sign out and sign in again.");
    }
    const message = err instanceof Error ? err.message : "Failed to parse resume";
    return jsonError(502, "UPSTREAM_ERROR", message);
  }
}

export async function PATCH(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ id: z.string(), parsed: resumeParsedSchema }).safeParse(body);
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "id and parsed are required");
  const updated = await prisma.resume.updateMany({
    where: { id: parsed.data.id, userId: user.id },
    data: { parsed: parsed.data.parsed as Prisma.InputJsonValue },
  });
  if (!updated.count) return jsonError(404, "NOT_FOUND", "Resume not found");
  const resume = await prisma.resume.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, fileName: true, fileType: true, parsed: true, createdAt: true },
  });
  return jsonOk({ resume });
}
