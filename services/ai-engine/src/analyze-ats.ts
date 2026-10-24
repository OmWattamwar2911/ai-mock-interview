import {
  type AtsAnalysis,
  atsAnalysisSchema,
  calculateSkillGap,
  extractSkillsFromText,
  type ResumeParsed,
} from "@rehearse/shared";
import type { LlmProvider } from "./llm/types.js";
import { completeJson } from "./llm/json.js";
import { z } from "zod";

function calculateFormattingScore(text: string): { score: number; details: string } {
  let score = 0;
  const issues: string[] = [];

  // Check word count
  const words = text.trim().split(/\s+/).length;
  if (words >= 250 && words <= 1800) {
    score += 25;
  } else if (words < 250) {
    score += 10;
    issues.push("Resume is very brief (< 250 words)");
  } else {
    score += 15;
    issues.push("Resume is overly long (> 1,800 words)");
  }

  // Check standard headings
  const lower = text.toLowerCase();
  const headings = [
    { name: "experience/work history", regex: /(experience|work history|employment)/i },
    { name: "education", regex: /(education|academic|university|degree)/i },
    { name: "skills", regex: /(skills|technical skills|technologies|proficiencies)/i },
    { name: "projects", regex: /(projects|open source|personal projects)/i },
    { name: "summary/profile", regex: /(summary|profile|about me|objective)/i },
  ];

  let headingsFound = 0;
  for (const h of headings) {
    if (h.regex.test(lower)) headingsFound++;
  }
  score += headingsFound * 7; // up to 35 pts

  // Check bullet points
  const lines = text.split("\n").map((l) => l.trim());
  const bulletLines = lines.filter((l) => /^[•\-\*\u2022\u2023\u25E6]|\b\d+\.\s/.test(l));
  if (bulletLines.length >= 6) {
    score += 20;
  } else if (bulletLines.length >= 2) {
    score += 10;
    issues.push("Consider using more structured bullet points for readability");
  } else {
    issues.push("Few or no bullet points detected — wall of text is difficult for ATS scanners to parse");
  }

  // Check contact info
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
  const hasLink = /(linkedin\.com|github\.com|portfolio|[a-z0-9]+\.dev)/i.test(text);

  let contactPts = 0;
  if (hasEmail) contactPts += 10;
  if (hasPhone) contactPts += 5;
  if (hasLink) contactPts += 5;
  score += Math.min(20, contactPts);

  const finalScore = Math.min(100, Math.max(20, score));
  const details = issues.length > 0
    ? `Formatting score: ${finalScore}/100. Notes: ${issues.join("; ")}.`
    : `Excellent ATS-friendly layout with standard headings, bullet points, and contact details.`;

  return { score: finalScore, details };
}

function calculateCompletenessScore(parsed: ResumeParsed): { score: number; details: string } {
  let score = 0;
  const sectionsFound: string[] = [];
  const missingSections: string[] = [];

  if (parsed.summary && parsed.summary.trim().length > 20) {
    score += 20;
    sectionsFound.push("Summary");
  } else {
    missingSections.push("Professional Summary");
  }

  if (parsed.experience && parsed.experience.length > 0) {
    const validExp = parsed.experience.filter((e) => e.title || e.company);
    if (validExp.length >= 2) {
      score += 30;
      sectionsFound.push(`Work Experience (${validExp.length} positions)`);
    } else if (validExp.length === 1) {
      score += 20;
      sectionsFound.push("Work Experience (1 position)");
    }
  } else {
    missingSections.push("Work Experience");
  }

  if (parsed.education && parsed.education.length > 0) {
    score += 20;
    sectionsFound.push("Education");
  } else {
    missingSections.push("Education");
  }

  if (parsed.skills && parsed.skills.length >= 5) {
    score += 20;
    sectionsFound.push(`Skills (${parsed.skills.length} skills listed)`);
  } else if (parsed.skills && parsed.skills.length > 0) {
    score += 10;
    sectionsFound.push(`Skills (${parsed.skills.length} skills - recommend adding more)`);
  } else {
    missingSections.push("Skills Section");
  }

  if (parsed.projects && parsed.projects.length > 0) {
    score += 10;
    sectionsFound.push("Projects");
  }

  const finalScore = Math.min(100, Math.max(10, score));
  const details = missingSections.length > 0
    ? `Completeness score: ${finalScore}/100. Missing or sparse sections: ${missingSections.join(", ")}.`
    : `All core sections present: ${sectionsFound.join(", ")}.`;

  return { score: finalScore, details };
}

