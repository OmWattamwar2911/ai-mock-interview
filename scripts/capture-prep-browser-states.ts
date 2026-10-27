import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../apps/web/lib/prisma";

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
  const userDataDir = join(process.env.TEMP || "C:\\Temp", "rehearse-chrome-prep-ui");

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9229",
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${userDataDir}`,
  ]);

  console.log("Starting Chrome for UI screen capture...");
  await sleep(2000);

  try {
    const newPageRes = await fetch("http://127.0.0.1:9229/json/new?about:blank", { method: "PUT" });
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

    // Login as demo candidate
    console.log("Logging into Rehearse...");
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

    // Navigate to /onboarding
    console.log("Navigating to /onboarding...");
    await client.send("Page.navigate", { url: "http://localhost:3000/onboarding" });
    await sleep(3000);

    // Initial state: Step 1 (Resume upload)
    await capture("prep_step1_resume.webp");

    // In the page, populate demo resume and advance to step 2 & 3
    console.log("Populating demo resume and JD into page state...");
    await client.send("Runtime.evaluate", {
      awaitPromise: true,
      expression: `
        (async () => {
          const res = await fetch('/api/resumes');
          const resData = await res.json();
          const resume = resData.resumes?.[0];

          const jdRes = await fetch('/api/jds');
          const jdData = await jdRes.json();
          const jd = jdData.jobDescriptions?.[0];

          // Store on window to manipulate React state via DOM interactions or trigger step
          window.__DEMO_RESUME = resume;
          window.__DEMO_JD = jd;
        })()
      `,
    });

    // Simulate Step 3 directly by evaluating state
    await client.send("Runtime.evaluate", {
      expression: `
        (() => {
          // Find stepper button for step 2 or 3
          const buttons = Array.from(document.querySelectorAll('button'));
          const stepBtn = buttons.find(b => b.textContent?.includes('Job Description'));
          if (stepBtn) stepBtn.click();
        })()
      `,
    });
    await sleep(800);
    await capture("prep_step2_jd.webp");

    // Click calculate or trigger API to advance to Step 4
    const triggerRes = await client.send("Runtime.evaluate", {
      awaitPromise: true,
      expression: `
        (async () => {
          const docRes = await fetch('/api/resumes');
          const docData = await docRes.json();
          const resume = docData.resumes?.[0];

          const jdRes = await fetch('/api/jds');
          const jdData = await jdRes.json();
          const jd = jdData.jobDescriptions?.[0];

          if (resume && jd) {
            const gapRes = await fetch('/api/skill-gap', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ resumeId: resume.id, jdId: jd.id, recalculate: true })
            });
            return await gapRes.json();
          }
          return null;
        })()
      `,
      returnByValue: true,
    });
    console.log("Calculation result from browser:", triggerRes?.result?.value?.matchScore);

    console.log("UI Screenshots captured successfully!");
    client.close();
  } catch (err) {
    console.error("UI capture error:", err);
  } finally {
    chromeProc.kill();
    await prisma.$disconnect();
  }
}

main();
