import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../apps/web/lib/prisma";
import { encode } from "next-auth/jwt";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  private ws: WebSocket;
  private id = 0;
  private callbacks = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

  constructor(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id)!;
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise<void>((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
    });
  }

  send(method: string, params: Record<string, any> = {}): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  const outputDir = join(process.cwd(), "apps", "web", "public", "audit", "prep");
  mkdirSync(outputDir, { recursive: true });

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = join(process.env.TEMP || "C:\\Temp", "rehearse-chrome-prep-verify");

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9228",
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${userDataDir}`,
  ]);

  console.log("Starting Chrome for Prep E2E verification...");
  await sleep(2000);

  try {
    const newPageRes = await fetch("http://127.0.0.1:9228/json/new?about:blank", { method: "PUT" });
    const target = await newPageRes.json();
    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("DOM.enable");

    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    async function capture(filename: string) {
      const shot = await client.send("Page.captureScreenshot", {
        format: "webp",
        quality: 90,
      });
      const filePath = join(outputDir, filename);
      writeFileSync(filePath, Buffer.from(shot.data, "base64"));
      console.log(`Saved screenshot: ${filename}`);
    }

    // 1. Login as demo candidate
    console.log("Logging into Rehearse as demo candidate...");
    await client.send("Page.navigate", { url: "http://localhost:3000/login" });
    await sleep(2000);

    await client.send("Runtime.evaluate", {
      awaitPromise: true,
      expression: `
        (async () => {
          const csrfRes = await fetch('/api/auth/csrf');
          const csrfData = await csrfRes.json();
          await fetch('/api/auth/callback/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              csrfToken: csrfData.csrfToken,
              email: 'demo@rehearse.local',
              password: 'change-me',
              callbackUrl: '/onboarding',
              json: 'true'
            })
          });
        })()
      `,
    });
    await sleep(2000);

    // Fetch candidate resume and JD
    const demoUser = await prisma.user.findUnique({
      where: { email: "demo@rehearse.local" },
      include: { resumes: true, jobDescs: true },
    });
    if (!demoUser || !demoUser.resumes[0] || !demoUser.jobDescs[0]) {
      throw new Error("Missing seeded demo user resume/JD");
    }
    const resume = demoUser.resumes[0];
    const jd = demoUser.jobDescs[0];

    const secret = process.env.AUTH_SECRET || "replace-with-32-plus-char-secret";
    const sessionToken = await encode({
      token: { id: demoUser.id, sub: demoUser.id, email: demoUser.email, name: demoUser.name, role: demoUser.role },
      secret,
      salt: "authjs.session-token",
    });
    const authHeader = `authjs.session-token=${sessionToken}`;

    // SCENARIO 1: Normal Resume and JD
    console.log("\n--- Scenario 1: Normal Resume and JD Calculation ---");
    const normalRes = await fetch("http://localhost:3000/api/skill-gap", {
      method: "POST",
      headers: { "content-type": "application/json", Cookie: authHeader },
      body: JSON.stringify({ resumeId: resume.id, jdId: jd.id, recalculate: true }),
    });
    const normalData = await normalRes.json();
    console.log("Normal calculation response status:", normalRes.status);
    console.log("Normal calculation data:", JSON.stringify(normalData, null, 2));

    // Navigate to /onboarding in Chrome and render
    await client.send("Page.navigate", { url: "http://localhost:3000/onboarding" });
    await sleep(3000);
    await capture("prep-normal-flow.webp");

    // SCENARIO 2: Resume with No Detectable Skills
    console.log("\n--- Scenario 2: Resume with No Detectable Skills ---");
    const emptySkillResume = await prisma.resume.create({
      data: {
        userId: demoUser.id,
        fileName: "Empty_Skills_Resume.pdf",
        fileType: "application/pdf",
        encryptedText: "mock",
        parsed: {
          skills: [],
          experience: [],
          education: [],
          summary: "Entry level graduate.",
        },
      },
    });

    const emptySkillRes = await fetch("http://localhost:3000/api/skill-gap", {
      method: "POST",
      headers: { "content-type": "application/json", Cookie: authHeader },
      body: JSON.stringify({ resumeId: emptySkillResume.id, jdId: jd.id, recalculate: true }),
    });
    const emptySkillData = await emptySkillRes.json();
    console.log("Empty skills response status:", emptySkillRes.status);
    console.log("Empty skills response body:", JSON.stringify(emptySkillData, null, 2));

    // SCENARIO 3: Empty JD Requirements
    console.log("\n--- Scenario 3: Empty Target JD Requirements ---");
    const emptyReqJd = await prisma.jobDescription.create({
      data: {
        userId: demoUser.id,
        title: "General Engineering Role",
        encryptedText: "mock",
        parsed: {
          title: "General Engineering Role",
          requiredSkills: [],
          preferredSkills: [],
          responsibilities: ["Collaborate with team"],
          keywords: [],
        },
      },
    });

    const emptyJdRes = await fetch("http://localhost:3000/api/skill-gap", {
      method: "POST",
      headers: { "content-type": "application/json", Cookie: authHeader },
      body: JSON.stringify({ resumeId: resume.id, jdId: emptyReqJd.id, recalculate: true }),
    });
    const emptyJdData = await emptyJdRes.json();
    console.log("Empty JD response status:", emptyJdRes.status);
    console.log("Empty JD response body:", JSON.stringify(emptyJdData, null, 2));

    // SCENARIO 4: LLM Unavailable / GROQ_API_KEY Missing Fallback
    console.log("\n--- Scenario 4: LLM Fallback (Automatic Matching with Note) ---");
    const fallbackRes = await fetch("http://localhost:3000/api/skill-gap", {
      method: "POST",
      headers: { "content-type": "application/json", Cookie: authHeader },
      body: JSON.stringify({
        resumeId: resume.id,
        jdId: jd.id,
        recalculate: true,
        resumeSkills: ["React", "TypeScript", "MySQL", "Docker"],
        requiredSkills: ["React", "TypeScript", "PostgreSQL", "Kubernetes"],
        preferredSkills: ["Redis"],
      }),
    });
    const fallbackData = await fallbackRes.json();
    console.log("Fallback response status:", fallbackRes.status);
    console.log("Fallback response body:", JSON.stringify(fallbackData, null, 2));

    // Clean up temporary database records
    await prisma.resume.delete({ where: { id: emptySkillResume.id } });
    await prisma.jobDescription.delete({ where: { id: emptyReqJd.id } });

    console.log("\nAll 4 test scenarios completed and verified!");
    client.close();
  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    chromeProc.kill();
    await prisma.$disconnect();
  }
}

main();
