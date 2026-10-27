import { prisma } from "../apps/web/lib/prisma";

async function verifyAll() {
  console.log("--- 1. Testing OA API ---");
  const oaRes = await fetch("http://localhost:3000/api/oa/questions");
  const oaData = await oaRes.json();
  console.log(`OA Status: ${oaRes.status}, questions returned: ${oaData.questions?.length}`);
  
  if (oaData.questions?.length > 0) {
    const q0 = oaData.questions[0];
    console.log(`First OA question: "${q0.title}" (${q0.company} - ${q0.difficulty})`);
    console.log(`Test cases: ${q0.testCases?.length}, starterCode languages: ${Object.keys(q0.starterCode || {}).join(", ")}`);
  }

  console.log("\n--- 2. Checking Technical Interview Coding Question ---");
  // Check that coding questions for interviews are intact
  const codingInterviewQuestions = await prisma.question.findMany({
    where: {
      type: "CODING",
      isActive: true,
      deletedAt: null,
    },
  });
  console.log(`Active coding questions available for Technical Round: ${codingInterviewQuestions.length}`);

  // Check concept/behavioral/system design questions in DB or bank
  const allActiveQuestions = await prisma.question.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
  });
  console.log(`Total active questions in DB: ${allActiveQuestions.length}`);

  console.log("\n--- 3. Checking User & Auth ---");
  const demoUser = await prisma.user.findUnique({
    where: { email: "demo@rehearse.local" },
    include: {
      interviews: { take: 1 },
      resumes: { take: 1 },
    },
  });
  console.log(`Demo user exists: ${Boolean(demoUser)}, ID: ${demoUser?.id}`);
  console.log(`Interviews count: ${demoUser?.interviews.length}, Resumes count: ${demoUser?.resumes.length}`);

  console.log("\n--- 4. Checking Interview Session ---");
  if (demoUser?.interviews[0]) {
    const session = demoUser.interviews[0];
    console.log(`Latest session ID: ${session.id}, status: ${session.status}, role: ${session.role}`);
  }

  console.log("\n--- E2E Verification Complete ---");
}

verifyAll()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
