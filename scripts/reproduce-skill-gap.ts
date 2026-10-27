import { prisma } from "../apps/web/lib/prisma";
import { resumeParsedSchema, jdParsedSchema } from "@rehearse/shared";

async function reproduce() {
  console.log("=== STEP 1: Reproducing Skill Gap Execution ===");
  
  // Find a user with both resume and JD
  const user = await prisma.user.findFirst({
    where: {
      resumes: { some: {} },
      jobDescs: { some: {} },
    },
    include: {
      resumes: true,
      jobDescs: true,
    },
  });

  if (!user) {
    console.error("No user found with resume and JD!");
    return;
  }

  console.log(`Using user: ${user.email} (${user.id})`);
  const resume = user.resumes[0];
  const jd = user.jobDescs[0];
  console.log(`Resume ID: ${resume.id}, fileName: ${resume.fileName}`);
  console.log(`JD ID: ${jd.id}, title: ${jd.title}`);

  // Hop 1: Validate DB records with schemas
  console.log("\n[Hop 1] Parsing resume.parsed with resumeParsedSchema...");
  let parsedResume;
  try {
    parsedResume = resumeParsedSchema.parse(resume.parsed);
    console.log("✓ resumeParsedSchema succeeded! Skills count:", parsedResume.skills.length);
  } catch (e) {
    console.error("❌ resumeParsedSchema failed:", e);
    return;
  }

  console.log("\n[Hop 2] Parsing jd.parsed with jdParsedSchema...");
  let parsedJd;
  try {
    parsedJd = jdParsedSchema.parse(jd.parsed);
    console.log("✓ jdParsedSchema succeeded! Required:", parsedJd.requiredSkills.length, "Preferred:", parsedJd.preferredSkills.length);
  } catch (e) {
    console.error("❌ jdParsedSchema failed:", e);
    return;
  }

  // Hop 3: Check AI_ENGINE_URL and call ai-engine
  const aiEngineUrl = process.env.AI_ENGINE_URL || "http://127.0.0.1:4001";
  console.log(`\n[Hop 3] Calling AI Engine at ${aiEngineUrl}/v1/skill-gap...`);
  try {
    const res = await fetch(`${aiEngineUrl}/v1/skill-gap`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-key": process.env.INTERNAL_API_KEY ?? "",
      },
      body: JSON.stringify({
        resume: parsedResume,
        jd: parsedJd,
      }),
    });

    console.log(`AI Engine response status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log("AI Engine response body:", text);

    if (!res.ok) {
      console.error(`❌ Upstream call failed with status ${res.status}: ${text}`);
    } else {
      console.log("✓ AI Engine succeeded!");
    }
  } catch (e) {
    console.error("❌ Failed to reach AI Engine:", e);
  }

  // Also test all resumes and JDs across all users to see if any fail schema validation!
  console.log("\n[Hop 4] Testing ALL users resumes and JDs for schema errors...");
  const allResumes = await prisma.resume.findMany();
  for (const r of allResumes) {
    const p = resumeParsedSchema.safeParse(r.parsed);
    if (!p.success) {
      console.error(`❌ Resume ${r.id} (${r.fileName}) failed schema:`, p.error.format());
    }
  }
  const allJds = await prisma.jobDescription.findMany();
  for (const j of allJds) {
    const p = jdParsedSchema.safeParse(j.parsed);
    if (!p.success) {
      console.error(`❌ JD ${j.id} (${j.title}) failed schema:`, p.error.format());
    }
  }
  console.log("All resumes and JDs schema validation check finished.");
}

reproduce().catch(console.error).finally(() => prisma.$disconnect());
