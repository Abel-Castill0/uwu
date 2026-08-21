/* Verificación de contraste (Fase 4): calcula ratio WCAG de los colores de texto
   clave contra su fondo en light y dark, con las paletas reales de la app. */
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
const port = Number(process.env.CONTRAST_CDP_PORT || 9596);
const profile = path.join(os.tmpdir(), `fo-contrast-${process.pid}`);
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
    const evalv = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result.value;
    await new Promise((r) => { ws.onopen = r; });

    await send("Page.navigate", { url });
    await delay(1800);

    for (const theme of ["light", "dark"]) {
      await evalv(`document.documentElement.setAttribute('data-theme','${theme}')`);
      await delay(400);
      const checks = JSON.parse(await evalv(`(() => {
        // Fondo/color pueden venir en rgb() o rgba(); parseamos los 3-4 números tal cual.
        const parts = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
        const lum = ([r, g, b]) => {
          const f = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
          return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
        };
        const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return ((l1 + 0.05) / (l2 + 0.05)).toFixed(2); };
        // Composita fg (que puede ser semitransparente, p.ej. rgba(255,255,255,.48))
        // sobre bg antes de medir luminancia: ignorar el alpha da ratios falsos.
        const composite = (fg, bg) => {
          const [r, g, b, a = 1] = parts(fg);
          const [br, bg2, bb] = parts(bg);
          if (a >= 0.999) return [r, g, b];
          return [r, g, b].map((v, i) => a * v + (1 - a) * [br, bg2, bb][i]);
        };
        const cs = getComputedStyle;
        // Sube por los ancestros hasta encontrar el primer fondo opaco real
        // (un <a> o <span> normalmente no pinta su propio fondo).
        const effectiveBg = (el) => {
          let node = el;
          while (node) {
            const bg = cs(node).backgroundColor;
            const p = parts(bg);
            if (p.length >= 3 && (p.length < 4 || p[3] > 0.01)) return bg;
            node = node.parentElement;
          }
          return cs(document.body).backgroundColor;
        };
        const sel = (s, fgProp) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const fg = cs(el)[fgProp];
          const bg = effectiveBg(el);
          return ratio(composite(fg, bg), parts(bg));
        };
        return JSON.stringify({
          bodyText: sel('body', 'color'),
          productName: sel('.product-card .product-name', 'color'),
          productPrice: sel('.product-card .product-price', 'color'),
          cardBtn: sel('.product-card .btn-add', 'color'),
          muted: sel('.product-card .product-category', 'color'),
          link: sel('#footerInfoLinks a', 'color'),
        });
      })()`));
      console.log(`--- TEMA ${theme.toUpperCase()} (ratio ≥4.5 normal / ≥3 grande) ---`);
      for (const [k, v] of Object.entries(checks)) console.log(`  ${k}: ${v}`);
    }
    ws.close();
  } finally {
    browser.kill();
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (_) {}
  }
})().catch((e) => { console.error(e.stack || e); process.exitCode = 1; });