// Fallback heuristic rewrite suggestions when LLM is unavailable or rate-limited
function generateFallbackRewriteSuggestions(
  parsed: ResumeParsed,
  missingSkills: string[],
  jobRole: string
): Array<{ section: string; original: string; suggestion: string; reason: string }> {
  const suggestions: Array<{ section: string; original: string; suggestion: string; reason: string }> = [];

  // Suggest improvement for experience bullets
  if (parsed.experience && parsed.experience.length > 0) {
    const firstExp = parsed.experience[0];
    const bullet = firstExp.bullets?.[0] || "";
    if (bullet) {
      const topMissing = missingSkills.slice(0, 2).join(" and ");
      suggestions.push({
        section: "Work Experience",
        original: bullet,
        suggestion: `Spearheaded architecture and implementation using ${topMissing || "modern tech stack"}, delivering 35% improvement in processing latency and reducing system errors.`,
        reason: "Replaces passive phrasing with an impactful action verb ('Spearheaded') and quantifies business impact (+35% latency improvement).",
      });
    }
  }

  // Suggest improvement for summary
  const originalSummary = parsed.summary || "Software engineer with experience building web applications.";
  const skillsToInject = missingSkills.slice(0, 3).join(", ");
  suggestions.push({
    section: "Professional Summary",
    original: originalSummary,
    suggestion: `Results-driven ${jobRole} with proven expertise in ${skillsToInject || "full-stack systems"}. Track record of designing scalable cloud applications, optimizing workflows, and collaborating in agile environments to accelerate product delivery.`,
    reason: "Directly targets the job role title and incorporates high-priority JD keywords in the first 3 lines scanned by recruiters and ATS parsers.",
  });

  // Suggest improvement for projects
  if (parsed.projects && parsed.projects.length > 0) {
    const proj = parsed.projects[0];
    suggestions.push({
      section: "Projects",
      original: proj.summary || `${proj.name} project`,
      suggestion: `Architected ${proj.name || "application"}, integrating ${proj.skills.slice(0, 2).join(", ") || "cloud APIs"} to support 1,000+ daily active users with 99.9% uptime.`,
      reason: "Adds metrics (1,000+ users, 99.9% uptime) and clearly specifies technical ownership and technologies utilized.",
    });
  }

  return suggestions;
}

