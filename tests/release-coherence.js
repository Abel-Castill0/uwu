const assert = require("assert");
const { chromium } = require("playwright");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const release = "20260915";
const critical = ["styles.css", "config.js", "descuentos.js", "productos.js", "hero-stats.js", "animations.js", "script.js"];
const legacyAssets = Object.fromEntries(critical.map((file) => [file, file.endsWith(".css") ? "button{font:caption}" : "window.LEGACY_APP=true"]));
const legacyWorker = `
const CACHE="core-legacy";
const ASSETS=${JSON.stringify(critical)};
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.mode==="navigate") return event.respondWith(fetch(request));
  if(url.origin!==self.location.origin || !/\\.(?:css|js)$/.test(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const hit=await cache.match(request);
    const fresh=fetch(request).then(response=>{if(response.ok)cache.put(request,response.clone());return response}).catch(()=>hit);
    return hit||fresh;
  }));
});`;
const legacyHtml = `<!doctype html><link rel="stylesheet" href="styles.css"><script src="script.js"></script><script>navigator.serviceWorker.register("./sw.js")</script>`;
let mode = "legacy";
let browser;
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".mp4": "video/mp4" };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const name = pathname === "/" ? "index.html" : pathname.slice(1);
  if (mode === "legacy" && name === "index.html") return send(res, legacyHtml, ".html");
  if (mode === "legacy" && name === "sw.js") return send(res, legacyWorker, ".js");
  if (mode === "legacy" && legacyAssets[name]) return send(res, legacyAssets[name], path.extname(name));
  const file = path.resolve(root, name);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
});

function send(res, body, extension) {
  res.writeHead(200, { "Content-Type": mime[extension], "Cache-Control": "no-store" });
  res.end(body);
}

(async () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  for (const file of critical) {
    assert.match(html, new RegExp(`["']${file.replace(".", "\\.")}\\?v=${release}["']`), `${file} is not release-versioned in index.html`);
    assert(worker.includes(file), `${file} is missing from the service-worker precache`);
  }
  assert(worker.includes(`const RELEASE = "${release}"`), "service worker and HTML release tokens differ");

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
  const context = await browser.newContext();
  await context.route("https://**", (route) => route.abort());
  const page = await context.newPage();

  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.reload({ waitUntil: "domcontentloaded" });
  mode = "current";
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("#featuredGrid .product-card"));

  const state = await page.evaluate(() => {
    const brands = document.querySelector("#navBrandsBtn");
    const firstLink = document.querySelector("#nav a");
    const cta = document.querySelector("#leaveReviewBtn");
    const keys = ["appearance", "backgroundColor", "borderTopWidth", "boxShadow", "fontSize", "fontWeight", "letterSpacing", "lineHeight", "paddingTop"];
    const style = (element) => Object.fromEntries(keys.map((key) => [key, getComputedStyle(element)[key]]));
    cta.click();
    return {
      nav: Array.from(document.querySelectorAll("#nav .nav-links > a, #nav .nav-links > button")).map((element) => element.textContent.trim()),
      brandStyle: style(brands),
      linkStyle: style(firstLink),
      reviewOpened: document.querySelector("#reviewModalOverlay").classList.contains("active"),
      scrollLocked: getComputedStyle(document.body).overflow === "hidden",
      iframeSrc: document.querySelector("#senja-collector-iframe")?.src || "",
    };
  });
  assert.deepStrictEqual(state.nav, ["Inicio", "Catálogo", "Marcas", "Combos", "Comentarios"]);
  assert.deepStrictEqual(state.brandStyle, state.linkStyle);
  assert.strictEqual(state.reviewOpened, true);
  assert.strictEqual(state.scrollLocked, true);
  assert.match(state.iframeSrc, /^https:\/\/senja\.io\//);
  await page.locator("#reviewModalClose").click();
  await page.waitForFunction(() => document.activeElement?.id === "leaveReviewBtn");
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), "visible");

  await context.close();

  const offlineContext = await browser.newContext();
  await offlineContext.route("https://**", (route) => route.abort());
  const offlinePage = await offlineContext.newPage();
  await offlinePage.goto(origin, { waitUntil: "domcontentloaded" });
  await offlinePage.waitForFunction(() => navigator.serviceWorker.controller);
  await offlinePage.reload({ waitUntil: "domcontentloaded" });
  await offlinePage.waitForFunction(() => caches.match("offline.html").then(Boolean));
  await offlineContext.setOffline(true);
  await offlinePage.reload({ waitUntil: "domcontentloaded" });
  assert.strictEqual(await offlinePage.locator(".off-title").innerText(), "Estás sin conexión");
  assert.strictEqual(await offlinePage.locator('link[href="styles.css?v=20260915"]').evaluate((element) => !!element.sheet), true);
  await offlineContext.setOffline(false);

  const noJs = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: "block" });
  const noJsPage = await noJs.newPage();
  await noJsPage.goto(origin, { waitUntil: "domcontentloaded" });
  assert.strictEqual(await noJsPage.locator("#leaveReviewBtn").getAttribute("href"), "https://senja.io/p/fragrance-obsession/r/ZY90RH");
  assert.strictEqual(await noJsPage.locator("#leaveReviewBtn").evaluate((element) => element.tagName), "A");

  const delayed = await browser.newContext({ serviceWorkers: "block" });
  await delayed.route("https://**", (route) => route.abort());
  const delayedPage = await delayed.newPage();
  await delayedPage.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => document.querySelector("#senjaWidget")?.attachShadow({ mode: "open" }));
  });
  await delayedPage.goto(origin, { waitUntil: "domcontentloaded" });
  await delayedPage.waitForTimeout(3200);
  await delayedPage.evaluate(() => {
    const card = document.createElement("article");
    card.className = "sj-card";
    document.querySelector("#senjaWidget").shadowRoot.appendChild(card);
  });
  await delayedPage.waitForFunction(() => getComputedStyle(document.querySelector("#senjaWidget")).display !== "none" && document.querySelector("#reviewsEmptyState").hidden);

  await browser.close();
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  console.log("release coherence: PASS");
})().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  await browser?.close();
  server.closeAllConnections?.();
  server.close();
});
