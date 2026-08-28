/*
 * optimize-images.js — Optimiza las imágenes del sitio.
 *
 * Jobs:
 *  1) img/perfumes  → img/perfumes_optimized (1000px, q82) — NO destructivo
 *     (el original en img/perfumes/ no se toca). PNG/JPG se convierten a
 *     WebP (cambia la extensión a .webp, mismo nombre de archivo).
 *     Es la imagen que sirve TODO el sitio (grid, modal, carrito, checkout):
 *     productos.js referencia directamente img/perfumes_optimized/*.webp.
 *  2) img/filtros   → SOBRESCRIBE en sitio (800px, q80).
 *  3) img/promos    → SOBRESCRIBE en sitio (1200px, q80).
 *
 * USO:
 *   1) npm install sharp
 *   2) node tools/optimize-images.js
 *
 * Flags:
 *   --only=filtros,promos   procesa solo esos jobs (coma-separado: perfumes|filtros|promos)
 */
"use strict";

const fs = require("fs");
const path = require("path");

let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  console.error(
    "\n❌ Falta la dependencia 'sharp'.\n   Instálala con:  npm install sharp\n",
  );
  process.exit(1);
}

const ROOT = path.resolve(__dirname, "..");
const QUALITY = 80;

// Definición de trabajos. `inPlace: true` sobrescribe los originales.
// `quality` por trabajo permite afinar peso/nitidez sin tocar el resto.
const JOBS = [
  { name: "perfumes", src: "img/perfumes", out: "img/perfumes_optimized", width: 1000, quality: 82, inPlace: false },
  { name: "filtros", src: "img/filtros", out: "img/filtros", width: 800, inPlace: true },
  { name: "promos", src: "img/promos", out: "img/promos", width: 1200, inPlace: true },
];

const onlyArg = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1];
const onlySet = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim())) : null;

async function processFile(inPath, outPath, width, inPlace, quality) {
  // Para sobrescribir, sharp no puede leer y escribir el mismo archivo a la vez:
  // escribimos a un temporal y luego reemplazamos.
  const target = inPlace ? outPath + ".tmp" : outPath;
  const meta = await sharp(inPath).metadata();
  const w = meta.width && meta.width < width ? meta.width : width;
  await sharp(inPath)
    .resize({ width: w, withoutEnlargement: true })
    .webp({ quality: quality || QUALITY })
    .toFile(target);
  if (inPlace) {
    fs.renameSync(target, outPath);
  }
}

async function runJob(job) {
  const srcDir = path.join(ROOT, job.src);
  const outDir = path.join(ROOT, job.out);
  if (!fs.existsSync(srcDir)) {
    console.log(`⏭️  [${job.name}] no existe ${job.src}, omitido.`);
    return { ok: 0, failed: 0, saved: 0 };
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(srcDir).filter((f) => /\.(webp|png|jpe?g)$/i.test(f));
  console.log(`\n🔧 [${job.name}] ${files.length} imágenes → ${job.width}px (q${QUALITY})${job.inPlace ? " · sobrescribe" : " · copia a " + job.out}`);

  let ok = 0, failed = 0, before = 0, after = 0;
  for (const file of files) {
    const inPath = path.join(srcDir, file);
    // PNG/JPG se convierten a WebP (cambia la extensión); los WebP conservan su nombre.
    const outName = /\.(png|jpe?g)$/i.test(file) && !job.inPlace ? file.replace(/\.(png|jpe?g)$/i, ".webp") : file;
    const outPath = path.join(outDir, outName);
    try {
      const sizeBefore = fs.statSync(inPath).size;
      await processFile(inPath, outPath, job.width, job.inPlace, job.quality);
      const sizeAfter = fs.statSync(outPath).size;
      before += sizeBefore; after += sizeAfter;
      ok++;
      console.log(`  ✓ ${file}  ${(sizeBefore / 1024).toFixed(0)}KB → ${(sizeAfter / 1024).toFixed(0)}KB`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${file} — ${err.message}`);
    }
  }
  return { ok, failed, saved: before - after };
}

async function run() {
  const jobs = JOBS.filter((j) => !onlySet || onlySet.has(j.name));
  let totalSaved = 0, totalOk = 0, totalFail = 0;
  for (const job of jobs) {
    const r = await runJob(job);
    totalOk += r.ok; totalFail += r.failed; totalSaved += r.saved;
  }
  console.log(`\n✅ Listo. Optimizadas: ${totalOk} · Fallidas: ${totalFail} · Ahorro: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
}

run().catch((e) => { console.error(e); process.exit(1); });
