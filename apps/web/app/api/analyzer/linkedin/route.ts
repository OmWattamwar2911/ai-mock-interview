import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";
import { callAiEngine } from "@/lib/services";
import { parseLinkedInPdfText, scoreLinkedInProfile, type LinkedInSections } from "@/lib/analyzer/linkedin";

export async function POST(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  if (!rateLimit(clientKey(request.headers, `analyzer-li-${user.id}`), 20, 60 * 60 * 1000)) {
    return jsonError(429, "RATE_LIMITED", "Analysis limit reached (20/hour). Please try again later.");
  }

  const contentType = request.headers.get("content-type") || "";

  let sections: LinkedInSections = {
    headline: "",
    about: "",
    experience: "",
    skills: "",
    education: "",
    projects: "",
    certifications: "",
    recommendations: "",
    profileUrl: "",
  };

  let targetRole = "Software Engineer";
  let targetJdText = "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      targetRole = String(form.get("targetRole") || "Software Engineer").trim();
      targetJdText = String(form.get("targetJdText") || form.get("jobDescription") || "").trim();

      const profileUrl = String(form.get("profileUrl") || "").trim();
      if (profileUrl) sections.profileUrl = profileUrl;

      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        if (file.size > 5 * 1024 * 1024) {
          return jsonError(400, "VALIDATION_ERROR", "File must be 5MB or smaller.");
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Extract raw text from PDF via ai-engine
        const payload: any = await callAiEngine("/v1/parse/resume", {
          fileBase64: buffer.toString("base64"),
          mime: file.type || "application/pdf",
        });

        const rawText = payload?.text || "";
        if (!rawText.trim()) {
          return jsonError(400, "PARSE_ERROR", "Could not extract text from the LinkedIn PDF export.");
        }

        sections = parseLinkedInPdfText(rawText);
        if (profileUrl) sections.profileUrl = profileUrl;
      } else {
        // Form field fallback
        sections.headline = String(form.get("headline") || "");
        sections.about = String(form.get("about") || "");
        sections.experience = String(form.get("experience") || "");
        sections.skills = String(form.get("skills") || "");
        sections.education = String(form.get("education") || "");
        sections.projects = String(form.get("projects") || "");
        sections.certifications = String(form.get("certifications") || "");
        sections.recommendations = String(form.get("recommendations") || "");
      }
    } else {
      const json = await request.json().catch(() => ({}));
      targetRole = String(json.targetRole || "Software Engineer").trim();
      targetJdText = String(json.targetJdText || json.jobDescription || "").trim();
      sections = {
        fullName: json.fullName || "",
        headline: json.headline || "",
        about: json.about || "",
        experience: json.experience || "",
        skills: json.skills || "",
        education: json.education || "",
        projects: json.projects || "",
        certifications: json.certifications || "",
        recommendations: json.recommendations || "",
        profileUrl: json.profileUrl || "",
      };
    }

    if (!sections.headline && !sections.experience && !sections.about) {
      return jsonError(400, "VALIDATION_ERROR", "Please provide at least a Headline, Experience, or About section to analyze.");
    }

    // Retrieve latest user resume for consistency check
    let resumeData: any = undefined;
    const latestResume = await prisma.resume.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (latestResume?.parsed) {
      const p: any = latestResume.parsed;
      resumeData = {
        skills: Array.isArray(p.skills) ? p.skills : [],
        experience: Array.isArray(p.experience) ? p.experience : [],
      };
    }

    // Score LinkedIn profile
    const result = scoreLinkedInProfile(sections, targetRole, targetJdText, resumeData);

    // Save to AnalyzerResult
    const saved = await prisma.analyzerResult.create({
      data: {
        userId: user.id,
        type: "LINKEDIN",
        subject: result.subject,
        targetRole,
        score: result.score,
        resultJson: result as any,
      },
    });

    // Update shared profile context if targetRole provided
    if (targetRole) {
      await prisma.userProfileContext.upsert({
        where: { userId: user.id },
        create: { userId: user.id, targetRole, jobDescriptionText: targetJdText },
        update: { targetRole, jobDescriptionText: targetJdText || undefined },
      }).catch(() => {});
    }

    await writeAudit(user.id, "analyzer.linkedin", {
      score: result.score,
      subject: result.subject,
    });

    return jsonOk({
      id: saved.id,
      result: { ...result, id: saved.id },
      sections,
    });
  } catch (err: any) {
    console.error("[api/analyzer/linkedin] Error:", err);
    return jsonError(500, "ANALYSIS_FAILED", `LinkedIn analysis failed: ${err.message || "Unknown error"}`);
  }
}
