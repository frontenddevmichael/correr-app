// QA helper: capture viewport screenshots at given scroll offsets using CDP.
// Usage: node .qa/shot.mjs <url> <width> <height> <outPrefix> <scrollY,scrollY,...> [dark]
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [url, w, h, prefix, offsets = "0", scheme = "light"] = process.argv.slice(2);
const width = Number(w);
const height = Number(h);

const chrome = spawn("chromium", [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--remote-debugging-port=9333",
  "--user-data-dir=/tmp/qa-chrome-profile",
  "--no-first-run",
  `--window-size=${width},${height}`,
  "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWs() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9333/json/list");
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
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 500,
});
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: scheme }],
});
await send("Page.navigate", { url });
await sleep(2500);

for (const off of offsets.split(",")) {
  await send("Runtime.evaluate", {
    expression: `window.scrollTo(0, ${Number(off)}); new Promise(r => setTimeout(r, 900))`,
    awaitPromise: true,
  });
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${prefix}-${off}.png`, Buffer.from(shot.result.data, "base64"));
  console.log(`saved ${prefix}-${off}.png`);
}

const heightInfo = await send("Runtime.evaluate", {
  expression: "JSON.stringify({h: document.documentElement.scrollHeight})",
  returnByValue: true,
});
console.log(heightInfo.result?.result?.value);

ws.close();
chrome.kill("SIGKILL");
process.exit(0);
