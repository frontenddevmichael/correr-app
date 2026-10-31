// QA helper: report horizontal overflow and hero geometry across widths.
import { spawn } from "node:child_process";

const url = process.argv[2] ?? "http://localhost:3000/";
const widths = (process.argv[3] ?? "320,360,390,414,768,1024,1280,1440,1920").split(",").map(Number);
const heights = { 320: 640, 360: 720, 390: 844, 414: 896, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080 };

const chrome = spawn("chromium", [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--remote-debugging-port=9334",
  "--user-data-dir=/tmp/qa-measure-profile",
  "--no-first-run",
  "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWs() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9334/json/list");
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("devtools not ready");
}

const wsUrl = await getWs();
const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");

const expression = `(() => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const offenders = [...document.querySelectorAll("body *")]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      if (el.closest("[aria-hidden='true']")) return false;
      return r.right > vw + 1 || r.left < -1;
    })
    .slice(0, 8)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return el.tagName.toLowerCase() + " " + String(el.className).slice(0, 48) + " [" + Math.round(r.left) + "," + Math.round(r.right) + "]";
    });
  const h1 = document.querySelector("h1");
  const form = document.querySelector("form") || document.querySelector("[role=status]");
  const ticker = document.querySelector(".hero-ticker");
  return JSON.stringify({
    vw,
    overflowX: de.scrollWidth - vw,
    offenders,
    h1Height: h1 ? Math.round(h1.getBoundingClientRect().height) : null,
    h1Right: h1 ? Math.round(h1.getBoundingClientRect().right) : null,
    formWidth: form ? Math.round(form.getBoundingClientRect().width) : null,
    tickerWidth: ticker ? Math.round(ticker.getBoundingClientRect().width) : null,
    bodyScrollW: document.body.scrollWidth,
  });
})()`;

for (const w of widths) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: w,
    height: heights[w] ?? 900,
    deviceScaleFactor: 1,
    mobile: w < 500,
  });
  await send("Page.navigate", { url });
  await sleep(1600);
  const res = await send("Runtime.evaluate", { expression, returnByValue: true });
  console.log(w, res.result?.result?.value ?? JSON.stringify(res.result));
}

ws.close();
chrome.kill("SIGKILL");
process.exit(0);
