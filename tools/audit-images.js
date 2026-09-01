/*
 * audit-images.js — Auditor determinista de imagenes de producto.
 *
 * Por que existe: reproducir a mano "abre 500 fotos y compara" es lento y
 * poco confiable. Este script recorre CADA producto x CADA presentacion
 * que realmente ofrece (decants + variantes premium 5/10ml que el modal
 * genera dinamicamente + fullSizes) y aplica exactamente la misma cadena
 * de resolucion que sizeImage()/cardImg() en script.js, verificando cada
 * ruta contra el filesystem real (case-sensitive, como GitHub Pages/Linux
 * -- Windows no distingue mayusculas y puede ocultar un 404 real).
 *
 * USO:
 *   node tools/audit-images.js            (reporte completo)
 *   node tools/audit-images.js --fails    (solo filas con problema real)
 *
 * Exit code: 1 si hay MISSING / LEGACY_BRAND / BROKEN_PATH, 0 si no.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const IMG_DIR = path.join(ROOT, "img", "perfumes_optimized");

global.window = global;
require(path.join(ROOT, "config.js"));
require(path.join(ROOT, "productos.js"));
const products = global.FO_PRODUCTS;

const PLACEHOLDER = "img/perfumes_optimized/placeholder.webp";
const onlyFails = process.argv.includes("--fails");

/* Listado real del disco (case-sensitive, coincide con Set para lookup O(1)). */
const diskFiles = new Set(fs.readdirSync(IMG_DIR));

function existsOnDisk(relPath) {
  if (!relPath) return false;
  const fname = path.basename(relPath);
  return diskFiles.has(fname);
}

/* Misma cadena que sizeImage() en script.js -- si esa funcion cambia,
   este script debe actualizarse junto con ella (comentario cruzado). */
function resolveSizeImage(p, size) {
  if (!p.sizeImages) return p.cardImage || "";
  return p.sizeImages[size] || p.sizeImages[size + "ml"] || p.sizeImages[size + " ml"] || p.cardImage || "";
}

/* Mismas presentaciones que getDisplayDecantSizes(): 5ml/10ml ganan una
   variante "_premium" adicional si no la tienen ya declarada aparte. */
function offeredPresentations(p) {
  const list = [];
  Object.keys(p.decantSizes || {}).forEach((s) => list.push(s));
  if (p.decantSizes && p.decantSizes["5"] && !p.decantSizes["5_premium"]) list.push("5_premium");
  if (p.decantSizes && p.decantSizes["10"] && !p.decantSizes["10_premium"]) list.push("10_premium");
  Object.keys(p.fullSizes || {}).forEach((s) => { if (!list.includes(s)) list.push(s); });
  return list;
}

const rows = [];
/* file real (no placeholder) -> [{product, size}] que resuelven ahi;
   detecta 2 productos distintos compartiendo por error la misma foto. */
const usageByFile = new Map();

products.forEach((p) => {
  offeredPresentations(p).forEach((size) => {
    const resolved = resolveSizeImage(p, size);
    const onDisk = existsOnDisk(resolved);
    let status;
    if (!resolved) status = "MISSING";
    else if (resolved === PLACEHOLDER) status = "LEGACY_BRAND";
    else if (!onDisk) status = "BROKEN_PATH";
    else if (resolved === (p.cardImage || "")) status = "OK_FALLBACK_MAIN"; // valido: no hay foto especifica de esta talla
    else status = "OK";

    rows.push({ id: p.id, name: p.name, size, resolved, status });

    if (onDisk && resolved !== PLACEHOLDER) {
      const key = resolved.toLowerCase();
      if (!usageByFile.has(key)) usageByFile.set(key, []);
      usageByFile.get(key).push({ id: p.id, name: p.name, size });
    }
  });
});

/* DUPLICATE_SUSPICIOUS: el mismo archivo real sirviendo a 2+ PRODUCTOS
   (ids) distintos -- una talla normal cayendo a cardImage no cuenta como
   sospechoso si es EL MISMO producto en varias tallas (eso es esperado). */
const duplicates = [];
usageByFile.forEach((uses, file) => {
  const distinctIds = [...new Set(uses.map((u) => u.id))];
  if (distinctIds.length > 1) duplicates.push({ file, uses });
});

/* UNUSED_EXACT_ASSET: archivos en disco cuyo nombre empieza igual que la
   imagen principal de un producto (mismo "stem") pero que NINGUNA
   presentacion de ese producto referencia -- candidato a foto real
   subida y nunca conectada al mapping. Heuristico por prefijo, no exacto
   al 100%, pero suficiente para señalar candidatos sin revisar 500 a mano. */
const referencedFiles = new Set(rows.filter((r) => r.status === "OK" || r.status === "OK_FALLBACK_MAIN").map((r) => path.basename(r.resolved).toLowerCase()));
const unusedCandidates = [];
products.forEach((p) => {
  if (!p.cardImage) return;
  const stem = path.basename(p.cardImage, ".webp").toLowerCase();
  if (stem.length < 4) return; // evita coincidencias demasiado genericas
  diskFiles.forEach((f) => {
    if (!f.toLowerCase().startsWith(stem)) return;
    if (referencedFiles.has(f.toLowerCase())) return;
    if (f.toLowerCase() === path.basename(p.cardImage).toLowerCase()) return;
    unusedCandidates.push({ productId: p.id, productName: p.name, file: f });
  });
});

/* ── Reporte ── */
const problems = rows.filter((r) => ["MISSING", "LEGACY_BRAND", "BROKEN_PATH"].includes(r.status));
const toPrint = onlyFails ? problems : rows;
console.log("PRODUCT".padEnd(28) + "SIZE".padEnd(14) + "STATUS".padEnd(18) + "RESOLVED");
toPrint.forEach((r) => {
  console.log(String(r.name).slice(0, 27).padEnd(28) + String(r.size).padEnd(14) + r.status.padEnd(18) + (r.resolved || "(vacio)"));
});

console.log("\n── DUPLICATE_SUSPICIOUS (mismo archivo, productos distintos) ──");
if (!duplicates.length) console.log("(ninguno)");
duplicates.forEach((d) => {
  console.log(d.file + " -> " + d.uses.map((u) => `#${u.id} ${u.name} (${u.size})`).join(", "));
});

console.log("\n── UNUSED_EXACT_ASSET (candidatos: archivo en disco, ningun mapping lo referencia) ──");
if (!unusedCandidates.length) console.log("(ninguno)");
unusedCandidates.forEach((u) => {
  console.log(`#${u.productId} ${u.productName} -> ${u.file}`);
});

const byStatus = {};
rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
console.log("\n── RESUMEN ──");
console.log(`Productos: ${products.length} | Presentaciones auditadas: ${rows.length}`);
Object.entries(byStatus).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log(`  DUPLICATE_SUSPICIOUS: ${duplicates.length}`);
console.log(`  UNUSED_EXACT_ASSET (candidatos): ${unusedCandidates.length}`);

const hardFail = problems.length > 0;
console.log("\nAUDIT: " + (hardFail ? "FAIL (" + problems.length + " problemas reales)" : "PASS"));
process.exit(hardFail ? 1 : 0);
