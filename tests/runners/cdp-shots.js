/* Capturas de pantalla de auditoría (Fase 6): viewports móvil/tablet/desktop,
   light/dark, de las vistas clave. Usa Edge headless + CDP, sin dependencias. */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "tests", "shots");
fs.mkdirSync(outDir, { recursive: true });

const edge = process.env.EDGE_PATH || [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(fs.existsSync);
if (!edge) throw new Error("Edge no disponible");

const url = process.env.SHOTS_URL || `file://${path.join(root, "index.html").replace(/\\/g, "/").replace(/ /g, "%20")}`;
const port = Number(process.env.SHOTS_CDP_PORT || 9590);
const profile = path.join(os.tmpdir(), `fo-shots-${process.pid}`);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Navega, espera el render de la vista, aplica tema y dispara la captura.
const views = [
  { name: "home", nav: "navigateTo('home')", wait: 1200 },
  { name: "catalogo", nav: "navigateTo('catalogo');document.getElementById('loadMoreCatalog').click()", wait: 1400 },
  { name: "packs", nav: "navigateTo('promos')", wait: 1200 },
  { name: "checkout", nav: "navigateTo('checkout')", wait: 1000 },
  { name: "tiktok", nav: "document.getElementById('page-home').scrollIntoView();window.scrollTo(0, document.body.scrollHeight)", wait: 900 },
];

(async () => {
  fs.rmSync(profile, { recursive: true, force: true });
  const browser = spawn(edge, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--disable-default-apps",
    "--disable-background-timer-throttling", `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`, "about:blank",
  ], { stdio: "ignore" });
  try {
    let tabs;
    for (let i = 0; i < 40; i += 1) {
      try { tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch (_) { await delay(250); }
    }
    if (!tabs) throw new Error("CDP no disponible");
    const tab = tabs.find((t) => t.type === "page");
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    const pending = new Map(); let id = 0;
    const send = (method, params = {}) => new Promise((resolve) => {
      const rid = ++id; pending.set(rid, resolve);
      ws.send(JSON.stringify({ id: rid, method, params }));
    });
    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
    };
    await new Promise((r) => { ws.onopen = r; });

    for (const vp of [
      { label: "m320", w: 320, h: 568 },
      { label: "m390", w: 390, h: 844 },
      { label: "tab768", w: 768, h: 1024 },
      { label: "desk1280", w: 1280, h: 900 },
      { label: "wide1440", w: 1440, h: 900 },
    ]) {
      await send("Emulation.setDeviceMetricsOverride", { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.w < 768 });
      await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
      for (const theme of ["dark", "light"]) {
        await send("Page.navigate", { url });
        await delay(1400);
        await send("Runtime.evaluate", { expression: `document.documentElement.setAttribute('data-theme','${theme}');localStorage.setItem('fo_theme','${theme}')` });
        for (const view of views) {
          await send("Runtime.evaluate", { expression: `try{${view.nav}}catch(e){};document.documentElement.setAttribute('data-theme','${theme}')` });
          await delay(view.wait);
          const shot = await send("Page.captureScreenshot", { format: "png" });
          const file = path.join(outDir, `${view.name}-${vp.label}-${theme}.png`);
          fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
          console.log("shot:", path.basename(file));
        }
      }
    }
    ws.close();
  } finally {
    browser.kill();
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (_) {}
  }
})().catch((e) => { console.error(e.stack || e); process.exitCode = 1; });