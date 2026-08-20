/* Verificación responsive programática (Fase 2/6). Usa pasos con delay como la
   suite real: navega, espera render, abre modal y carrito, mide en cada viewport. */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const edge = process.env.EDGE_PATH || [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(fs.existsSync);
const url = `file://${path.join(root, "index.html").replace(/\\/g, "/").replace(/ /g, "%20")}`;
const port = Number(process.env.RESP_CDP_PORT || 9595);
const profile = path.join(os.tmpdir(), `fo-resp-${process.pid}`);
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

    const cases = [
      { w: 320, h: 568, expCols: 1, touch: true },
      { w: 390, h: 844, expCols: 1, touch: true },
      { w: 768, h: 1024, expCols: 3, touch: false },
      { w: 1280, h: 900, expCols: 5, touch: false },
      { w: 1440, h: 900, expCols: 5, touch: false },
    ];
    let fails = 0;
    for (const c of cases) {
      await send("Emulation.setDeviceMetricsOverride", { width: c.w, height: c.h, deviceScaleFactor: 1, mobile: c.touch });
      await send("Emulation.setTouchEmulationEnabled", { enabled: c.touch, maxTouchPoints: 5 });
      await send("Page.navigate", { url });
      await delay(1800);
      await evalv("window.navigateTo('catalogo')");
      await delay(800);
      const cols = await evalv("getComputedStyle(document.getElementById('catalogGrid')).gridTemplateColumns.split(' ').length");
      await evalv("var __b=document.querySelector('#catalogGrid .product-card .btn-add[data-add-id]'); if(__b) __b.click();");
      await delay(400);
      const modalActive = await evalv("document.getElementById('modalOverlay').classList.contains('active')");
      const modalMaxH = await evalv("getComputedStyle(document.querySelector('.modal')).maxHeight");
      await evalv("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
      await delay(300);
      await evalv("var __c=document.getElementById('btnCart'); if(__c) __c.click();");
      await delay(400);
      const cartActive = await evalv("document.getElementById('cartSidebar').classList.contains('active')");
      const closeH = await evalv("Math.round(document.querySelector('.cart-close').getBoundingClientRect().height)");
      const overX = await evalv("document.documentElement.scrollWidth > window.innerWidth");
      await evalv("var __cl=document.querySelector('.cart-close'); if(__cl) __cl.click();");
      await delay(300);

      const colOk = cols === c.expCols;
      // maxHeight en px debe ser ≈ 92% del alto del viewport (92vh/92dvh)
      const ratio = parseFloat(modalMaxH) / c.h;
      const modalOk = modalActive && Math.abs(ratio - 0.92) < 0.02;
      const cartOk = cartActive;
      const overOk = !overX;
      const closeOk = (c.touch && closeH >= 44) || (!c.touch && closeH >= 34);
      console.log(`${c.w}x${c.h}: cols=${cols}(esp ${c.expCols}) modal=${modalActive} maxH=${modalMaxH}(ratio ${ratio.toFixed(2)}) cart=${cartActive} closeH=${closeH} overX=${overX}`);
      if (!colOk || !modalOk || !cartOk || !overOk || !closeOk) { fails += 1; console.log("  >>> FALLO"); }
    }
    console.log(fails ? `RESPONSIVE: ${cases.length - fails}/${cases.length} OK (${fails} fallos)` : "RESPONSIVE: 5/5 OK");
    process.exitCode = fails ? 1 : 0;
    ws.close();
  } finally {
    browser.kill();
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (_) {}
  }
})().catch((e) => { console.error(e.stack || e); process.exitCode = 1; });