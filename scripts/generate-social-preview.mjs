// Render a code-designed social card with existing Type Tiles artwork.
// Uses an already installed Chrome/Edge. No image API or dependencies required.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const project = fileURLToPath(new URL("..", import.meta.url));
const directory = path.join(project, "output", "social-preview");
const destination = path.join(project, "public", "social", "type-tiles-preview.png");
fs.mkdirSync(directory, { recursive: true });
fs.mkdirSync(path.dirname(destination), { recursive: true });
const logo = fs.readFileSync(path.join(project, "public", "favicon.svg")).toString("base64");
const markup = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Type Tiles social preview</title><style>
*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}body{font-family:Arial,Helvetica,sans-serif;color:#fff;background:#07112c}.card{position:relative;width:1200px;height:630px;background:radial-gradient(ellipse at 91% 19%,#3d285b 0,transparent 48%),radial-gradient(ellipse at 16% 95%,#12384c 0,transparent 49%),#07112c}.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:48px 48px}.topline{position:absolute;left:0;right:0;top:0;height:7px;background:linear-gradient(90deg,#83e3ff,#8187ff,#b096ff)}.brand{position:absolute;left:68px;top:45px;display:flex;align-items:center;gap:17px;font-size:31px;font-weight:800;letter-spacing:-1px}.brand img{width:65px;height:65px}.eyebrow{position:absolute;top:143px;left:73px;font-size:13px;letter-spacing:3px;font-weight:700;color:#b4c2fa}.headline{position:absolute;left:68px;top:181px;margin:0;font-size:78px;line-height:1.05;letter-spacing:-3.5px;font-weight:800}.headline span{color:#89e2ff}.description{position:absolute;left:73px;top:366px;margin:0;font-size:23px;line-height:1.5;color:#c8d5e9}.pills{position:absolute;left:73px;bottom:98px;display:flex;gap:10px}.pill{padding:11px 16px;border:1px solid #7e9ece55;border-radius:999px;background:#111e3c;font-size:14px;color:#e3edff}.domain{position:absolute;bottom:41px;left:73px;font-size:21px;font-weight:700;letter-spacing:.1px}.domain span{color:#89e2ff;margin-left:13px}.board{position:absolute;left:797px;top:108px;width:316px;height:394px;border:1px solid #91adf54d;border-radius:27px;background:linear-gradient(160deg,#142442dd,#0a1533ee);box-shadow:0 24px 60px #0005;transform:rotate(-6deg)}.boardtitle{position:absolute;top:24px;left:25px;color:#b6c4e7;font-size:11px;font-weight:700;letter-spacing:2.6px}.line{position:absolute;left:24px;right:24px;bottom:83px;border-top:1px dashed #8dc8ff55}.tile{position:absolute;height:57px;display:flex;align-items:center;justify-content:center;border-radius:11px;font-size:22px;letter-spacing:3px;font-weight:bold;box-shadow:0 8px 18px #0003}.tile span{color:#85e6ff}.one{top:68px;left:36px;width:169px;background:#1a3f58;border:1px solid #8de8ff}.two{top:143px;right:27px;width:167px;background:#2e2b5d;border:1px solid #bba5ff}.three{top:223px;left:27px;width:226px;background:#172f50;border:1px solid #92bfff}.keys{position:absolute;bottom:24px;left:27px;right:27px;display:flex;gap:7px}.keys b{display:flex;align-items:center;justify-content:center;flex:1;height:35px;border:1px solid #677dac88;border-bottom-width:3px;border-radius:6px;font-size:14px;color:#c5d4f1}.spark{position:absolute;border-radius:50%;background:#97ecff;box-shadow:0 0 25px #76dcff66}.s1{width:8px;height:8px;left:753px;top:132px}.s2{width:5px;height:5px;left:1143px;top:486px}.footer{position:absolute;right:78px;bottom:45px;color:#a9b9db;font-size:12px;letter-spacing:2px}
</style></head><body><div class="card"><div class="grid"></div><div class="topline"></div><div class="brand"><img src="data:image/svg+xml;base64,${logo}" alt="Type Tiles logo">Type Tiles</div><div class="eyebrow">FREE ONLINE TYPING GAME</div><h1 class="headline">Turn practice<br>into <span>play.</span></h1><p class="description">Practice speed and accuracy.<br>Play solo or join your classroom.</p><div class="pills"><span class="pill">Solo practice</span><span class="pill">Classroom matches</span><span class="pill">Gregg stenography</span></div><div class="domain">playtypetiles.com <span>↗</span></div><div class="board"><div class="boardtitle">READY. SET. TYPE.</div><div class="tile one"><span>SP</span>EED</div><div class="tile two"><span>FO</span>CUS</div><div class="tile three"><span>ACC</span>URACY</div><div class="line"></div><div class="keys"><b>T</b><b>Y</b><b>P</b><b>E</b><b>↵</b></div></div><div class="spark s1"></div><div class="spark s2"></div><div class="footer">PLAY. TYPE. IMPROVE.</div></div></body></html>`;
const design = path.join(directory, "preview-design.html");
fs.writeFileSync(design, markup);
const browser = process.env.SOCIAL_PREVIEW_BROWSER || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(candidate => fs.existsSync(candidate));
if (!browser) throw new Error("Install no dependencies: set SOCIAL_PREVIEW_BROWSER to an existing Chrome/Edge executable.");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "typetiles-social-"));
const child = spawn(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-background-networking", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"], { windowsHide: true, stdio: "ignore" });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = Number(fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]); } catch {}
    if (port) break;
    await delay(200);
  }
  if (!port) throw new Error("Browser did not start.");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = event => { const message = JSON.parse(event.data); const request = pending.get(message.id); if (!request) return; pending.delete(message.id); message.error ? request.reject(Error(JSON.stringify(message.error))) : request.resolve(message.result); };
  const call = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
  await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: pathToFileURL(design).href });
  for (let attempt = 0; attempt < 100; attempt++) {
    const ready = await call("Runtime.evaluate", { expression: 'document.readyState === "complete" && [...document.images].every(image => image.complete && image.naturalWidth > 0)', returnByValue: true });
    if (ready.result.value) break;
    if (attempt === 99) throw new Error("Social card artwork failed to load.");
    await delay(100);
  }
  await call("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
  const capture = await call("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
  fs.writeFileSync(destination, Buffer.from(capture.data, "base64"));
  console.log(`Created ${destination} (1200 × 630 PNG).`);
} finally {
  socket?.close();
  child.kill();
}