export async function analyzeResumeAts(
  resumeText: string,
  parsedResume: ResumeParsed,
  jobRole: string,
  jobDescriptionText: string,
  llm: LlmProvider | null
): Promise<AtsAnalysis> {
  // 1. Keyword match in code
  const { matchedIds: resumeTaxonomySkills } = extractSkillsFromText(resumeText);
  const combinedResumeSkills = Array.from(new Set([...parsedResume.skills, ...resumeTaxonomySkills]));

  const { matchedIds: jdTaxonomySkills } = extractSkillsFromText(jobDescriptionText);
  // Also extract words from jobRole
  const roleKeywords = jobRole.split(/\s+/).map((s) => s.trim()).filter((s) => s.length > 2);

  const targetRequiredSkills = Array.from(new Set([...jdTaxonomySkills, ...roleKeywords]));
  const skillGap = calculateSkillGap(combinedResumeSkills, targetRequiredSkills, []);

  const keywordScore = Math.min(100, Math.max(0, skillGap.matchScore));
  const keywordDetails = `Matched ${skillGap.matched.length} of ${targetRequiredSkills.length} key technical skills and keywords from the job description.`;

  // 2. Formatting score in code
  const formatting = calculateFormattingScore(resumeText);

  // 3. Section completeness in code
  const completeness = calculateCompletenessScore(parsedResume);

  // 4. LLM Judgement + Per-section feedback + Rewrite suggestions
  const llmFeedbackSchema = z.object({
    llmJudgementScore: z.number().min(0).max(100),
    llmJudgementDetails: z.string(),
    summary: z.string(),
    sectionFeedback: z.record(
      z.object({
        status: z.enum(["GOOD", "NEEDS_IMPROVEMENT", "MISSING"]),
        score: z.number().min(0).max(100),
        feedback: z.string(),
        suggestions: z.array(z.string()),
      })
    ),
    rewriteSuggestions: z.array(
      z.object({
        section: z.string(),
        original: z.string(),
        suggestion: z.string(),
        reason: z.string(),
      })
    ).min(1),
  });

  let llmResult: z.infer<typeof llmFeedbackSchema> | null = null;

  if (llm) {
    try {
      const prompt = `You are an expert Technical Recruiter and ATS (Applicant Tracking System) Evaluation Engine.
Analyze this candidate's resume for the role: "${jobRole}".

Target Job Description:
${jobDescriptionText.slice(0, 10_000)}

Resume Extracted Content:
${resumeText.slice(0, 16_000)}

Matched Keywords: ${skillGap.matched.join(", ")}
Missing Keywords: ${skillGap.missing.join(", ")}

Generate a comprehensive ATS evaluation:
1. "llmJudgementScore": (0-100) Evaluating action verbs, quantified results/impact metrics (e.g. %, $), role relevance, and clarity.
2. "llmJudgementDetails": 2-3 sentences explaining the qualitative score.
3. "summary": A concise overview of the candidate's ATS readiness for "${jobRole}".
4. "sectionFeedback": Object with keys for "summary", "experience", "skills", "education", "projects". Each has "status" ('GOOD'|'NEEDS_IMPROVEMENT'|'MISSING'), "score" (0-100), "feedback", and "suggestions" (array of actionable tips).
5. "rewriteSuggestions": 3 to 4 specific bullet rewrites from the resume. Provide the "section", the "original" text, an improved "suggestion" incorporating strong action verbs, quantifiable metrics, and missing keywords, and "reason".`;

      llmResult = await completeJson(llm, llmFeedbackSchema, prompt, { retries: 2, minTimeout: 1000 });
    } catch (err: any) {
      console.warn(`[analyzeResumeAts] LLM analysis unavailable or failed (${err?.message}). Using deterministic fallback.`);
    }
  }

  // Fallback if LLM was unavailable or timed out / failed
  const actionVerbRegex = /\b(spearheaded|architected|engineered|built|optimized|implemented|designed|delivered|scaled|led|streamlined)\b/gi;
  const actionVerbCount = (resumeText.match(actionVerbRegex) || []).length;
  const metricRegex = /\b(\d+[\%kmb]?|\$[\d,]+)\b/gi;
  const metricCount = (resumeText.match(metricRegex) || []).length;

  const heuristicJudgementScore = Math.min(
    95,
    Math.max(45, Math.round(50 + Math.min(25, actionVerbCount * 5) + Math.min(20, metricCount * 3)))
  );

  const llmJudgementScore = llmResult?.llmJudgementScore ?? heuristicJudgementScore;
  const llmJudgementDetails =
    llmResult?.llmJudgementDetails ??
    `Evaluated resume language: found ${actionVerbCount} strong action verbs and ${metricCount} quantified impact metrics. ${metricCount < 3 ? "Recommend adding more measurable business outcomes (% improvement, cost savings, latency reductions)." : "Good demonstration of quantified accomplishments."}`;

  // 5. Overall ATS Score calculation
  // Formula: (0.40 * Keyword) + (0.20 * Formatting) + (0.20 * Completeness) + (0.20 * LLM Judgement)
  const overallAtsScore = Math.round(
    0.4 * keywordScore +
    0.2 * formatting.score +
    0.2 * completeness.score +
    0.2 * llmJudgementScore
  );

  const calculationFormula =
    "Overall ATS Score = (40% Keyword Match) + (20% Formatting Quality) + (20% Section Completeness) + (20% Qualitative Impact & Action Verbs)";

  const sectionFeedback =
    llmResult?.sectionFeedback ?? {
      summary: {
        status: parsedResume.summary ? "GOOD" : "NEEDS_IMPROVEMENT",
        score: parsedResume.summary ? 85 : 40,
        feedback: parsedResume.summary
          ? "Professional summary is present and concise."
          : "Missing a targeted professional summary highlighting your core strengths.",
        suggestions: [
          `Tailor summary specifically for the ${jobRole} position.`,
          "Highlight top 3 technical proficiencies and years of experience upfront.",
        ],
      },
      experience: {
        status: parsedResume.experience.length > 0 ? "GOOD" : "MISSING",
        score: parsedResume.experience.length > 0 ? 80 : 20,
        feedback:
          parsedResume.experience.length > 0
            ? "Work experience is documented with titles and organizations."
            : "No professional experience detected.",
        suggestions: [
          "Format bullets using the Google XYZ formula: 'Accomplished [X] as measured by [Y] by doing [Z]'.",
          `Integrate missing keywords: ${skillGap.missing.slice(0, 3).join(", ") || "relevant skills"}.`,
        ],
      },
      skills: {
        status: parsedResume.skills.length >= 6 ? "GOOD" : "NEEDS_IMPROVEMENT",
        score: parsedResume.skills.length >= 6 ? 90 : 60,
        feedback: `Identified ${parsedResume.skills.length} technical skills.`,
        suggestions: [
          `Categorize skills into Languages, Frameworks, and Tools for rapid scanning.`,
          skillGap.missing.length > 0
            ? `Add relevant missing skills from the JD: ${skillGap.missing.slice(0, 4).join(", ")}.`
            : "Keep skill versions current.",
        ],
      },
      education: {
        status: parsedResume.education.length > 0 ? "GOOD" : "NEEDS_IMPROVEMENT",
        score: parsedResume.education.length > 0 ? 90 : 50,
        feedback:
          parsedResume.education.length > 0
            ? "Education section clearly identifies degree and institution."
            : "Education section is incomplete.",
        suggestions: ["Include graduation year and honors/coursework if relevant."],
      },
      projects: {
        status: parsedResume.projects.length > 0 ? "GOOD" : "NEEDS_IMPROVEMENT",
        score: parsedResume.projects.length > 0 ? 85 : 55,
        feedback:
          parsedResume.projects.length > 0
            ? "Projects demonstrate hands-on application of technical skills."
            : "Consider adding 1-2 featured projects demonstrating target skills.",
        suggestions: [
          "Link to live demos or GitHub repositories.",
          "Describe technical architecture and problems solved.",
        ],
      },
    };

  const rewriteSuggestions =
    llmResult?.rewriteSuggestions ??
    generateFallbackRewriteSuggestions(parsedResume, skillGap.missing, jobRole);

  const summary =
    llmResult?.summary ??
    `Your resume received an ATS score of ${overallAtsScore}/100 for the ${jobRole} role. You match ${skillGap.matched.length} key required skills, with strong formatting and section structure. Focus on incorporating missing keywords and adding quantified outcomes to maximize recruiter callbacks.`;

  return atsAnalysisSchema.parse({
    overallAtsScore,
    breakdown: {
      keywordMatch: {
        score: keywordScore,
        weight: 0.4,
        details: keywordDetails,
      },
      formatting: {
        score: formatting.score,
        weight: 0.2,
        details: formatting.details,
      },
      sectionCompleteness: {
        score: completeness.score,
        weight: 0.2,
        details: completeness.details,
      },
      llmJudgement: {
        score: llmJudgementScore,
        weight: 0.2,
        details: llmJudgementDetails,
      },
      calculationFormula,
    },
    matchedKeywords: skillGap.matched,
    missingKeywords: skillGap.missing,
    partialKeywords: skillGap.partial,
    sectionFeedback,
    rewriteSuggestions,
    summary,
    analyzedAt: new Date().toISOString(),
  });
}
