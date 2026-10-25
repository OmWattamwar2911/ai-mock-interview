import { safeFetchHtml } from "./ssrf";
import type {
  UnifiedAnalyzerResult,
  AnalyzerScoreBreakdown,
  AnalyzerFinding,
  AnalyzerRecommendation,
} from "./types";

export interface PortfolioAuditData {
  url: string;
  finalUrl: string;
  statusCode: number;
  htmlSize: number;
  title?: string;
  metaDescription?: string;
  hasViewport: boolean;
  hasLang: boolean;
  h1Count: number;
  headings: string[];
  hasAbout: boolean;
  hasProjects: boolean;
  hasContact: boolean;
  hasResumeLink: boolean;
  imagesCount: number;
  imagesWithAltCount: number;
  caseStudySignalsCount: number;
  detectedKeywords: string[];
}

/**
 * Parses and audits raw HTML of a portfolio page.
 */
export function auditPortfolioHtml(url: string, finalUrl: string, html: string, statusCode: number): PortfolioAuditData {
  const htmlLower = html.toLowerCase();

  // 1. Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : undefined;

  // 2. Meta Description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDescription = descMatch ? descMatch[1].trim() : undefined;

  // 3. Viewport tag
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);

  // 4. Lang attribute on html
  const hasLang = /<html[^>]*lang=["'][a-zA-Z-]+["']/i.test(html);

  // 5. Headings
  const h1Matches = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || [];
  const h1Count = h1Matches.length;

  const allHeadingMatches = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi) || [];
  const headings = allHeadingMatches.slice(0, 10).map((h) => h.replace(/<[^>]+>/g, "").trim()).filter(Boolean);

  // 6. Section detection (text & IDs)
  const hasAbout = /id=["'][^"']*about[^"']*["']/i.test(html) ||
                   /<h[1-3][^>]*>[^<]*about[^<]*<\/h[1-3]>/i.test(html) ||
                   htmlLower.includes("about me") || htmlLower.includes("who i am");

  const hasProjects = /id=["'][^"']*(project|work|portfolio)[^"']*["']/i.test(html) ||
                      /<h[1-3][^>]*>[^<]*(project|work|featured)[^<]*<\/h[1-3]>/i.test(html) ||
                      htmlLower.includes("featured projects") || htmlLower.includes("selected works");

  const hasContact = /id=["'][^"']*contact[^"']*["']/i.test(html) ||
                     htmlLower.includes("mailto:") || htmlLower.includes("contact me") ||
                     htmlLower.includes("get in touch");

  const hasResumeLink = /href=["'][^"']*(resume|cv)[^"']*\.pdf["']/i.test(html) ||
                        /href=["'][^"']*(resume|cv)["']/i.test(html) ||
                        htmlLower.includes("download resume") || htmlLower.includes("view resume");

  // 7. Images & Alt
  const imgMatches = html.match(/<img[^>]+>/gi) || [];
  const imagesCount = imgMatches.length;
  let imagesWithAltCount = 0;
  imgMatches.forEach((img) => {
    if (/alt=["'][^"']+["']/i.test(img)) {
      imagesWithAltCount++;
    }
  });

  // 8. Case Study Signals (problem, architecture, metrics, outcome)
  const caseStudyTerms = ["architecture", "scale", "problem", "solution", "outcome", "metrics", "latency", "tech stack", "database"];
  let caseStudySignalsCount = 0;
  caseStudyTerms.forEach((term) => {
    if (htmlLower.includes(term)) caseStudySignalsCount++;
  });

  // 9. Detected Tech Keywords
  const techKeywords = ["react", "typescript", "python", "node", "aws", "docker", "graphql", "postgres", "next.js", "go", "kubernetes"];
  const detectedKeywords = techKeywords.filter((k) => htmlLower.includes(k));

  return {
    url,
    finalUrl,
    statusCode,
    htmlSize: html.length,
    title,
    metaDescription,
    hasViewport,
    hasLang,
    h1Count,
    headings,
    hasAbout,
    hasProjects,
    hasContact,
    hasResumeLink,
    imagesCount,
    imagesWithAltCount,
    caseStudySignalsCount,
    detectedKeywords,
  };
}

/**
 * Deterministic rule-based scoring (100 points total) for Portfolio websites.
 */
export function scorePortfolio(
  audit: PortfolioAuditData,
  targetRole: string = "Software Engineer",
  targetJdText: string = ""
): UnifiedAnalyzerResult {
  const breakdown: AnalyzerScoreBreakdown[] = [];
  const findings: AnalyzerFinding[] = [];
  const recommendations: AnalyzerRecommendation[] = [];

  // 1. Title and Meta Description (15 pts)
  let metaScore = 0;
  if (audit.title && audit.title.length >= 8) metaScore += 7;
  if (audit.metaDescription && audit.metaDescription.length >= 30) metaScore += 8;

  breakdown.push({
    name: "Search Metadata & Open Graph Titles",
    score: metaScore,
    max: 15,
    evidence: `Title: "${audit.title || "Missing"}", Description: "${audit.metaDescription ? audit.metaDescription.slice(0, 50) + "..." : "Missing"}"`,
    missing: metaScore < 15 ? "Provide an informative <title> tag with your name and role, and a <meta name='description'> (120-160 characters) summarizing your engineering focus." : undefined,
  });

  if (!audit.metaDescription) {
    findings.push({
      severity: "MEDIUM",
      title: "Missing meta description",
      detail: "When sharing your portfolio link on LinkedIn, Twitter, or in emails, link preview scrapers rely on the meta description.",
    });
  }

  // 2. Semantic Structure & Headings Hierarchy (15 pts)
  let headingScore = 0;
  if (audit.h1Count === 1) headingScore += 8;
  else if (audit.h1Count > 1) headingScore += 4; // Multiple H1s are less standard
  if (audit.headings.length >= 3) headingScore += 7;

  breakdown.push({
    name: "Semantic Structure & Heading Hierarchy",
    score: headingScore,
    max: 15,
    evidence: `Detected ${audit.h1Count} <h1> tag(s) and ${audit.headings.length} subheadings.`,
    missing: headingScore < 15 ? "Use exactly one primary <h1> tag for your headline, and structure content logically with <h2> and <h3> tags." : undefined,
  });

  // 3. Core Sections Presence (20 pts)
  let sectionsScore = 0;
  if (audit.hasAbout) sectionsScore += 5;
  if (audit.hasProjects) sectionsScore += 6;
  if (audit.hasContact) sectionsScore += 5;
  if (audit.hasResumeLink) sectionsScore += 4;

  breakdown.push({
    name: "Core Portfolio Architecture",
    score: sectionsScore,
    max: 20,
    evidence: `About: ${audit.hasAbout ? "Yes" : "No"}, Projects: ${audit.hasProjects ? "Yes" : "No"}, Contact: ${audit.hasContact ? "Yes" : "No"}, Resume PDF: ${audit.hasResumeLink ? "Yes" : "No"}`,
    missing: sectionsScore < 20 ? "Ensure your portfolio clearly links to your downloadable Resume PDF, About section, Contact details, and Featured Projects." : undefined,
  });

  if (!audit.hasResumeLink) {
    findings.push({
      severity: "HIGH",
      title: "No direct Resume link or PDF download found",
      detail: "Recruiters visiting a portfolio want to immediately download your one-page resume. Place a 'Download Resume' button prominently in your navigation.",
    });
  }

  // 4. Project Case Studies & Technical Depth (20 pts)
  let caseStudyScore = 0;
  if (audit.caseStudySignalsCount >= 2) caseStudyScore += 8;
  if (audit.caseStudySignalsCount >= 4) caseStudyScore += 7;
  if (audit.caseStudySignalsCount >= 6) caseStudyScore += 5;

  breakdown.push({
    name: "Engineering Case Study Depth",
    score: Math.min(20, caseStudyScore),
    max: 20,
    evidence: `Detected ${audit.caseStudySignalsCount} architectural signals (problem, scale, architecture, tech stack, metrics).`,
    missing: caseStudyScore < 20 ? "Frame projects as engineering case studies: Problem Statement -> Architecture & Tech Choices -> Quantified Outcome/Metrics." : undefined,
  });

  // 5. Mobile Viewport & Responsiveness (10 pts)
  let responsiveScore = 0;
  if (audit.hasViewport) responsiveScore += 6;
  if (audit.htmlSize < 500 * 1024) responsiveScore += 4; // Under 500KB HTML payload

  breakdown.push({
    name: "Mobile Viewport & Performance Hygiene",
    score: responsiveScore,
    max: 10,
    evidence: `Viewport tag: ${audit.hasViewport ? "Present" : "Missing"}, Initial payload size: ${Math.round(audit.htmlSize / 1024)} KB`,
    missing: responsiveScore < 10 ? "Add <meta name='viewport' content='width=device-width, initial-scale=1'> to support mobile recruiting screens." : undefined,
  });

  // 6. Accessibility Basics (10 pts)
  let a11yScore = 0;
  if (audit.hasLang) a11yScore += 5;
  if (audit.imagesCount === 0 || audit.imagesWithAltCount >= Math.floor(audit.imagesCount * 0.7)) {
    a11yScore += 5;
  }

  breakdown.push({
    name: "Web Accessibility (a11y) Baseline",
    score: a11yScore,
    max: 10,
    evidence: `Lang attribute: ${audit.hasLang ? "Yes" : "Missing"}, Image Alt coverage: ${audit.imagesWithAltCount}/${audit.imagesCount} images.`,
    missing: a11yScore < 10 ? "Set <html lang='en'> and ensure all screenshots/images have descriptive alt text attributes." : undefined,
  });

  // 7. Keyword Match to Target Role & JD (10 pts)
  let kwScore = 0;
  const jdKeywords = targetJdText.toLowerCase().split(/[\s,.;()]+/).filter((w) => w.length > 3);
  const matchedJdWords = audit.detectedKeywords.filter((k) => jdKeywords.includes(k) || targetRole.toLowerCase().includes(k));

  if (matchedJdWords.length >= 1) kwScore += 4;
  if (matchedJdWords.length >= 3) kwScore += 3;
  if (audit.detectedKeywords.length >= 4) kwScore += 3;

  breakdown.push({
    name: "Target Role & Tech Alignment",
    score: Math.min(10, kwScore),
    max: 10,
    evidence: `Identified technologies: [${audit.detectedKeywords.join(", ") || "None"}]. Matched to role: [${matchedJdWords.join(", ") || "None"}].`,
    missing: kwScore < 10 ? `Mention technologies aligned with '${targetRole}' on your homepage skills and project tags.` : undefined,
  });

  const totalScore = breakdown.reduce((sum, b) => sum + b.score, 0);

  // Recommendations
  recommendations.push({
    priority: "HIGH",
    title: "Add Prominent 'Download Resume' Button in Header",
    why: "Technical recruiters visit portfolios primarily to view live projects and instantly grab the resume PDF.",
    how: "Place a primary action button in the top right navigation linking to a hosted `/resume.pdf` file.",
  });

  recommendations.push({
    priority: "HIGH",
    title: "Structure Projects with the Problem-Solution-Result Framework",
    why: "Demonstrating WHY you made certain technical architecture choices separates senior engineers from tutorial copycats.",
    how: "Under each project card, add 3 concise bullet points: 1. The core technical problem, 2. Key system design decisions, 3. Measurable outcome.",
    example: "Challenge: High write concurrency. Design: RabbitMQ queue with Go worker pool. Result: 2,500 RPS with zero dropped events.",
  });

  recommendations.push({
    priority: "MEDIUM",
    title: "Configure OpenGraph & Twitter Social Cards",
    why: "Ensure that links shared on LinkedIn, Discord, or Slack show a polished card with your portrait, title, and site description.",
    how: "Add `<meta property='og:title'>`, `<meta property='og:image'>`, and `<meta property='og:description'>` to the `<head>` section.",
  });

  return {
    type: "PORTFOLIO",
    subject: audit.url,
    score: totalScore,
    targetRole,
    breakdown,
    findings,
    recommendations,
    rewrites: {
      metaTagsSnippet: `<title>${audit.title || "Your Name | " + targetRole}</title>\n<meta name="description" content="${audit.metaDescription || "Portfolio of " + targetRole + " specializing in distributed systems and cloud architecture."}">\n<meta property="og:title" content="${audit.title || targetRole}">\n<meta property="og:image" content="${audit.url}/og-preview.png">`,
    },
    dataSnapshot: {
      url: audit.url,
      finalUrl: audit.finalUrl,
      title: audit.title,
      metaDescription: audit.metaDescription,
      hasAbout: audit.hasAbout,
      hasProjects: audit.hasProjects,
      hasContact: audit.hasContact,
      hasResumeLink: audit.hasResumeLink,
      detectedKeywords: audit.detectedKeywords,
    },
    modelUsed: "Rule-Engine v1.0",
    createdAt: new Date().toISOString(),
  };
}

/**
 * End-to-end safe portfolio audit runner with SSRF guard.
 */
export async function auditAndScorePortfolio(url: string, targetRole: string, targetJdText: string): Promise<UnifiedAnalyzerResult> {
  const { html, status, finalUrl } = await safeFetchHtml(url);
  const audit = auditPortfolioHtml(url, finalUrl, html, status);
  return scorePortfolio(audit, targetRole, targetJdText);
}
