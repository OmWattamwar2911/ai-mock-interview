import { prisma } from "../apps/web/lib/prisma";

async function inspectDb() {
  const users = await prisma.user.findMany({
    include: {
      resumes: true,
      jobDescs: true,
    },
  });
  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    console.log(`User: ${u.email} (${u.id})`);
    console.log(`  Resumes (${u.resumes.length}):`);
    for (const r of u.resumes) {
      console.log(`    - id: ${r.id}, fileName: ${r.fileName}`);
      console.log(`      parsed:`, JSON.stringify(r.parsed).slice(0, 150));
    }
    console.log(`  Job Descriptions (${u.jobDescs.length}):`);
    for (const j of u.jobDescs) {
      console.log(`    - id: ${j.id}, title: ${j.title}`);
      console.log(`      parsed:`, JSON.stringify(j.parsed).slice(0, 150));
    }
  }
}

inspectDb().catch(console.error).finally(() => prisma.$disconnect());
