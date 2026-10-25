import { Prisma } from "@prisma/client";
import { atsAnalysisSchema, resumeParsedSchema } from "@rehearse/shared";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { callAiEngine } from "@/lib/services";
import { safeDecrypt, safeEncrypt } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  if (!rateLimit(clientKey(request.headers, "ai-ats"), 15, 60_000)) {
    return jsonError(429, "RATE_LIMITED", "Too many analysis requests. Please wait a moment and try again.");
  }

  const contentType = request.headers.get("content-type") || "";

  let jobRole = "";
  let jobDescriptionText = "";
  let resumeId: string | null = null;
  let fileBuffer: Buffer | null = null;
  let fileName = "";
  let fileMime = "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      jobRole = String(form.get("jobRole") || "").trim();
      jobDescriptionText = String(form.get("jobDescriptionText") || form.get("jobDescription") || "").trim();
      const formResumeId = form.get("resumeId");
      if (typeof formResumeId === "string" && formResumeId) {
        resumeId = formResumeId;
      }

      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_BYTES) {
          return jsonError(400, "VALIDATION_ERROR", "Resume file must be 5MB or smaller.");
        }
        if (!file.name.match(/\.(pdf|docx|txt)$/i)) {
          return jsonError(400, "VALIDATION_ERROR", "Supported resume formats: PDF, DOCX, TXT.");
        }
        fileBuffer = Buffer.from(await file.arrayBuffer());
        fileName = file.name;
        fileMime = file.type || "application/octet-stream";
      }
    } else {
      const json: any = await request.json().catch(() => null);
      if (!json) return jsonError(400, "VALIDATION_ERROR", "Invalid JSON request body.");
      jobRole = String(json.jobRole || "").trim();
      jobDescriptionText = String(json.jobDescriptionText || json.jobDescription || "").trim();
      resumeId = json.resumeId ? String(json.resumeId) : null;

      // If user passed jdId, retrieve JD text from DB
      if (!jobDescriptionText && json.jdId) {
        const jd = await prisma.jobDescription.findFirst({
          where: { id: String(json.jdId), userId: user.id },
        });
        if (jd) {
          jobDescriptionText = safeDecrypt(jd.encryptedText);
          if (!jobRole && jd.title) jobRole = jd.title;
        }
      }
    }

    if (!jobRole) {
      return jsonError(400, "VALIDATION_ERROR", "Job role is required (e.g., 'Senior Fullstack Engineer').");
    }
    if (!jobDescriptionText) {
      return jsonError(400, "VALIDATION_ERROR", "Job description text is required.");
    }
    if (!resumeId && !fileBuffer) {
      return jsonError(400, "VALIDATION_ERROR", "Please provide a resume file or select an existing resume.");
    }

    let existingResume: any = null;
    let resumeText = "";
    let parsedResumeData: any = null;

    if (resumeId) {
      existingResume = await prisma.resume.findFirst({
        where: { id: resumeId, userId: user.id },
      });
      if (!existingResume) {
        return jsonError(404, "NOT_FOUND", "Selected resume was not found.");
      }
      resumeText = safeDecrypt(existingResume.encryptedText);
      parsedResumeData = existingResume.parsed;
    }

    // Call ai-engine for ATS Analysis
    const payload = (await callAiEngine("/v1/analyze/ats", {
      resumeText: resumeText || undefined,
      fileBase64: fileBuffer ? fileBuffer.toString("base64") : undefined,
      mime: fileMime || undefined,
      parsedResume: parsedResumeData || undefined,
      jobRole,
      jobDescriptionText,
    })) as {
      atsAnalysis: unknown;
      parsedResume: unknown;
      text: string;
    };

    const validatedAts = atsAnalysisSchema.parse(payload.atsAnalysis);
    const validatedParsed = resumeParsedSchema.parse(payload.parsedResume);

    let savedResumeId = resumeId;

    if (existingResume) {
      await prisma.resume.update({
        where: { id: existingResume.id },
        data: {
          atsAnalysis: validatedAts as unknown as Prisma.InputJsonValue,
          parsed: validatedParsed as unknown as Prisma.InputJsonValue,
        },
      });
    } else if (fileBuffer) {
      const createdResume = await prisma.resume.create({
        data: {
          userId: user.id,
          fileName: fileName || "Uploaded Resume",
          fileType: fileMime || "application/octet-stream",
          encryptedText: safeEncrypt(payload.text),
          parsed: validatedParsed as unknown as Prisma.InputJsonValue,
          atsAnalysis: validatedAts as unknown as Prisma.InputJsonValue,
        },
      });
      savedResumeId = createdResume.id;
    }

    // Record in unified AnalyzerResult
    await prisma.analyzerResult.create({
      data: {
        userId: user.id,
        type: "RESUME",
        subject: fileName || existingResume?.fileName || "Resume ATS Audit",
        targetRole: jobRole,
        score: validatedAts.overallAtsScore,
        resultJson: {
          type: "RESUME",
          subject: fileName || existingResume?.fileName || "Resume ATS Audit",
          score: validatedAts.overallAtsScore,
          targetRole: jobRole,
          atsAnalysis: validatedAts,
          parsedResume: validatedParsed,
        } as any,
      },
    }).catch((e) => console.error("[api/resumes/analyze] AnalyzerResult record error:", e));

    // Update shared profile context
    await prisma.userProfileContext.upsert({
      where: { userId: user.id },
      create: { userId: user.id, targetRole: jobRole, jobDescriptionText },
      update: { targetRole: jobRole, jobDescriptionText },
    }).catch(() => {});

    await writeAudit(user.id, "resume.ats_analysis", {
      resumeId: savedResumeId,
      jobRole,
      atsScore: validatedAts.overallAtsScore,
    });

    return jsonOk(
      {
        resumeId: savedResumeId,
        jobRole,
        atsAnalysis: validatedAts,
        parsedResume: validatedParsed,
      },
      200
    );
  } catch (err: any) {
    console.error("[api/resumes/analyze] Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to analyze resume";
    if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
      return jsonError(429, "RATE_LIMITED", "AI service is currently busy. Please retry in 15 seconds.");
    }
    return jsonError(500, "ANALYSIS_FAILED", `Could not complete ATS resume analysis: ${msg}`);
  }
}
