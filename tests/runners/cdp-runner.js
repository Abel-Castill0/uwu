/* Ejecuta tests/selftest.js en una instancia aislada de Edge mediante CDP. */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const edge = process.env.EDGE_PATH || [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(fs.existsSync);
const url = process.env.SUITE_URL || `file://${path.join(root, "index.html").replace(/\\/g, "/").replace(/ /g, "%20")}`;
const port = Number(process.env.CDP_PORT || 9355);
const profile = path.join(os.tmpdir(), `fo-cdp-${process.pid}`);
const source = `document.addEventListener('DOMContentLoaded',function(){if(!/index\\.html$/.test(location.pathname)&&!location.pathname.endsWith('/'))return;${fs.readFileSync(path.join(root, "tests/selftest.js"), "utf8")}});`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!edge) throw new Error("Microsoft Edge no está disponible. Define EDGE_PATH para la suite CDP.");

(async () => {
  fs.rmSync(profile, { recursive: true, force: true });
  const browser = spawn(edge, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--disable-default-apps", "--window-size=1280,900",
    "--disable-background-timer-throttling", `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`, "about:blank",
  ], { stdio: "ignore" });
  try {
    let tabs;
    for (let i = 0; i < 40; i += 1) {
      // AbortController por intento: sin esto, un solo fetch que se queda
      // esperando (puerto abierto pero sin respuesta) rompe el limite de
      // ~10s que este bucle deberia tener como peor caso.
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 1000);
        tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: ac.signal })).json();
        clearTimeout(t);
        break;
      } catch (_) { await delay(250); }
    }
    if (!tabs) throw new Error("CDP no estuvo disponible a tiempo.");
    const tab = tabs.find((item) => item.type === "page");
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    const pending = new Map(); let id = 0; const errors = [];
    // Sin timeout, una respuesta CDP perdida (crash del navegador, socket que
    // se cae a medias) dejaba este await colgado para siempre: el try/finally
    // nunca se alcanzaba, browser.kill() nunca corría, y el proceso quedaba
    // vivo indefinidamente sin avanzar ni fallar. 25s es generoso frente a lo
    // que tarda un comando CDP normal (ms) pero acota el peor caso: ahora
    // revienta con un error real, el catch de abajo marca exitCode=1 y
    // run-suite.js reintenta una vez -- no cambia el criterio de PASS/FAIL,
    // solo evita el cuelgue indefinido.
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`CDP timeout: ${method} sin respuesta en 25s`));
      }, 25000);
      pending.set(requestId, (result) => { clearTimeout(timer); resolve(result); });
      ws.send(JSON.stringify({ id: requestId, method, params }));
    });
    ws.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id && pending.has(message.id)) { pending.get(message.id)(message.result); pending.delete(message.id); }
      if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    };
    // Igual que send(): sin timeout ni onerror, un socket que nunca abre (o
    // que falla al conectar) dejaba este await colgado para siempre -- el
    // segundo punto de espera indefinida del runner, junto a send().
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP timeout: el WebSocket no abrió en 10s")), 10000);
      ws.onopen = () => { clearTimeout(timer); resolve(); };
      ws.onerror = (err) => { clearTimeout(timer); reject(new Error(`CDP WebSocket error: ${err && err.message ? err.message : err}`)); };
    });
    await send("Page.enable"); await send("Runtime.enable");
    // Viewport determinista: sin esto, la primera navegación puede medir
    // columnas del CSS como si fuera una ventana angosta y falsear
    // catalog5Cols. Emulation.setDeviceMetricsOverride fija 1280x900.
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.addScriptToEvaluateOnNewDocument", { source });
    const waitTitle = async (label) => {
      // El último paso de la suite espera a que el conteo de aserciones se
      // estabilice antes de fijar el título (los timers anidados de load-more,
      // pollCart y E2E ya resolvieron). Capturar el título directamente es
      // suficiente y robusto: tras el resumen, el paso de checkout navega a
      // gracias.html, lo que invalidaría cualquier sondeo posterior de estado.
      for (let i = 0; i < 260; i += 1) {
        await delay(500);
        const result = await send("Runtime.evaluate", { expression: "document.title", returnByValue: true });
        const title = result?.result?.value || "";
        if (title.startsWith("SELFTEST:")) { console.log(`${label} ${title}`); return title; }
      }
      throw new Error(`${label}: la suite excedió el tiempo límite.`);
    };
    const run = async (label) => {
      await send("Page.navigate", { url });
      return waitTitle(label);
    };
    // Warm-up: el primer arranque de Edge (fuentes, caché, cold start) suele
    // falsear aserciones de timing o layout. Se descarta esa carga; la corrida
    // medida es la siguiente navegación, ya en caliente.
    await run("warm-up:");
    await send("Runtime.evaluate", { expression: "localStorage.clear();sessionStorage.clear()" });
    const normal = await run("normal:");
    await send("Runtime.evaluate", { expression: "localStorage.clear();sessionStorage.clear()" });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    const reduced = await run("reduced-motion:");
    if (errors.length) throw new Error(`Excepciones CDP: ${errors.join(" | ")}`);
    if (!/0 FAIL/.test(normal) || !/0 FAIL/.test(reduced)) process.exitCode = 1;
    ws.close();
  } finally {
    browser.kill();
    // Crashpad puede conservar un handle unos milisegundos; no debe falsear
    // una suite que ya terminó. El perfil temporal se limpiará en la próxima ejecución.
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (_) { /* noop */ }
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
