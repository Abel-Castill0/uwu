/* Smoke reproducible: el selftest cubre interacción; aquí se valida el shell publicado. */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const required = ["index.html", "styles.css", "script.js", "productos.js", "config.js", "descuentos.js", "animations.js", "sw.js", "offline.html", "404.html", "manifest.webmanifest", "robots.txt", "sitemap.xml", "img/og-cover.webp"];
let fail = 0;
for (const item of required) { const ok = fs.existsSync(path.join(root, item)); console.log(`${ok ? "PASS" : "FAIL"} ${item}`); if (!ok) fail += 1; }
console.log(`SMOKE: ${required.length - fail} PASS | ${fail} FAIL`); process.exitCode = fail ? 1 : 0;
