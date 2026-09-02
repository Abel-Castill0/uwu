/* Verificación responsive programática (Fase 2/6). Usa pasos con delay como la
   suite real: navega, espera render, abre modal y carrito, mide en cada viewport. */
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const edge = process.env.EDGE_PATH || [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(fs.existsSync);
const port = Number(process.env.RESP_CDP_PORT || 9595);
const profile = path.join(os.tmpdir(), `fo-resp-${process.pid}`);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".mp4": "video/mp4" };
function createServer() {
  return http.createServer((req, res) => {
    let pathname = decodeURIComponent(req.url.split("?")[0]);
    if (pathname === "/" || pathname === "") pathname = "/index.html";
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
}

(async () => {
  const app = createServer();
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${app.address().port}/`;
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
      { w: 320, h: 568, touch: true }, { w: 360, h: 800, touch: true },
      { w: 390, h: 844, touch: true }, { w: 412, h: 915, touch: true },
      { w: 768, h: 1024, touch: false }, { w: 1024, h: 900, touch: false },
      { w: 1280, h: 900, touch: false }, { w: 1366, h: 900, touch: false },
      { w: 1440, h: 900, touch: false }, { w: 1600, h: 900, touch: false },
      { w: 1920, h: 1080, touch: false },
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
      const cardBounds = await evalv(`(() => {
        const cards = Array.from(document.querySelectorAll('#catalogGrid .product-card'));
        const leak = (card) => {
          const box = card.getBoundingClientRect();
          if (card.scrollWidth > card.clientWidth + 1) return true;
          return Array.from(card.querySelectorAll('.product-badge, .product-price-block, .product-price, .price-special-label, .price-final, .btn-add')).some((el) => {
            const rect = el.getBoundingClientRect();
            return rect.left < box.left - 1 || rect.right > box.right + 1;
          });
        };
        return { count: cards.length, leaks: cards.filter(leak).map((card) => card.dataset.productId), stock: document.querySelectorAll('.stock-chip').length, simulatedCopy: /Quedan \\d|Últimas unidades/.test(document.getElementById('catalogGrid').textContent) };
      })()`);
      await evalv("var __full=document.querySelector('[data-filter=\"completos\"]'); if(__full) __full.click();");
      await delay(500);
      const fullBounds = await evalv(`(() => {
        const cards = Array.from(document.querySelectorAll('#catalogGrid .product-card'));
        const leak = (card) => {
          const box = card.getBoundingClientRect();
          if (card.scrollWidth > card.clientWidth + 1) return true;
          return Array.from(card.querySelectorAll('.product-badge, .product-price-block, .product-price, .price-special-label, .price-final, .btn-add')).some((el) => {
            const rect = el.getBoundingClientRect();
            return rect.left < box.left - 1 || rect.right > box.right + 1;
          });
        };
        return { count: cards.length, leaks: cards.filter(leak).map((card) => card.dataset.productId), special: cards.filter((card) => card.querySelector('.price-special-label')).length };
      })()`);
      await evalv("window.navigateTo('catalogo')");
      await delay(500);
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

      // maxHeight en px debe ser ≈ 92% del alto del viewport (92vh/92dvh)
      const ratio = parseFloat(modalMaxH) / c.h;
      const modalOk = modalActive && Math.abs(ratio - 0.92) < 0.02;
      const cartOk = cartActive;
      const overOk = !overX;
      const closeOk = (c.touch && closeH >= 44) || (!c.touch && closeH >= 34);
      const cardsOk = cardBounds.leaks.length === 0 && fullBounds.leaks.length === 0 && cardBounds.stock === 0 && !cardBounds.simulatedCopy && fullBounds.count === 8 && fullBounds.special === 8;
      console.log(`${c.w}x${c.h}: cols=${cols} normal=${cardBounds.count}/leaks:${cardBounds.leaks.length} full=${fullBounds.count}/leaks:${fullBounds.leaks.length}/special:${fullBounds.special} modal=${modalActive} maxH=${modalMaxH}(ratio ${ratio.toFixed(2)}) cart=${cartActive} closeH=${closeH} overX=${overX}`);
      if (!modalOk || !cartOk || !overOk || !closeOk || !cardsOk) { fails += 1; console.log("  >>> FALLO"); }
    }
    console.log(fails ? `RESPONSIVE: ${cases.length - fails}/${cases.length} OK (${fails} fallos)` : `RESPONSIVE: ${cases.length}/${cases.length} OK`);
    process.exitCode = fails ? 1 : 0;
    ws.close();
  } finally {
    browser.kill();
    await new Promise((resolve) => app.close(resolve));
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (_) {}
  }
})().catch((e) => { console.error(e.stack || e); process.exitCode = 1; });
