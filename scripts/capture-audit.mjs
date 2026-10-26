import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
    });
  }

  send(method, params = {}) {
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
  const outputDir = join(process.cwd(), "apps", "web", "public", "audit", "before");
  mkdirSync(outputDir, { recursive: true });

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = join(process.env.TEMP || "C:\\Temp", "rehearse-chrome-audit-session");

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${userDataDir}`,
  ]);

  console.log("Starting Chrome for audit capture...");
  await sleep(1500);

  try {
    const newPageRes = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
    const target = await newPageRes.json();
    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("DOM.enable");

    // 1. Perform Login
    console.log("Logging into Rehearse...");
    await client.send("Page.navigate", { url: "http://localhost:3000/login" });
    await sleep(2000);

    await client.send("Runtime.evaluate", {
      expression: `
        (() => {
          function setNativeValue(element, value) {
            const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
            const prototype = Object.getPrototypeOf(element);
            const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
            if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
              prototypeValueSetter.call(element, value);
            } else {
              valueSetter.call(element, value);
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }

          const emailInput = document.querySelector('input[type="email"]');
          const passInput = document.querySelector('input[type="password"]');
          const submitBtn = document.querySelector('button[type="submit"]');

          if (emailInput && passInput && submitBtn) {
            setNativeValue(emailInput, 'demo@rehearse.local');
            setNativeValue(passInput, 'change-me');
            submitBtn.click();
          }
        })()
      `,
    });

    await sleep(3500);

    const loggedInUrl = await client.send("Runtime.evaluate", { expression: "window.location.href" });
    console.log("Current page post-login:", loggedInUrl.result?.value);

    // List of pages to audit
    const pagesToCapture = [
      { name: "dashboard", url: "http://localhost:3000/dashboard" },
      { name: "prep", url: "http://localhost:3000/onboarding" },
      { name: "documents", url: "http://localhost:3000/documents" },
      { name: "interview-setup", url: "http://localhost:3000/interview" },
      { name: "interview-live", url: "http://localhost:3000/interview/cmvjmarfv000dw9uo7eu5aivc" },
      { name: "oa-practice", url: "http://localhost:3000/oa" },
      { name: "analyzer-overview", url: "http://localhost:3000/analyzer" },
      { name: "analyzer-resume", url: "http://localhost:3000/analyzer/resume" },
      { name: "analyzer-linkedin", url: "http://localhost:3000/analyzer/linkedin" },
      { name: "analyzer-github", url: "http://localhost:3000/analyzer/github" },
      { name: "analyzer-coding", url: "http://localhost:3000/analyzer/coding" },
      { name: "analyzer-portfolio", url: "http://localhost:3000/analyzer/portfolio" },
      { name: "analytics", url: "http://localhost:3000/analytics" },
      { name: "settings", url: "http://localhost:3000/settings" },
      { name: "report", url: "http://localhost:3000/interview/cmvjmarfv000dw9uo7eu5aivc/report" },
      { name: "login", url: "http://localhost:3000/login" },
      { name: "register", url: "http://localhost:3000/register" },
    ];

    const viewports = [
      { label: "1440", width: 1440, height: 900, isMobile: false },
      { label: "768", width: 768, height: 1024, isMobile: false },
      { label: "375", width: 375, height: 812, isMobile: true },
    ];

    const themes = ["light", "dark"];

    for (const page of pagesToCapture) {
      console.log(`\nAuditing ${page.name} (${page.url})...`);
      await client.send("Page.navigate", { url: page.url });
      await sleep(1500);

      for (const theme of themes) {
        await client.send("Runtime.evaluate", {
          expression: `
            (() => {
              const html = document.documentElement;
              if ('${theme}' === 'dark') {
                html.classList.add('dark');
                html.classList.remove('light');
              } else {
                html.classList.add('light');
                html.classList.remove('dark');
              }
              try { localStorage.setItem('theme', '${theme}'); } catch(e){}
            })()
          `,
        });

        await client.send("Emulation.setEmulatedMedia", {
          media: "screen",
          features: [{ name: "prefers-color-scheme", value: theme }],
        });

        for (const vp of viewports) {
          await client.send("Emulation.setDeviceMetricsOverride", {
            width: vp.width,
            height: vp.height,
            deviceScaleFactor: 1,
            mobile: vp.isMobile,
          });

          await sleep(300);

          const ss = await client.send("Page.captureScreenshot", {
            format: "webp",
            quality: 80,
          });

          const filename = `${page.name}_${vp.label}_${theme}.webp`;
          writeFileSync(join(outputDir, filename), Buffer.from(ss.data, "base64"));
          process.stdout.write(` [OK] ${filename}\n`);
        }
      }
    }

    client.close();
    console.log("\nAll audit screenshots captured successfully in:", outputDir);
  } finally {
    chromeProc.kill();
  }
}

main().catch(console.error);
