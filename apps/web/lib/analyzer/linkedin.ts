import type {
  UnifiedAnalyzerResult,
  AnalyzerScoreBreakdown,
  AnalyzerFinding,
  AnalyzerRecommendation,
} from "./types";

export interface LinkedInSections {
  fullName?: string;
  headline: string;
  about: string;
  experience: string;
  skills: string;
  education: string;
  projects?: string;
  certifications?: string;
  recommendations?: string;
  profileUrl?: string;
}

/**
 * Parses raw text extracted from a LinkedIn PDF export ("Profile -> More -> Save to PDF")
 * into normalized, editable sections.
 */
export function parseLinkedInPdfText(rawText: string): LinkedInSections {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const sections: LinkedInSections = {
    fullName: "",
    headline: "",
    about: "",
    experience: "",
    skills: "",
    education: "",
    projects: "",
    certifications: "",
    recommendations: "",
  };

  if (lines.length === 0) return sections;

  // Header extraction (Name is typically line 0 or 1, followed by headline and location)
  sections.fullName = lines[0] || "";
  if (lines.length > 1 && !lines[1].toLowerCase().startsWith("page")) {
    sections.headline = lines[1];
  }

  type SectionKey = keyof Omit<LinkedInSections, "fullName" | "profileUrl">;
  let currentSection: SectionKey | null = null;
  const sectionContent: Record<SectionKey, string[]> = {
    headline: sections.headline ? [sections.headline] : [],
    about: [],
    experience: [],
    skills: [],
    education: [],
    projects: [],
    certifications: [],
    recommendations: [],
  };

  const headerPatterns: Record<string, SectionKey> = {
    summary: "about",
    about: "about",
    experience: "experience",
    "top skills": "skills",
    skills: "skills",
    education: "education",
    projects: "projects",
    certifications: "certifications",
    licenses: "certifications",
    recommendations: "recommendations",
    "honors-awards": "projects",
    publications: "projects",
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase().replace(/[:\-_]/g, "").trim();

    // Check if line is a section header
    if (headerPatterns[lower]) {
      currentSection = headerPatterns[lower];
      continue;
    }

    // Ignore page markers e.g. "Page 1 of 2"
    if (lower.startsWith("page ") && lower.includes(" of ")) {
      continue;
    }

    if (currentSection) {
      sectionContent[currentSection].push(line);
    } else if (!sections.headline && i < 4) {
      sectionContent.headline.push(line);
    }
  }

  sections.headline = sectionContent.headline.join(" ").trim();
  sections.about = sectionContent.about.join("\n").trim();
  sections.experience = sectionContent.experience.join("\n").trim();
  sections.skills = sectionContent.skills.join(", ").trim();
  sections.education = sectionContent.education.join("\n").trim();
  sections.projects = sectionContent.projects.join("\n").trim();
  sections.certifications = sectionContent.certifications.join("\n").trim();
  sections.recommendations = sectionContent.recommendations.join("\n").trim();

  return sections;
}

const ACTION_VERBS = [
  "architected", "engineered", "built", "spearheaded", "developed", "led", "designed",
  "optimized", "deployed", "implemented", "scaled", "automated", "mentored", "delivered",
  "refactored", "integrated", "managed", "reduced", "increased", "created"
];

/**
 * Deterministic rule-based scoring (100 points total) for LinkedIn profiles.
 */
