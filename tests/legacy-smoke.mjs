import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8090";
const results = [];
const errors = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("status of 404")) errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

try {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
  check("index carga", true);
  const title = await page.title();
  check("titulo contiene marca", /fragrance obsession/i.test(title), title);
  check("logo visible", await page.locator("header .logo").isVisible().catch(() => false));
  const hero = await page.locator(".hero-video, #heroVideo, .hero").first().isVisible().catch(() => false);
  check("hero visible", hero);

  await page.evaluate(() => navigateTo("catalogo"));
  await page.waitForTimeout(800);

  const productCount = await page.locator("#catalogGrid .product-card").count();
  check("productos renderizados > 0", productCount > 0, `${productCount} tarjetas`);

  const firstCard = page.locator("#catalogGrid .product-card").first();
  if (productCount > 0) {
    await firstCard.scrollIntoViewIfNeeded().catch(() => {});
    await firstCard.click().catch(() => {});
    await page.waitForTimeout(600);
    const modalVisible = await page.locator("#modalOverlay").isVisible().catch(() => false);
    check("modal producto abre", modalVisible);
    if (modalVisible) {
      await page.locator("#modal .modal-close, #modal [data-close], #modalOverlay .modal-close").first().click().catch(() => {});
    }
  } else {
    check("modal producto abre", false, "no hay tarjeta para abrir");
  }

  const search = page.locator("#catalogSearch");
  if ((await search.count()) > 0) {
    await search.scrollIntoViewIfNeeded().catch(() => {});
    await search.fill("zzzz-no-existe");
    await page.waitForTimeout(800);
    const zeroResults = await page.locator("#catalogGrid .product-card").count();
    check("busqueda con texto invalido vacia el grid", zeroResults === 0, `${zeroResults} tarjetas`);
    await search.fill("");
    await page.waitForTimeout(800);
    const restored = await page.locator("#catalogGrid .product-card").count();
    check("limpiar busqueda restaura el grid", restored === productCount, `${restored}/${productCount}`);
  }

  for (const p of ["/privacidad.html", "/terminos.html"]) {
    await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
    const h1 = await page.locator("h1, .legal-title").first().textContent().catch(() => "");
    check(p + " carga con titulo", h1.trim().length > 0, h1.trim().slice(0, 40));
  }

  const robots = await page.request.get(BASE + "/robots.txt");
  check("robots.txt 200", robots.status() === 200, "HTTP " + robots.status());
  const sitemap = await page.request.get(BASE + "/sitemap.xml");
  check("sitemap.xml 200", sitemap.status() === 200, "HTTP " + sitemap.status());

  const resp404 = await page.request.get(BASE + "/no-existe-xyz.html");
  check("ruta inexistente devuelve 404", resp404.status() === 404, "HTTP " + resp404.status() + " (en GH Pages se sirve 404.html custom)");
} catch (e) {
  check("smoke global", false, String(e));
}

check("sin errores de consola", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();

const failed = results.filter((r) => !r.ok).length;
console.log(`\nSMOKE: ${results.length - failed} PASS | ${failed} FAIL`);
process.exit(failed === 0 ? 0 : 1);
