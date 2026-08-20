/* Capturas extra de la fase Mobile/UX: offcanvas de filtros abierto y topbar
   con WhatsApp alineado, en 390x844 y 320x568. */
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
const url = `file://${path.join(root, "index.html").replace(/\\/g, "/").replace(/ /g, "%20")}`;
const port = Number(process.env.SHOTS2_CDP_PORT || 9591);
const profile = path.join(os.tmpdir(), `fo-shots2-${process.pid}`);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

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
    const evalv = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true });
      return r.result.value;
    };
    await new Promise((r) => { ws.onopen = r; });

    for (const vp of [
      { label: "m390", w: 390, h: 844 },
      { label: "m320", w: 320, h: 568 },
    ]) {
      await send("Emulation.setDeviceMetricsOverride", { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: true });
      await send("Page.navigate", { url });
      await delay(1400);
      // Catalogo 2 cols + topbar
      await send("Runtime.evaluate", { expression: "window.navigateTo('catalogo')" });
      await delay(900);
      let shot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(outDir, `catalogo-${vp.label}-topbar.png`), Buffer.from(shot.data, "base64"));
      console.log("shot: catalogo-" + vp.label + "-topbar.png");
      // Offcanvas de filtros abierto
      await send("Runtime.evaluate", { expression: "document.getElementById('btnFiltersMobile').click()" });
      await delay(600);
      shot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(outDir, `filtros-offcanvas-${vp.label}.png`), Buffer.from(shot.data, "base64"));
      console.log("shot: filtros-offcanvas-" + vp.label + ".png");
      await send("Runtime.evaluate", { expression: "document.getElementById('filtersCloseBtn').click()" });
      await delay(500);
      // Checkout con logos (item en carrito)
      await send("Runtime.evaluate", { expression: "var a=document.querySelector('#catalogGrid .product-card .btn-add[data-add-id]'); if(a) a.click();" });
      await delay(400);
      await send("Runtime.evaluate", { expression: "var m=document.getElementById('modalAddBtn'); if(m) m.click();" });
      await delay(400);
      await send("Runtime.evaluate", { expression: "window.navigateTo('checkout')" });
      await delay(1000);
      await send("Runtime.evaluate", { expression: "document.querySelector('.pay-methods').scrollIntoView({block:'center'})" });
      await delay(600);
      shot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(outDir, `checkout-logos-${vp.label}.png`), Buffer.from(shot.data, "base64"));
      console.log("shot: checkout-logos-" + vp.label + ".png");
    }
    // Desktop: catalogo + checkout
    for (const vp of [
      { label: "tab768", w: 768, h: 1024 },
      { label: "desk1280", w: 1280, h: 900 },
    ]) {
      await send("Emulation.setDeviceMetricsOverride", { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: false });
      await send("Page.navigate", { url });
      await delay(1400);
      await send("Runtime.evaluate", { expression: "window.navigateTo('catalogo')" });
      await delay(900);
      let shot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(outDir, `catalogo-${vp.label}.png`), Buffer.from(shot.data, "base64"));
      console.log("shot: catalogo-" + vp.label + ".png");
      await send("Runtime.evaluate", { expression: "var a=document.querySelector('#catalogGrid .product-card .btn-add[data-add-id]'); if(a) a.click();" });
      await delay(400);
      await send("Runtime.evaluate", { expression: "var m=document.getElementById('modalAddBtn'); if(m) m.click();" });
      await delay(400);
      await send("Runtime.evaluate", { expression: "window.navigateTo('checkout')" });
      await delay(1000);
      await send("Runtime.evaluate", { expression: "document.querySelector('.pay-methods').scrollIntoView({block:'center'})" });
      await delay(600);
      shot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(outDir, `checkout-logos-${vp.label}.png`), Buffer.from(shot.data, "base64"));
      console.log("shot: checkout-logos-" + vp.label + ".png");
    }
    ws.close();
  } finally {
    browser.kill();
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (_) {}
  }
})().catch((e) => { console.error(e.stack || e); process.exitCode = 1; });