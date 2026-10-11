import { config } from "dotenv";
config();
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
    const user = await prisma.user.findFirst();
    const resume = await prisma.resume.findFirst();
    const jd = await prisma.jobDescription.findFirst();

    if (!user || !resume || !jd) {
        console.log("Missing DB mock data");
        return;
    }

    console.log("Found user, resume, jd", user.id, resume.id, jd.id);

    const skillGapRes = { mock: true };
    const questions = ["q1", "q2", "q3"];

    try {
        const session = await prisma.interviewSession.create({
            data: {
                userId: user.id,
                resumeId: resume.id,
                jdId: jd.id,
                status: "CREATED",
                config: {},
                skillGap: skillGapRes as any,
                questions: {
                    create: questions.map((q, idx) => ({
                        orderIndex: idx,
                        timeLimitSec: 120,
                        snapshot: { text: q }
                    }))
                }
            },
            include: {
                questions: true
            }
        });
        console.log("Session created", session.id);
    } catch (e) {
        console.error("Prisma exception stack trace:");
        console.error(e);
    }
}
test().catch(console.error).finally(() => prisma.$disconnect());
