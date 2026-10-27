import { prisma } from "../apps/web/lib/prisma";
import bcrypt from "bcryptjs";
import { evaluateSession } from "../apps/web/lib/evaluation";
import { safeEncrypt } from "../apps/web/lib/crypto";

async function main() {
  const isForce = process.argv.includes("--force-demo");
  const isProd = process.env.NODE_ENV === "production";
  const dbUrl = process.env.DATABASE_URL || "";

  if (isProd && !isForce) {
    console.error("ERROR: Refusing to seed demo data in production environment without --force-demo");
    process.exit(1);
  }

  if (!dbUrl.includes("localhost") && !dbUrl.includes("127.0.0.1") && !isForce) {
    console.warn("WARNING: DATABASE_URL does not point to localhost. Use --force-demo to proceed.");
  }

  console.log("🌱 Seeding realistic, fictional demo candidate data...");

  // 1. Create or update Demo User
  const passwordHash = await bcrypt.hash("demo12345", 10);
  const demoEmail = "demo@rehearse.app";

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    create: {
      email: demoEmail,
      name: "Demo Candidate",
      passwordHash: passwordHash,
      role: "CANDIDATE",
    },
    update: {
      name: "Demo Candidate",
      passwordHash: passwordHash,
    },
  });

  console.log(`✓ User verified: ${user.name} (${user.email})`);

  // Clean prior demo session artifacts for idempotency
  await prisma.interviewSession.deleteMany({ where: { userId: user.id } });
  await prisma.resume.deleteMany({ where: { userId: user.id } });
  await prisma.jobDescription.deleteMany({ where: { userId: user.id } });
  await prisma.oaSubmission.deleteMany({ where: { userId: user.id } });
  await prisma.analyzerResult.deleteMany({ where: { userId: user.id } });

  // 2. Create Fictional Target Job Description (Senior Backend Engineer)
  const jdRaw = `Senior Distributed Systems Engineer at Acme Cloud Systems (Fictional).
We are looking for a backend engineer experienced in Golang, Python, PostgreSQL, Redis, Kubernetes, Distributed Systems, and Microservices Architecture.
Responsibilities:
- Build low-latency financial ledger APIs and idempotency layers
- Maintain high-availability PostgreSQL clusters and handle multi-datacenter data replication
- Optimize gRPC service communication and message queuing pipelines`;

  const jd = await prisma.jobDescription.create({
    data: {
      userId: user.id,
      title: "Senior Distributed Systems Engineer",
      encryptedText: safeEncrypt(jdRaw),
      parsed: {
        title: "Senior Distributed Systems Engineer",
        requiredSkills: [
          "Distributed Systems",
          "PostgreSQL",
          "Golang",
          "Python",
          "Kubernetes",
          "Microservices",
        ],
        preferredSkills: ["Redis", "gRPC", "Kafka", "Observability"],
        seniority: "Senior",
        responsibilities: [
          "Architect low-latency distributed APIs",
          "Maintain high-availability PostgreSQL clusters",
          "Optimize gRPC inter-service communication",
        ],
      },
    },
  });

  // 3. Create Fictional Resume
  const resumeRaw = `Demo Candidate - Backend & Cloud Systems Engineer
Experience:
Senior Software Engineer at Horizon Payments (Fictional) (2022 - Present)
- Led migration of transaction settlement service from Ruby to Go, reducing p99 latency from 240ms to 42ms.
- Implemented transactional outbox pattern with PostgreSQL and Kafka, guaranteeing zero duplicate payment events across 5M daily requests.
- Optimized database query indexes and connection pooling via PgBouncer, saving 35% CPU on primary database nodes.

Software Engineer at CloudScale Labs (Fictional) (2020 - 2022)
- Built Python and Flask microservices for real-time asset telemetry processing.
- Containerized workloads on Kubernetes and established CI/CD pipelines with automated test suites.`;

  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      fileName: "demo_candidate_resume.pdf",
      fileType: "application/pdf",
      encryptedText: safeEncrypt(resumeRaw),
      parsed: {
        name: "Demo Candidate",
        skills: [
          "PostgreSQL",
          "Python",
          "Golang",
          "Docker",
          "Kubernetes",
          "APIs",
          "Distributed Systems",
          "Redis",
          "System Architecture",
        ],
        yearsOfExperience: 4,
        experience: [
          {
            company: "Horizon Payments (Fictional)",
            title: "Senior Software Engineer",
            bullets: [
              "Led migration of core transaction service to Go, reducing p99 latency by 80%",
              "Implemented transactional outbox pattern with PostgreSQL guaranteeing consistency",
            ],
          },
        ],
      },
    },
  });

  // 4. Calculate Skill Gap Insights
  const skillGapData = {
    matchScore: 82,
    matched: [
      { name: "PostgreSQL", category: "Database" },
      { name: "Python", category: "Language" },
      { name: "Golang", category: "Language" },
      { name: "Kubernetes", category: "DevOps" },
      { name: "Distributed Systems", category: "Architecture" },
    ],
    partial: [
      { name: "Microservices", reason: "Demonstrated modular service development; expand on service mesh & discovery" },
    ],
    missing: [
      { name: "Kafka", reason: "Required for event streaming and distributed outbox queues" },
      { name: "gRPC", reason: "Inter-service communication standard specified in job description" },
    ],
    recommendations: [
      "Deepen discussion around Kafka partition rebalancing and consumer offset lag",
      "Highlight distributed database transaction isolation levels in live coding rounds",
    ],
  };

  // 5. Seed 5 Realistic Sessions (Strong, Medium-High, Medium, Weak, Partial)
  const sessionConfigs = [
    {
      title: "Strong Technical & Architecture Interview",
      status: "COMPLETED",
      endReason: "completed",
      daysAgo: 1,
      targetRole: "Senior Distributed Systems Engineer",
      transcript: [
        { role: "assistant", phase: "INTRODUCTION", text: "Hello! Welcome to your technical interview for Senior Distributed Systems Engineer. To start off, could you walk me through your background and the distributed architectures you've built?" },
        { role: "user", phase: "INTRODUCTION", text: "Hi Aria, excited to be here. Over the past four years I've specialized in backend infrastructure and high-throughput financial distributed systems. At Horizon Payments, I architected our distributed transaction settlement ledger in Go and PostgreSQL, reducing our p99 latencies by over 80 percent." },
        { role: "assistant", phase: "RESUME_JD", text: "That is a significant latency reduction. When designing that ledger service, how did you guarantee data consistency and avoid double-spending during network partitions?" },
        { role: "user", phase: "RESUME_JD", text: "We implemented two-phase commit combined with an idempotent transactional outbox pattern. Every incoming charge request required an idempotency key hashed in Redis with a short lease, and ledger updates executed in PostgreSQL with strict serializable isolation and explicit row-level locks on user account balances." },
        { role: "assistant", phase: "TECHNICAL_CODING", text: "Excellent architectural breakdown. Let's look at algorithmic problem solving. In the editor, implement a function to find the maximum sub-array sum with contiguous elements in O(n) time." },
        { role: "user", phase: "TECHNICAL_CODING", text: "I can solve this using Kadane's algorithm. We iterate through the array maintaining a running current sum and a global maximum, resetting the current sum whenever it drops below zero." },
        { role: "assistant", phase: "BEHAVIOURAL", text: "Your solution passed all test suites efficiently. Tell me about a time when an architectural dispute arose on your team and how you resolved it." },
        { role: "user", phase: "BEHAVIOURAL", text: "In our payment processing rebuild, half the team wanted to adopt a complex distributed event mesh immediately, while others preferred keeping a modular monolith. I proposed running a two-week spike with measurable throughput and latency benchmarks. The spike proved that the modular monolith gave us the required p99 SLA with half the operational overhead, so the team aligned behind that data-driven decision." },
      ],
      activeCode: {
        sourceCode: `function maxSubArray(nums: number[]): number {
  let maxSum = nums[0];
  let currentSum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}`,
      },
      testResults: { totalRuns: 2, passedCount: 4, totalCount: 4 },
    },
    {
      title: "Solid System Design & Database Scaling",
      status: "COMPLETED",
      endReason: "completed",
      daysAgo: 5,
      targetRole: "Backend Infrastructure Engineer",
      transcript: [
        { role: "assistant", phase: "INTRODUCTION", text: "Welcome! Tell me about the core database technologies you use daily." },
        { role: "user", phase: "INTRODUCTION", text: "I work primarily with PostgreSQL, Redis, and connection poolers like PgBouncer in multi-tenant cloud environments." },
        { role: "assistant", phase: "RESUME_JD", text: "How do you diagnose and resolve database locking and connection saturation when traffic spikes 10x?" },
        { role: "user", phase: "RESUME_JD", text: "We inspect pg_stat_activity to detect long-running transactions and lock contention. Then we introduce PgBouncer transaction pooling and ensure critical read queries hit read replicas." },
        { role: "assistant", phase: "TECHNICAL_CODING", text: "Let us implement an LRU Cache with O(1) get and put operations." },
        { role: "user", phase: "TECHNICAL_CODING", text: "I will use a doubly linked list coupled with a hash map so we can achieve constant time evictions and lookups." },
        { role: "assistant", phase: "BEHAVIOURAL", text: "Describe how you prioritize technical debt against urgent feature deadlines." },
        { role: "user", phase: "BEHAVIOURAL", text: "I quantify technical debt in terms of incident risk and developer velocity. When our build times ballooned to 25 minutes, I demonstrated to leadership that fixing our caching and docker layering would recover 10 engineering hours weekly." },
      ],
      activeCode: { sourceCode: `class LRUCache { /* implementation */ }` },
      testResults: { totalRuns: 3, passedCount: 4, totalCount: 4 },
    },
    {
      title: "Fullstack Architecture & API Integration",
      status: "COMPLETED",
      endReason: "completed",
      daysAgo: 12,
      targetRole: "Full Stack Platform Engineer",
      transcript: [
        { role: "assistant", phase: "INTRODUCTION", text: "Hi there! What kind of applications have you designed recently?" },
        { role: "user", phase: "INTRODUCTION", text: "I've been building scalable REST and GraphQL APIs with Node.js and TypeScript connected to PostgreSQL." },
        { role: "assistant", phase: "RESUME_JD", text: "How do you structure API error handling and validation across microservices?" },
        { role: "user", phase: "RESUME_JD", text: "We use Zod schemas at API boundaries for strict runtime contract validation and map domain errors into standardized HTTP problem details." },
        { role: "assistant", phase: "TECHNICAL_CODING", text: "Please implement a function to validate balanced parentheses and brackets in a string." },
        { role: "user", phase: "TECHNICAL_CODING", text: "A stack data structure is ideal here: push opening brackets and pop matching pairs as we traverse." },
      ],
      activeCode: { sourceCode: `function isValid(s: string): boolean { return true; }` },
      testResults: { totalRuns: 1, passedCount: 3, totalCount: 4 },
    },
    {
      title: "Foundational Algorithms & Practice Round",
      status: "COMPLETED",
      endReason: "completed",
      daysAgo: 18,
      targetRole: "Junior to Mid Software Engineer",
      transcript: [
        { role: "assistant", phase: "INTRODUCTION", text: "Welcome! What programming languages are you most comfortable coding in?" },
        { role: "user", phase: "INTRODUCTION", text: "I am comfortable with Python and JavaScript for backend scripting." },
        { role: "assistant", phase: "RESUME_JD", text: "Tell me about a bug you encountered that took hours to debug." },
        { role: "user", phase: "RESUME_JD", text: "I had a race condition in a script where multiple async calls were updating an in-memory dictionary without synchronization." },
        { role: "assistant", phase: "TECHNICAL_CODING", text: "Implement two sum: find indices of two numbers that add up to target." },
        { role: "user", phase: "TECHNICAL_CODING", text: "I can check every pair with nested loops, which takes O(n squared) time." },
      ],
      activeCode: { sourceCode: `function twoSum() { /* basic solution */ }` },
      testResults: { totalRuns: 2, passedCount: 1, totalCount: 4 },
    },
    {
      title: "Early Ended / Partial Interview",
      status: "COMPLETED",
      endReason: "user_exit",
      daysAgo: 22,
      targetRole: "Senior Systems Engineer",
      transcript: [
        { role: "assistant", phase: "GREETING", text: "Hi! Welcome to Rehearse. Are you ready to begin your mock rehearsal?" },
        { role: "user", phase: "GREETING", text: "Yes Aria, I am ready." },
      ],
      activeCode: null,
      testResults: null,
    },
  ];

  console.log("✓ Creating realistic interview sessions and running evidence scoring...");

  const createdSessionIds: string[] = [];

  for (const cfg of sessionConfigs) {
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - cfg.daysAgo);

    const session = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        resumeId: resume.id,
        jdId: jd.id,
        status: cfg.status as any,
        endReason: cfg.endReason,
        candidateDisplayName: "Demo Candidate",
        transcript: cfg.transcript as any,
        activeCode: cfg.activeCode as any,
        config: { targetRole: cfg.targetRole, durationMin: 20 },
        skillGap: skillGapData as any,
        botSummary: {
          testResults: cfg.testResults,
        } as any,
        createdAt: createdDate,
        endedAt: createdDate,
      },
    });

    createdSessionIds.push(session.id);
    // Run the real evidence-based evaluation pipeline!
    await evaluateSession(session.id, true);
    console.log(`  ✓ Evaluated session: ${cfg.title} (ID: ${session.id})`);
  }

  // 6. Seed OA Practice Submissions
  const questions = await prisma.question.findMany({ take: 3 });
  if (questions.length > 0) {
    await prisma.oaSubmission.create({
      data: {
        userId: user.id,
        questionId: questions[0].id,
        language: "typescript",
        sourceCode: `// Optimal reference solution\nfunction solve() { return true; }`,
        testResults: { passed: 4, total: 4, runtimeMs: 18 },
        passedCount: 4,
        totalCount: 4,
        score: 100,
        status: "ACCEPTED",
      },
    });
    console.log("✓ Seeded OA Practice submissions");
  }

  // 7. Seed Analyzer Results (ATS, GitHub, Coding, Portfolio)
  await prisma.analyzerResult.createMany({
    data: [
      {
        userId: user.id,
        type: "RESUME",
        subject: "demo_candidate_resume.pdf",
        targetRole: "Senior Distributed Systems Engineer",
        score: 84.5,
        resultJson: {
          strengths: ["Strong quantitative impact metrics", "Clean standard sections", "Consistent chronological format"],
          weaknesses: ["Add metrics for cloud hosting cost optimizations", "List explicit distributed database versions"],
          keywordMatchPct: 86,
        },
      },
      {
        userId: user.id,
        type: "GITHUB",
        subject: "github.com/democandidate-fictional",
        targetRole: "Distributed Systems Engineer",
        score: 88.0,
        resultJson: {
          metrics: { publicRepos: 18, totalStars: 142, recentCommits: 230 },
          highlights: ["Active commit frequency", "Well-documented READMEs", "Continuous integration workflows configured"],
        },
      },
      {
        userId: user.id,
        type: "CODING",
        subject: "leetcode.com/democandidate-fictional",
        targetRole: "Software Engineer",
        score: 79.0,
        resultJson: {
          metrics: { solvedTotal: 340, easy: 110, medium: 180, hard: 50 },
          consistency: "Strong consistency across dynamic programming and graph traversals",
        },
      },
    ],
  });

  console.log("✓ Seeded candidate analyzer historical benchmarks");
  console.log("\n========================================================");
  console.log("🎉 Demo Seeding Completed Successfully!");
  console.log("Demo Credentials: demo@rehearse.app / demo12345");
  console.log(`Strong Session ID:  ${createdSessionIds[0]}`);
  console.log(`Partial Session ID: ${createdSessionIds[4]}`);
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
