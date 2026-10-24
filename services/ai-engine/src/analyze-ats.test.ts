import assert from "node:assert";
import { analyzeResumeAts } from "./analyze-ats.js";
import type { ResumeParsed } from "@rehearse/shared";

async function testAnalyzeResumeAts() {
  console.log("Running ATS Analyzer verification test...");

  const mockResumeText = `
Alex Mercer
alex.mercer@example.com | (555) 123-4567 | linkedin.com/in/alexmercer

Professional Summary
Experienced Software Engineer with 5+ years of building web services and cloud backends.

Skills
JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, Git

Work Experience
Senior Software Engineer - CloudScale Systems (2022 - Present)
• Built scalable microservices using Node.js and TypeScript, handling over 50,000 daily requests.
• Designed PostgreSQL database schemas and optimized slow queries, reducing page load latency by 35%.
• Spearheaded migration to containerized infrastructure using Docker.

Software Engineer - TechCorp (2020 - 2022)
• Developed responsive user interfaces with React and Next.js.
• Integrated RESTful APIs and wrote comprehensive unit tests with 90% code coverage.

Education
B.S. in Computer Science - University of Washington (2020)

Projects
Mock Interview Platform: Full-stack application built with Next.js, PostgreSQL, and WebRTC.
`;

  const mockParsedResume: ResumeParsed = {
    summary: "Experienced Software Engineer with 5+ years of building web services and cloud backends.",
    skills: ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "Git"],
    experience: [
      {
        company: "CloudScale Systems",
        title: "Senior Software Engineer",
        bullets: [
          "Built scalable microservices using Node.js and TypeScript, handling over 50,000 daily requests.",
          "Designed PostgreSQL database schemas and optimized slow queries, reducing page load latency by 35%.",
          "Spearheaded migration to containerized infrastructure using Docker.",
        ],
      },
      {
        company: "TechCorp",
        title: "Software Engineer",
        bullets: [
          "Developed responsive user interfaces with React and Next.js.",
          "Integrated RESTful APIs and wrote comprehensive unit tests with 90% code coverage.",
        ],
      },
    ],
    education: [
      {
        school: "University of Washington",
        degree: "B.S. in Computer Science",
        year: "2020",
      },
    ],
    projects: [
      {
        name: "Mock Interview Platform",
        summary: "Full-stack application built with Next.js, PostgreSQL, and WebRTC.",
        skills: ["Next.js", "PostgreSQL", "WebRTC"],
      },
    ],
  };

  const jobRole = "Senior Backend Engineer";
  const jobDescription = `
We are looking for a Senior Backend Engineer to join our platform team.
Requirements:
- 4+ years of professional experience with Node.js and TypeScript
- Strong knowledge of PostgreSQL, database schema design, and query optimization
- Hands-on experience with Docker, Kubernetes, and AWS cloud infrastructure
- Familiarity with Redis caching and Kafka event streaming
- Excellent communication and agile collaboration skills
`;

  // Test deterministic fallback (null LLM)
  const result = await analyzeResumeAts(mockResumeText, mockParsedResume, jobRole, jobDescription, null);

  console.log("Overall ATS Score:", result.overallAtsScore);
  console.log("Formula:", result.breakdown.calculationFormula);
  console.log("Matched Keywords:", result.matchedKeywords);
  console.log("Missing Keywords:", result.missingKeywords);
  console.log("Section Feedback Keys:", Object.keys(result.sectionFeedback));
  console.log("Rewrite Suggestions Count:", result.rewriteSuggestions.length);

  // Assertions
  assert(result.overallAtsScore >= 0 && result.overallAtsScore <= 100, "ATS score must be between 0 and 100");
  assert(result.breakdown.keywordMatch.score >= 0, "Keyword score exists");
  assert(result.breakdown.formatting.score >= 0, "Formatting score exists");
  assert(result.breakdown.sectionCompleteness.score >= 0, "Completeness score exists");
  assert(result.breakdown.llmJudgement.score >= 0, "Judgement score exists");
  assert(result.matchedKeywords.length > 0, "Should have matched keywords");
  assert(result.missingKeywords.length > 0, "Should have identified missing keywords (e.g. Kubernetes, Redis, Kafka, AWS)");
  assert(result.rewriteSuggestions.length >= 2, "Should provide concrete rewrite suggestions");
  assert(result.sectionFeedback.experience, "Must have experience section feedback");
  assert(result.sectionFeedback.summary, "Must have summary section feedback");

  // Verify formula correctness
  const expectedComputed = Math.round(
    0.4 * result.breakdown.keywordMatch.score +
    0.2 * result.breakdown.formatting.score +
    0.2 * result.breakdown.sectionCompleteness.score +
    0.2 * result.breakdown.llmJudgement.score
  );
  assert.strictEqual(result.overallAtsScore, expectedComputed, "Overall ATS score must strictly equal the weighted breakdown");

  console.log("✅ All ATS Analyzer tests passed successfully!");
}

testAnalyzeResumeAts().catch((err) => {
  console.error("❌ ATS Analyzer test failed:", err);
  process.exit(1);
});
