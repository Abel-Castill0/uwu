/* Verificación CDP de la fase Mobile/UX (2026-08-20): grid 2 col móvil,
   offcanvas de filtros open/close, topbar WhatsApp = IG/TikTok, logos de pago
   contenidos, sin overflow. Usa Edge headless + CDP, sin dependencias. */
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
const port = Number(process.env.MOB_CDP_PORT || 9597);
const profile = path.join(os.tmpdir(), `fo-mob-${process.pid}`);
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
      { w: 414, h: 896, expCols: 2, touch: true },
      { w: 430, h: 932, expCols: 2, touch: true },
      { w: 768, h: 1024, expCols: 3, touch: false },
      { w: 1280, h: 900, expCols: 5, touch: false },
    ];
    let fails = 0;
    for (const c of cases) {
      await send("Emulation.setDeviceMetricsOverride", { width: c.w, height: c.h, deviceScaleFactor: 1, mobile: c.touch });
      await send("Emulation.setTouchEmulationEnabled", { enabled: c.touch, maxTouchPoints: 5 });
      await send("Page.navigate", { url });
      await delay(1600);
      await evalv("window.navigateTo('catalogo')");
      await delay(700);
      const cols = await evalv("getComputedStyle(document.getElementById('catalogGrid')).gridTemplateColumns.split(' ').length");
      const overX = await evalv("document.documentElement.scrollWidth > window.innerWidth");
      const pillVisible = await evalv("document.querySelector('.cat-pill--cat') ? getComputedStyle(document.querySelector('.cat-pill--cat')).display !== 'none' : null");
      const btnFilterVisible = await evalv("document.getElementById('btnFiltersMobile') ? getComputedStyle(document.getElementById('btnFiltersMobile')).display !== 'none' : null");
      const waHref = await evalv("var w=document.querySelector('.topbar-social a[data-wa-link]'); w ? w.getAttribute('href') : null");
      const waClass = await evalv("var w=document.querySelector('.topbar-social a[data-wa-link]'); w ? w.className : null");
      const socialVisible = await evalv("document.querySelector('.topbar-social') ? getComputedStyle(document.querySelector('.topbar-social')).display !== 'none' : null");
      const socialH = await evalv("document.querySelector('.topbar-social a') ? Math.round(document.querySelector('.topbar-social a').getBoundingClientRect().height) : 0");
      const waAlign = await evalv("(function(){ var w=document.querySelector('.topbar-social a[data-wa-link]'); var i=document.querySelector('.topbar-social a[data-ig-link]'); if(!w||!i) return null; var rw=w.getBoundingClientRect(), ri=i.getBoundingClientRect(); return Math.abs(rw.top - ri.top) < 2 && Math.abs(rw.height - ri.height) < 2; })()");

      // Offcanvas: abrir, verificar, cerrar
      let oc = null;
      if (btnFilterVisible) {
        await evalv("document.getElementById('btnFiltersMobile').click()");
        await delay(450);
        const open1 = await evalv("document.getElementById('filtersOffcanvas').classList.contains('open')");
        const vis = await evalv("getComputedStyle(document.getElementById('filtersOffcanvas')).visibility");
        const z = await evalv("getComputedStyle(document.getElementById('filtersOffcanvas')).zIndex");
        const translate = await evalv("getComputedStyle(document.getElementById('filtersOffcanvas')).transform");
        const isFixed = await evalv("getComputedStyle(document.getElementById('filtersOffcanvas')).position");
        await evalv("document.getElementById('filtersCloseBtn').click()");
        await delay(450);
        const open2 = await evalv("document.getElementById('filtersOffcanvas').classList.contains('open')");
        oc = { open1, vis, z, isFixed, translate, open2 };
      }

      // Logos de pago (checkout): necesita un item en el carrito para que el formulario sea visible
      await evalv("var __add=document.querySelector('#catalogGrid .product-card .btn-add[data-add-id]'); if(__add) __add.click();");
      await delay(400);
      await evalv("var __m=document.getElementById('modalAddBtn'); if(__m) __m.click();");
      await delay(400);
      await evalv("window.navigateTo('checkout')");
      await delay(1200);
      const logoW = await evalv("(function(){ var i=document.querySelector('.pay-method__icon--logos img'); return i ? Math.round(i.getBoundingClientRect().width) : null; })()");
      const iconOver = await evalv("(function(){ var c=document.querySelector('.pay-method__icon--logos'); if(!c) return null; var r=c.getBoundingClientRect(); return r.width > c.parentElement.getBoundingClientRect().width; })()");

      const colOk = cols === c.expCols;
      const overOk = !overX;
      const pillOk = c.touch ? pillVisible === false : pillVisible === true;
      const btnOk = c.touch ? btnFilterVisible === true : btnFilterVisible === false;
      const waOk = !!waHref && waHref.indexOf("wa.me/51994467586") !== -1 && !!waClass && waClass.indexOf("fa-whatsapp") !== -1;
      const socOk = socialVisible === true;
      const touchOk = !c.touch || socialH >= 44;
      const alignOk = waAlign === true;
      const ocOk = !btnFilterVisible ? true : !!(oc && oc.open1 && oc.vis === "visible" && oc.z === "5200" && oc.isFixed === "fixed" && !oc.open2);
      const logoOk = (logoW !== null) && (logoW >= 30 && logoW <= 40) && iconOver === false;

      const ocTxt = oc ? `open=${oc.open1} vis=${oc.vis} z=${oc.z} fixed=${oc.isFixed} close=${!oc.open2}` : "offcanvas-n/a";
      console.log(`${c.w}x${c.h}: cols=${cols}(esp ${c.expCols}) overX=${overX} pill=${pillVisible} btn=${btnFilterVisible} wa=[${waClass}|${waHref}] social=${socialVisible} h=${socialH} align=${waAlign} | ${ocTxt} | logoW=${logoW} iconOver=${iconOver}`);
      const ok = colOk && overOk && pillOk && btnOk && waOk && socOk && touchOk && alignOk && ocOk && logoOk;
      if (!ok) { fails += 1; console.log("  >>> FALLO:", { colOk, overOk, pillOk, btnOk, waOk, socOk, touchOk, alignOk, ocOk, logoOk }); }
    }
    console.log(fails ? `MOBILE: ${cases.length - fails}/${cases.length} OK (${fails} fallos)` : "MOBILE: 6/6 OK");
    process.exitCode = fails ? 1 : 0;
    ws.close();
  } finally {
    browser.kill();
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (_) {}
  }
})().catch((e) => { console.error(e.stack || e); process.exitCode = 1; });