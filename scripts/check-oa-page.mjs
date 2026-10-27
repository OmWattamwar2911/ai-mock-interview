import { spawn } from "node:child_process";

async function check() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = "C:\\Temp\\rehearse-chrome-test-url";

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9225",
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${userDataDir}`,
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const res = await fetch("http://127.0.0.1:9225/json/new?about:blank", { method: "PUT" });
    const target = await res.json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const reqId = id++;
        const handler = (e) => {
          const data = JSON.parse(e.data);
          if (data.id === reqId) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: reqId, method, params }));
      });
    }

    // Go to /login first to establish origin
    await send("Page.navigate", { url: "http://localhost:3000/login" });
    await new Promise(r => setTimeout(r, 1500));

    // Sign in via fetch inside page
    const loginRes = await send("Runtime.evaluate", {
      awaitPromise: true,
      expression: `
        (async () => {
          const csrfRes = await fetch('/api/auth/csrf');
          const csrfData = await csrfRes.json();
          const res = await fetch('/api/auth/callback/credentials', {
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
          return { status: res.status, ok: res.ok, body: await res.text() };
        })()
      `,
      returnByValue: true
    });
    console.log("Login result:", loginRes?.result?.value);

    // Now navigate to /oa
    await send("Page.navigate", { url: "http://localhost:3000/oa" });
    await new Promise(r => setTimeout(r, 3000));

    const cur = await send("Runtime.evaluate", {
      expression: `({
        url: window.location.href,
        title: document.title,
        heading: document.querySelector('h1, h2')?.textContent,
        challengesHeader: document.querySelector('p.text-xs.font-mono')?.textContent,
        problemTitle: document.querySelector('h2.text-xl')?.textContent,
        cardsCount: document.querySelectorAll('button[class*="rounded-xl"]').length
      })`,
      returnByValue: true
    });
    console.log("Page info on /oa:", JSON.stringify(cur?.result?.value, null, 2));

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

check();
