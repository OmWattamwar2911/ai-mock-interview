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
  const outputDir = join(process.cwd(), "apps", "web", "public", "audit", "after");
  mkdirSync(outputDir, { recursive: true });

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = join(process.env.TEMP || "C:\\Temp", "rehearse-chrome-oa-capture-v2");

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9226",
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${userDataDir}`,
  ]);

  console.log("Starting Chrome for OA capture...");
  await sleep(2000);

  try {
    const newPageRes = await fetch("http://127.0.0.1:9226/json/new?about:blank", { method: "PUT" });
    const target = await newPageRes.json();
    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("DOM.enable");

    // Login via NextAuth credentials API
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
              callbackUrl: '/oa',
              json: 'true'
            })
          });
        })()
      `,
    });

    await sleep(2000);

    async function setViewport(width, height) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 768,
      });
      await sleep(1000);
    }

    async function setTheme(theme) {
      await client.send("Runtime.evaluate", {
        expression: `
          (() => {
            const html = document.documentElement;
            if ('${theme}' === 'dark') {
              html.classList.add('dark');
              html.style.colorScheme = 'dark';
            } else {
              html.classList.remove('dark');
              html.style.colorScheme = 'light';
            }
          })()
        `,
      });
      await sleep(600);
    }

    async function capture(filename) {
      const shot = await client.send("Page.captureScreenshot", {
        format: "webp",
        quality: 90,
      });
      const filePath = join(outputDir, filename);
      writeFileSync(filePath, Buffer.from(shot.data, "base64"));
      console.log(`Saved: ${filename}`);
    }

    // Navigate to OA Practice
    console.log("Navigating to /oa...");
    await client.send("Page.navigate", { url: "http://localhost:3000/oa" });
    await sleep(4000);

    const viewports = [
      { name: "1440", width: 1440, height: 900 },
      { name: "375", width: 375, height: 812 },
    ];

    for (const vp of viewports) {
      console.log(`Setting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await setViewport(vp.width, vp.height);

      // 1. Dark mode
      await setTheme("dark");
      await capture(`oa-practice_${vp.name}_dark.webp`);

      // 2. Light mode
      await setTheme("light");
      await capture(`oa-practice_${vp.name}_light.webp`);

      // 3. Reset to dark mode
      await setTheme("dark");

      // Apply Filter: filter by search input "Amazon"
      await client.send("Runtime.evaluate", {
        expression: `
          (() => {
            const input = document.querySelector('input[placeholder*="Search"]');
            if (input) {
              const proto = Object.getPrototypeOf(input);
              const setVal = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
              setVal.call(input, 'Amazon');
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          })()
        `,
      });
      await sleep(1200);
      await capture(`oa-practice-filtered_${vp.name}_dark.webp`);

      // Apply Empty Filter: search for "NonExistentChallengeXYZ"
      await client.send("Runtime.evaluate", {
        expression: `
          (() => {
            const input = document.querySelector('input[placeholder*="Search"]');
            if (input) {
              const proto = Object.getPrototypeOf(input);
              const setVal = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
              setVal.call(input, 'NonExistentChallengeXYZ');
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          })()
        `,
      });
      await sleep(1200);
      await capture(`oa-practice-empty_${vp.name}_dark.webp`);

      // Click "Clear filters" button
      await client.send("Runtime.evaluate", {
        expression: `
          (() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const clearBtn = buttons.find(b => b.textContent?.includes('Clear filters'));
            if (clearBtn) clearBtn.click();
          })()
        `,
      });
      await sleep(1000);
    }

    console.log("All screenshots captured successfully!");
    client.close();
  } catch (err) {
    console.error("Capture error:", err);
  } finally {
    chromeProc.kill();
  }
}

main();
