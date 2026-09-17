import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9344;
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${process.env.TEMP}\\ccshau-chrome-cdp`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

function cdp(ws, id, method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const onMsg = (raw) => {
      const text = typeof raw === "string" ? raw : raw.toString();
      if (!text.startsWith("{")) return;
      let msg;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }
      if (sessionId && msg.sessionId !== sessionId) return;
      if (msg.id === id) {
        ws.removeEventListener("message", onMsg);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
}

try {
  let version;
  for (let i = 0; i < 30; i++) {
    try {
      version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      break;
    } catch {
      await sleep(200);
    }
  }
  if (!version) throw new Error("CDP not ready");

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", rej);
  });

  const { targetId } = await cdp(ws, 1, "Target.createTarget", { url: "http://localhost:3000/" });
  const { sessionId } = await cdp(ws, 2, "Target.attachToTarget", { targetId, flatten: true });
  const sess = (id, method, params = {}) => cdp(ws, id, method, params, sessionId);

  await sess(10, "Page.enable");
  await sess(11, "Runtime.enable");
  await sess(12, "Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(5000);

  const metrics = await sess(20, "Runtime.evaluate", {
    expression: `(() => {
      const tracks = [...document.querySelectorAll(".homepage-carousel-track")];
      return tracks.map((el) => {
        const wrap = el.parentElement;
        const buttons = [...wrap.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
        const first = el.firstElementChild;
        const last = el.lastElementChild;
        const wrapRect = wrap.getBoundingClientRect();
        const firstRect = first?.getBoundingClientRect();
        const lastRect = last?.getBoundingClientRect();
        return {
          region: el.getAttribute("aria-label") || "",
          overflow: el.scrollWidth - el.clientWidth,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          justify: getComputedStyle(el).justifyContent,
          arrows: buttons,
          firstLeft: firstRect ? Math.round(firstRect.left - wrapRect.left) : null,
          lastRightGap: lastRect ? Math.round(wrapRect.right - lastRect.right) : null,
        };
      });
    })()`,
    returnByValue: true,
  });
  console.log(JSON.stringify(metrics.result.value, null, 2));

  await sess(21, "Runtime.evaluate", {
    expression:
      "document.querySelector('[aria-label=\"Dignitaries\"]')?.scrollIntoView({block:'center'})",
  });
  await sleep(400);
  const shot = await sess(22, "Page.captureScreenshot", { format: "png" });
  writeFileSync(
    "c:/Jatin/Projects/CCSHAU_Project/apps/web/scripts/dignitaries-section.png",
    Buffer.from(shot.data, "base64"),
  );
  console.log("saved screenshot");
  ws.close();
} finally {
  chrome.kill();
}
