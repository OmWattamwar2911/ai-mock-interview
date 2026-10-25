import assert from "node:assert/strict";
import { isPrivateIp, validateSafeUrl } from "./analyzer/ssrf";
import { normalizeGitHubUsername, scoreGitHubProfile, type GitHubCollectedData } from "./analyzer/github";
import { parseLinkedInPdfText, scoreLinkedInProfile, type LinkedInSections } from "./analyzer/linkedin";
import { scoreCodingProfile, CODING_PROVIDERS, type CodingProfileStats } from "./analyzer/coding";
import { auditPortfolioHtml, scorePortfolio } from "./analyzer/portfolio";
import { calculateProfileStrength } from "./analyzer/types";

async function runTests() {
  console.log("Starting Rehearse Analyzer Verification Test Suite...");

  // ── TEST 1: SSRF Guard Security Tests ────────────────────────────────────────
  console.log("\n[Test 1] SSRF Protection & Private IP Filtering");
  assert.equal(isPrivateIp("127.0.0.1"), true, "Should block loopback 127.0.0.1");
  assert.equal(isPrivateIp("127.255.255.255"), true, "Should block loopback range");
  assert.equal(isPrivateIp("10.0.0.1"), true, "Should block 10.0.0.0/8 private range");
  assert.equal(isPrivateIp("10.254.0.1"), true, "Should block 10.x private range");
  assert.equal(isPrivateIp("172.16.0.1"), true, "Should block 172.16.0.0/12 private range");
  assert.equal(isPrivateIp("172.31.255.255"), true, "Should block 172.31.x private range");
  assert.equal(isPrivateIp("192.168.1.1"), true, "Should block 192.168.0.0/16 private range");
  assert.equal(isPrivateIp("169.254.169.254"), true, "Should block AWS/Cloud metadata link-local 169.254.x");
  assert.equal(isPrivateIp("0.0.0.0"), true, "Should block 0.0.0.0/8 current network");
  assert.equal(isPrivateIp("::1"), true, "Should block IPv6 loopback");
  assert.equal(isPrivateIp("fe80::1"), true, "Should block IPv6 link-local");
  assert.equal(isPrivateIp("fc00::1"), true, "Should block IPv6 unique local");

  // Public IPs should be allowed
  assert.equal(isPrivateIp("8.8.8.8"), false, "Should allow public Google DNS IP");
  assert.equal(isPrivateIp("93.184.216.34"), false, "Should allow public Example.com IP");
  assert.equal(isPrivateIp("1.1.1.1"), false, "Should allow public Cloudflare IP");

  // Validate safe URL checks
  const localRes = await validateSafeUrl("http://localhost:3000");
  assert.equal(localRes.safe, false, "Must block localhost URL");

  const privateRes = await validateSafeUrl("http://192.168.1.50/admin");
  assert.equal(privateRes.safe, false, "Must block private IP URL");

  const metadataRes = await validateSafeUrl("http://169.254.169.254/latest/meta-data/");
  assert.equal(metadataRes.safe, false, "Must block cloud metadata endpoint");

  const protoRes = await validateSafeUrl("file:///etc/passwd");
  assert.equal(protoRes.safe, false, "Must block file:// protocol");

  console.log("  ✓ SSRF Guard strictly blocks localhost, 127.0.0.1, 10.x, 169.254.x, and non-http(s) protocols.");

  // ── TEST 2: GitHub URL Normalization & Scoring ────────────────────────────────
  console.log("\n[Test 2] GitHub Username Normalization & Scoring Engine");
  assert.equal(normalizeGitHubUsername("torvalds"), "torvalds");
  assert.equal(normalizeGitHubUsername("@torvalds"), "torvalds");
  assert.equal(normalizeGitHubUsername("https://github.com/torvalds/"), "torvalds");
  assert.equal(normalizeGitHubUsername("http://github.com/shadcn?tab=repositories"), "shadcn");

  const mockGhStrong: GitHubCollectedData = {
    username: "octocat",
    avatarUrl: "https://github.com/images/avatar.png",
    bio: "Senior systems engineer specializing in distributed consensus algorithms",
    location: "San Francisco, CA",
    blog: "https://octocat.dev",
    publicReposCount: 15,
    followers: 120,
    createdAt: "2020-01-01",
    hasProfileReadme: true,
    repos: [
      {
        name: "raft-consensus",
        fullName: "octocat/raft-consensus",
        stars: 45,
        forks: 12,
        isFork: false,
        pushedAt: "2026-10-01",
        size: 1500,
        topics: ["distributed-systems", "consensus"],
        language: "Go",
        license: "MIT",
        hasReadme: true,
        hasTests: true,
        hasCi: true,
        hasDocs: true,
      },
      {
        name: "distributed-kv",
        fullName: "octocat/distributed-kv",
        stars: 20,
        forks: 5,
        isFork: false,
        pushedAt: "2026-09-15",
        size: 800,
        topics: ["storage", "grpc"],
        language: "Go",
        license: "Apache-2.0",
        hasReadme: true,
        hasTests: true,
        hasCi: true,
      },
    ],
    languages: { Go: 2300000, TypeScript: 400000 },
    eventsCount30d: 25,
    lastEventDate: "2026-10-20",
  };

  const ghScoreStrong = scoreGitHubProfile(mockGhStrong, "Senior Go Engineer", "Go, Distributed Systems, High Throughput");
  assert(ghScoreStrong.score >= 80, `Strong profile should score >= 80 (got ${ghScoreStrong.score})`);
  assert(ghScoreStrong.breakdown.length === 6, "Expected 6 breakdown categories");
  assert(ghScoreStrong.recommendations.length > 0, "Expected recommendations");

  const mockGhWeak: GitHubCollectedData = {
    username: "newbie",
    avatarUrl: "https://github.com/identicons/default.png",
    publicReposCount: 1,
    followers: 0,
    createdAt: "2026-09-01",
    hasProfileReadme: false,
    repos: [],
    languages: {},
    eventsCount30d: 0,
  };

  const ghScoreWeak = scoreGitHubProfile(mockGhWeak, "Software Engineer", "");
  assert(ghScoreWeak.score < 40, `Weak profile should score < 40 (got ${ghScoreWeak.score})`);
  assert(ghScoreWeak.findings.some((f) => f.title.includes("test")), "Should flag missing tests");
  console.log(`  ✓ GitHub Scoring verified: Strong=${ghScoreStrong.score}, Weak=${ghScoreWeak.score}.`);

  // ── TEST 3: LinkedIn PDF Parsing & Consistency Scoring ───────────────────────
  console.log("\n[Test 3] LinkedIn PDF Text Parsing & Resume Consistency Check");
  const samplePdfText = `Jane Doe
Senior Fullstack Engineer | Python · TypeScript · AWS
San Francisco, California, United States

Summary
Passionate software engineer with over 6 years of experience building resilient backend systems.
Spearheaded migration to microservices reducing query latency by 45%. Designed high-throughput distributed caching layers.
Open to new technical leadership opportunities - please connect at jane@example.com.

Experience
Acme Corp
Senior Software Engineer
January 2022 - Present
- Architected event-driven microservices processing 15M daily requests with 99.99% uptime.
- Optimized database query latency by 35% through Redis caching and PostgreSQL indexing.
- Engineered automated CI/CD deployment pipelines cutting build times by 50% across 20+ services.
- Led and mentored team of 6 engineers across distributed systems implementations.

Top Skills
Python, TypeScript, PostgreSQL, Docker, AWS, System Design, GraphQL, Redis, Microservices, Kubernetes, Go, Distributed Systems

Education
University of California, Berkeley
Bachelor of Science in Computer Science

Projects
Distributed Consensus Engine
Open-source Raft implementation with live HTTP demo. https://github.com/janedoe/raft

Recommendations
Jane is an exceptional backend architect who consistently delivers high-scale production systems.
`;

  const parsedLinkedIn = parseLinkedInPdfText(samplePdfText);
  assert.equal(parsedLinkedIn.fullName, "Jane Doe", "Parsed name mismatch");
  assert(parsedLinkedIn.headline.includes("Senior Fullstack Engineer"), "Headline parsed incorrectly");
  assert(parsedLinkedIn.about.includes("migration to microservices"), "Summary parsed incorrectly");
  assert(parsedLinkedIn.experience.includes("Acme Corp"), "Experience parsed incorrectly");
  assert(parsedLinkedIn.skills.includes("Python"), "Skills parsed incorrectly");
  assert(parsedLinkedIn.education.includes("Berkeley"), "Education parsed incorrectly");

  // Test consistency check against resume
  const mockResume = {
    skills: ["Python", "TypeScript", "PostgreSQL", "Kafka"],
    experience: [{ company: "Acme Corp", role: "Senior Engineer" }, { company: "OldCorp", role: "Developer" }],
  };

  const liResult = scoreLinkedInProfile(parsedLinkedIn, "Senior Fullstack Engineer", "Python, TypeScript, AWS, PostgreSQL, Microservices", mockResume);
  assert(liResult.score >= 75, `Expected score >= 75 for rich profile (got ${liResult.score})`);
  assert(liResult.breakdown.length === 8, "Expected 8 breakdown categories for LinkedIn");
  assert(liResult.rewrites?.headlineOptions?.length === 3, "Expected 3 headline rewrite alternatives");
  // OldCorp is missing in LinkedIn experience, so should be flagged
  assert(liResult.findings.some((f) => f.title.includes("OldCorp")), "Should detect OldCorp mismatch between resume and LinkedIn");
  console.log(`  ✓ LinkedIn PDF parser & consistency engine verified: Score=${liResult.score}, Mismatches detected.`);

  // ── TEST 4: Coding Profile Scoring & Provider Registry ───────────────────────
  console.log("\n[Test 4] Coding Profile Scoring & Provider Interface");
  assert(CODING_PROVIDERS.leetcode, "LeetCode provider registered");
  assert(CODING_PROVIDERS.codeforces, "Codeforces provider registered");
  assert(CODING_PROVIDERS.leetcode.validate("neetcode_123"), "Should validate valid LeetCode handle");
  assert.equal(CODING_PROVIDERS.leetcode.validate("a"), false, "Should reject handle too short");

  const mockCodingStats: CodingProfileStats = {
    platform: "leetcode",
    handle: "testcoder",
    totalSolved: 280,
    easySolved: 80,
    mediumSolved: 160,
    hardSolved: 40,
    rating: 1820,
    streakDays: 14,
    topicCounts: {
      Arrays: 80,
      Strings: 50,
      Trees: 45,
      DynamicProgramming: 40,
      Graphs: 30,
      Backtracking: 15,
    },
    recentActivityDate: "2026-10-24",
  };

  const codingResult = scoreCodingProfile(mockCodingStats, "Backend Engineer");
  assert(codingResult.score >= 80, `Expected high coding score for 280 solved (got ${codingResult.score})`);
  assert(codingResult.rewrites?.twoWeekPlan?.length === 6, "Expected 2-week plan");
  assert.equal((codingResult.rewrites?.readinessEstimate as any)?.startup, "Ready", "Should be startup ready");
  console.log(`  ✓ Coding scoring verified: Score=${codingResult.score}, OA practice link ready.`);

  // ── TEST 5: Portfolio Audit & Scoring ─────────────────────────────────────────
  console.log("\n[Test 5] Portfolio HTML Audit Engine");
  const samplePortfolioHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Alex Rivera | Senior Backend Engineer</title>
  <meta name="description" content="Portfolio of Alex Rivera, Senior Backend Engineer specializing in scalable distributed microservices, Go, and PostgreSQL.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <header>
    <h1>Alex Rivera</h1>
    <a href="/resume.pdf">Download Resume</a>
  </header>
  <section id="about">
    <h2>About Me</h2>
    <p>I design distributed backend infrastructure and high-throughput APIs.</p>
  </section>
  <section id="projects">
    <h2>Featured Projects</h2>
    <div class="project">
      <h3>Distributed Rate Limiter</h3>
      <p>Problem: Handle 50,000 requests per second. Solution: Leaky bucket algorithm on Redis. Metrics: Zero latency penalty.</p>
      <img src="/arch.png" alt="System Architecture Diagram">
    </div>
  </section>
  <section id="contact">
    <h2>Contact</h2>
    <a href="mailto:alex@example.com">Email Me</a>
  </section>
</body>
</html>`;

  const audit = auditPortfolioHtml("https://alex.dev", "https://alex.dev", samplePortfolioHtml, 200);
  assert.equal(audit.h1Count, 1, "Should detect 1 h1 tag");
  assert.equal(audit.hasViewport, true, "Should detect viewport meta tag");
  assert.equal(audit.hasResumeLink, true, "Should detect resume download link");
  assert.equal(audit.hasAbout, true, "Should detect about section");
  assert.equal(audit.hasProjects, true, "Should detect projects section");
  assert.equal(audit.hasContact, true, "Should detect contact section");
  assert.equal(audit.imagesWithAltCount, 1, "Should detect image alt text");

  const portfolioResult = scorePortfolio(audit, "Backend Engineer", "Go, Redis, Distributed Systems, PostgreSQL");
  assert(portfolioResult.score >= 80, `Expected portfolio score >= 80 (got ${portfolioResult.score})`);
  console.log(`  ✓ Portfolio audit verified: Score=${portfolioResult.score}, All core sections detected.`);

  // ── TEST 6: Unified Profile Strength Calculation ─────────────────────────────
  console.log("\n[Test 6] Unified Profile Strength Normalization");
  // Test with 2 completed analyzers: Resume (80, weight 35) and GitHub (90, weight 25)
  // Sum weights = 60. Weighted sum = 80*35 + 90*25 = 2800 + 2250 = 5050.
  // Expected = 5050 / 60 = 84.16 -> 84.
  const strength2 = calculateProfileStrength({
    RESUME: { score: 80, subject: "resume.pdf", date: "2026-10-25" },
    GITHUB: { score: 90, subject: "octocat", date: "2026-10-25" },
  });

  assert.equal(strength2.completedCount, 2, "Expected 2 completed analyzers");
  assert.equal(strength2.overallScore, 84, "Expected renormalized score of 84");
  assert.equal(strength2.scores.LINKEDIN, null, "Unanalyzed LinkedIn should be null");

  // Test empty state
  const strengthEmpty = calculateProfileStrength({});
  assert.equal(strengthEmpty.completedCount, 0);
  assert.equal(strengthEmpty.overallScore, null, "Empty strength should be null");
  console.log("  ✓ Profile Strength calculation correctly renormalizes weights and never invents unanalyzed scores.");

  console.log("\n🎉 ALL ANALYZER VERIFICATION TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
