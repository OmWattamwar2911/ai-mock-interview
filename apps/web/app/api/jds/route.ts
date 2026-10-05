import { Prisma } from "@prisma/client";
import { jdParsedSchema } from "@rehearse/shared";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { callAiEngine } from "@/lib/services";
import { safeEncrypt } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024;

async function persistJd(userId: string, payload: { parsed: unknown; text: string }, titleHint: string) {
  const parsed = jdParsedSchema.parse(payload.parsed);
  const title = (titleHint || parsed.title || "Job description").slice(0, 160);
  const jd = await prisma.jobDescription.create({
    data: {
      userId,
      title,
      encryptedText: safeEncrypt(payload.text),
      parsed: parsed as Prisma.InputJsonValue,
    },
    select: { id: true, title: true, parsed: true, createdAt: true },
  });
  await writeAudit(userId, "jd.create", { jdId: jd.id });
  return jsonOk({ jobDescription: jd }, 201);
}

export async function GET() {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  const jobDescriptions = await prisma.jobDescription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, parsed: true, createdAt: true },
  });
  return jsonOk({ jobDescriptions });
}

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  if (!rateLimit(clientKey(request.headers, "ai"), 12, 60_000)) {
    return jsonError(429, "RATE_LIMITED", "Too many parse requests");
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const pasted = form.get("text");
      const titleField = form.get("title");
      const titleHint = typeof titleField === "string" ? titleField : "";
      if (typeof pasted === "string" && pasted.trim()) {
        const payload = (await callAiEngine("/v1/parse/jd", { text: pasted })) as { parsed: unknown; text: string };
        return persistJd(user.id, payload, titleHint);
      }
      const file = form.get("file");
      if (file instanceof File) {
        if (file.size > MAX_BYTES) return jsonError(400, "VALIDATION_ERROR", "File must be 5MB or smaller");
        const buf = Buffer.from(await file.arrayBuffer());
        const payload = (await callAiEngine("/v1/parse/jd", {
          fileBase64: buf.toString("base64"),
          mime: file.type,
          text: file.name.match(/\.txt$/i) ? buf.toString("utf8") : undefined,
        })) as { parsed: unknown; text: string };
        return persistJd(user.id, payload, titleHint || file.name.replace(/\.[^.]+$/, ""));
      }
      return jsonError(400, "VALIDATION_ERROR", "Paste or upload a job description");
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = z.object({ text: z.string().min(20), title: z.string().optional() }).safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Paste at least 20 characters of the job description");
    }
    const payload = (await callAiEngine("/v1/parse/jd", { text: parsed.data.text })) as {
      parsed: unknown;
      text: string;
    };
    return persistJd(user.id, payload, parsed.data.title ?? "");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse job description";
    return jsonError(502, "UPSTREAM_ERROR", message);
  }
}

export async function PATCH(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  const body: unknown = await request.json().catch(() => null);
  const parsed = z
    .object({ id: z.string(), title: z.string().min(1).max(160).optional(), parsed: jdParsedSchema })
    .safeParse(body);
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "id and parsed are required");
  const updated = await prisma.jobDescription.updateMany({
    where: { id: parsed.data.id, userId: user.id },
    data: {
      parsed: parsed.data.parsed as Prisma.InputJsonValue,
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
    },
  });
  if (!updated.count) return jsonError(404, "NOT_FOUND", "Job description not found");
  const jobDescription = await prisma.jobDescription.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, title: true, parsed: true, createdAt: true },
  });
  return jsonOk({ jobDescription });
}