export function scoreLinkedInProfile(
  sections: LinkedInSections,
  targetRole: string,
  targetJdText: string,
  resumeData?: { skills?: string[]; experience?: Array<{ company?: string; role?: string }> }
): UnifiedAnalyzerResult {
  const breakdown: AnalyzerScoreBreakdown[] = [];
  const findings: AnalyzerFinding[] = [];
  const recommendations: AnalyzerRecommendation[] = [];

  const headline = (sections.headline || "").trim();
  const about = (sections.about || "").trim();
  const exp = (sections.experience || "").trim();
  const skillsText = (sections.skills || "").trim();
  const edu = (sections.education || "").trim();
  const projects = (sections.projects || "").trim();
  const certs = (sections.certifications || "").trim();
  const recs = (sections.recommendations || "").trim();

  // 1. Headline Quality (12 pts)
  let headlineScore = 0;
  const roleKeywords = targetRole.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const headlineLower = headline.toLowerCase();
  const matchesRole = roleKeywords.some((kw) => headlineLower.includes(kw));

  if (headline.length >= 15) headlineScore += 4;
  if (matchesRole || headlineLower.includes("engineer") || headlineLower.includes("developer")) headlineScore += 4;
  if (headline.includes("|") || headline.includes("·") || headline.includes("-") || headlineLower.includes("building") || headlineLower.includes("specializing")) {
    headlineScore += 4; // value proposition / divider structure
  }
  breakdown.push({
    name: "Headline Clarity & Value Proposition",
    score: headlineScore,
    max: 12,
    evidence: headline ? `"${headline.slice(0, 70)}..."` : "Empty headline",
    missing: headlineScore < 12 ? "Include target role keywords, core technologies, and your primary value proposition separated by pipes." : undefined,
  });

  if (headlineScore < 8) {
    findings.push({
      severity: "HIGH",
      title: "Headline lacks target role keywords",
      detail: `Your headline currently does not prominently feature target role terms (${targetRole}). LinkedIn recruiter search indexes headline keywords heavily.`,
      evidence: headline || "None",
    });
  }

  // 2. About Section (15 pts)
  let aboutScore = 0;
  const aboutWords = about.split(/\s+/).filter(Boolean).length;
  if (aboutWords >= 40) aboutScore += 5;
  if (aboutWords >= 120) aboutScore += 3;
  const isFirstPerson = /\b(i|my|i'm|we)\b/i.test(about);
  if (isFirstPerson) aboutScore += 3;
  const hasCta = /\b(connect|reach|email|contact|message|open to)\b/i.test(about);
  if (hasCta) aboutScore += 4;

  breakdown.push({
    name: "About Section Narrative & CTA",
    score: aboutScore,
    max: 15,
    evidence: aboutWords > 0 ? `${aboutWords} words narrative, first-person: ${isFirstPerson ? "yes" : "no"}, CTA: ${hasCta ? "present" : "missing"}` : "About section empty",
    missing: aboutScore < 15 ? "Expand About summary to 120+ words, narrating your engineering passion, key achievements, and a clear contact call-to-action." : undefined,
  });

  if (aboutWords < 50) {
    findings.push({
      severity: "MEDIUM",
      title: "About section is too brief or missing",
      detail: "Recruiters spend an average of 6 seconds skimming the About section. A compelling summary establishes your technical depth before they scroll.",
    });
  }

  // 3. Experience & Quantified Impact (25 pts)
  let expScore = 0;
  const expLower = exp.toLowerCase();
  // Metric presence: percentages, numbers, multipliers (e.g. 40%, $2M, 10x, 500k)
  const metricMatches = exp.match(/\b(\d+[\d,.]*(\%|\+?k|\+?m|\+?b|x|\s*ms|\s*users|\s*qps))\b/gi) || [];
  const verbMatches = ACTION_VERBS.filter((v) => expLower.includes(v));

  if (exp.length > 50) expScore += 5;
  if (exp.length > 200) expScore += 5;
  if (metricMatches.length >= 2) expScore += 4;
  if (metricMatches.length >= 5) expScore += 4;
  if (verbMatches.length >= 3) expScore += 4;
  if (verbMatches.length >= 6) expScore += 3;

  breakdown.push({
    name: "Experience & Quantified Impact",
    score: expScore,
    max: 25,
    evidence: `Detected ${metricMatches.length} quantified metric tokens and ${verbMatches.length} strong action verbs.`,
    missing: expScore < 25 ? "Add concrete outcome metrics (e.g., latency reduction %, scale handled, RPS) and lead bullets with strong action verbs." : undefined,
  });

  if (metricMatches.length < 3) {
    findings.push({
      severity: "HIGH",
      title: "Low frequency of quantifiable outcomes",
      detail: "Engineering managers filter for quantifiable business/technical impact. Only found few metrics in your experience bullets.",
      evidence: `Found ${metricMatches.length} metric references.`,
    });
  }

  // 4. Skills Relevance (13 pts)
  let skillsScore = 0;
  const parsedSkillsList = skillsText.split(/[,;\n•]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (parsedSkillsList.length >= 5) skillsScore += 5;
  if (parsedSkillsList.length >= 12) skillsScore += 4;

  // Check overlap with JD
  const jdKeywords = targetJdText.toLowerCase().split(/[\s,.;()]+/).filter((w) => w.length > 3);
  const matchedSkills = parsedSkillsList.filter((s) => jdKeywords.includes(s));
  if (matchedSkills.length >= 2) skillsScore += 2;
  if (matchedSkills.length >= 5) skillsScore += 2;

  breakdown.push({
    name: "Skills Inventory & Relevance",
    score: skillsScore,
    max: 13,
    evidence: `${parsedSkillsList.length} skills listed (${matchedSkills.length} directly matched target JD keywords).`,
    missing: skillsScore < 13 ? "Ensure you have at least 15 technical skills listed, prioritized by the requirements of your target job description." : undefined,
  });

  // 5. Education & Certifications (7 pts)
  let eduScore = 0;
  if (edu.length >= 10) eduScore += 4;
  if (certs.length >= 10 || /cert|aws|gcp|azure|cka|certified/i.test(certs)) eduScore += 3;
  else if (edu.length >= 40) eduScore += 2; // extra credit for detailed degree
  breakdown.push({
    name: "Education & Credentials",
    score: Math.min(7, eduScore),
    max: 7,
    evidence: edu ? `Education recorded (${certs ? "Certifications present" : "No certs"})` : "Education section empty",
    missing: eduScore < 7 ? "Add official certifications, technical accreditations, or continuing education." : undefined,
  });

  // 6. Projects & Publications (8 pts)
  let projScore = 0;
  if (projects.length >= 20) projScore += 4;
  if (projects.length >= 100 || /github|url|live|demo|paper/i.test(projects)) projScore += 4;
  breakdown.push({
    name: "Projects & Technical Artifacts",
    score: projScore,
    max: 8,
    evidence: projects ? `Recorded project accomplishments (${projects.length} chars)` : "No external projects listed",
    missing: projScore < 8 ? "Add key side projects or open source contributions with live links or architecture summaries." : undefined,
  });

  // 7. Recommendations (5 pts)
  let recsScore = 0;
  if (recs.length >= 30) recsScore = 5;
  else if (recs.length > 0) recsScore = 3;
  breakdown.push({
    name: "Peer & Manager Recommendations",
    score: recsScore,
    max: 5,
    evidence: recs ? "Recommendations detected on profile" : "No recommendations present",
    missing: recsScore < 5 ? "Request at least 2 recommendations from engineering peers or technical managers." : undefined,
  });

  // 8. Completeness & Keyword Coverage against JD (15 pts)
  let jdCoverageScore = 0;
  const profileCombinedText = `${headline} ${about} ${exp} ${skillsText}`.toLowerCase();
  const jdImportantKeywords = Array.from(new Set(jdKeywords)).filter(
    (kw) => !["with", "from", "that", "this", "have", "will", "your", "they", "been"].includes(kw)
  );

  let jdHits = 0;
  jdImportantKeywords.slice(0, 30).forEach((kw) => {
    if (profileCombinedText.includes(kw)) jdHits++;
  });

  const jdCoverageRatio = jdImportantKeywords.length > 0 ? jdHits / Math.min(20, jdImportantKeywords.length) : 0.5;
  jdCoverageScore = Math.min(15, Math.round(jdCoverageRatio * 15));

  breakdown.push({
    name: "Target JD Keyword Coverage",
    score: jdCoverageScore,
    max: 15,
    evidence: `Matched ${jdHits} high-signal keywords from target job description across profile sections.`,
    missing: jdCoverageScore < 15 ? "Weave core domain keywords from the target role into your Headline, About, and Experience bullets." : undefined,
  });

  // Calculate Total Score
  const totalScore = breakdown.reduce((sum, b) => sum + b.score, 0);

  // Resume vs LinkedIn Consistency Check
  if (resumeData && (resumeData.skills?.length || resumeData.experience?.length)) {
    // Check skills on resume missing from LinkedIn
    const resumeSkills = (resumeData.skills || []).map((s) => s.toLowerCase());
    const missingOnLinkedIn = resumeSkills.filter((s) => !profileCombinedText.includes(s));

    if (missingOnLinkedIn.length > 3) {
      findings.push({
        severity: "MEDIUM",
        title: "Resume skills missing from LinkedIn",
        detail: `Your resume highlights skills (${missingOnLinkedIn.slice(0, 4).join(", ")}) that are not found anywhere on your LinkedIn profile. Recruiters cross-referencing your profiles may notice the inconsistency.`,
      });
    }

    // Check company consistency
    if (resumeData.experience) {
      resumeData.experience.forEach((e) => {
        if (e.company && !expLower.includes(e.company.toLowerCase())) {
          findings.push({
            severity: "HIGH",
            title: `Company "${e.company}" from Resume missing on LinkedIn`,
            detail: `Your resume lists experience at "${e.company}", but this company was not detected in your LinkedIn experience section.`,
          });
        }
      });
    }
  }

  // Generate Recommendations
  recommendations.push({
    priority: "HIGH",
    title: "Optimize Headline for Recruiter Search Boolean Queries",
    why: "LinkedIn's search algorithm weights Headline terms 3x higher than body copy when generating search candidate previews.",
    how: `Format: [Target Title] | [2-3 Core Tech Specializations] | [Impact/Scale Signal]. Include exact terms matching '${targetRole}'.`,
    example: `${targetRole} | Distributed Systems & High-Throughput APIs | Python · Go · AWS`,
  });

  recommendations.push({
    priority: "HIGH",
    title: "Inject Quantified Metrics into Experience Bullets",
    why: "Recruiters evaluate engineering seniority by outcomes rather than duties.",
    how: "Use the Google XYZ formula: 'Accomplished [X], as measured by [Y], by doing [Z]'. Ensure every role has at least two metrics.",
    example: "Optimized database query latency by 45% (from 420ms to 230ms) by designing Redis read-through caching layer.",
  });

  recommendations.push({
    priority: "MEDIUM",
    title: "Expand About Summary with Technical Story & Contact Details",
    why: "Allows prospective managers to understand your engineering philosophy and provides an immediate path to reach out.",
    how: "Structure into 3 paragraphs: 1. Current focus & passion, 2. Key career achievements with metrics, 3. Open invitation to connect.",
    example: "Passionate about building scalable backend infrastructure. Currently focused on event-driven microservices. Reach out at candidate@email.com.",
  });

  // AI / Rule-based Rewrites (Fact-grounded, placeholders for missing metrics)
  const rewrites = {
    headlineOptions: [
      `${targetRole} | Microservices & Distributed Architecture | Python · TypeScript`,
      `${targetRole} | Building Scalable High-Concurreny Systems | Cloud Native Infrastructure`,
      `Software Engineer (${targetRole}) | API Design · Distributed Databases · Performance Optimization`,
    ],
    aboutDraft: `I am an engineer focused on ${targetRole.toLowerCase()} with a passion for designing reliable, high-performance systems. Over my career, I have architected and deployed services that [add metric, e.g. scaled to 500k+ active users] and improved latency by [add metric, e.g. 35%].\n\nMy core technical foundation spans ${parsedSkillsList.slice(0, 5).join(", ") || "modern backend and cloud systems"}. I thrive in collaborative engineering teams solving complex architectural problems.\n\nAlways open to discussing engineering challenges or new opportunities—feel free to reach out via message or email.`,
    recommendedSkillsToAdd: [
      "Distributed Systems",
      "System Architecture",
      "API Development",
      "Performance Optimization",
      "Cloud Infrastructure",
    ].filter((s) => !parsedSkillsList.includes(s.toLowerCase())),
  };

  return {
    type: "LINKEDIN",
    subject: sections.profileUrl || sections.fullName || "LinkedIn Profile",
    score: totalScore,
    targetRole,
    breakdown,
    findings,
    recommendations,
    rewrites,
    dataSnapshot: {
      headline,
      aboutLength: aboutWords,
      skillsCount: parsedSkillsList.length,
      metricsCount: metricMatches.length,
      hasProjects: projects.length > 0,
      hasRecommendations: recs.length > 0,
    },
    modelUsed: "Rule-Engine v1.0 + Groq Refinement",
    createdAt: new Date().toISOString(),
  };
}
