"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const context = { window: { location: { origin: "http://localhost", pathname: "/" } } };
vm.runInNewContext(read("config.js"), context);
vm.runInNewContext(read("productos.js"), context);
const { FO_CONFIG: config, FO_PRODUCTS: products } = context.window;
const product = (id) => products.find((entry) => entry.id === id);

assert.equal(new Set(products.map((entry) => entry.id)).size, products.length, "IDs de producto únicos");
for (const id of [143, 153, 155]) {
  const item = product(id);
  assert.ok(item.sealed && item.fullSoldOut === true, `Frasco ${id} agotado`);
  assert.equal(item.public, undefined, `Frasco ${id} se mantiene visible`);
}
for (const id of [68, 81, 101]) {
  assert.ok(Object.keys(product(id).decantSizes).length > 0, `Decant ${id} conserva precios`);
}
assert.ok(!config.PROXIMAMENTE.includes(101), "Sedley decant está disponible");
assert.ok(config.PROXIMAMENTE.includes(159), "Perseus permanece próximamente, como en sus fotos");
assert.equal(Object.keys(product(159).decantSizes).length, 0, "No inventar precios de Perseus");
assert.ok(product(160).sealed && !product(160).quoteOnly, "Sedley sellado tiene precio confirmado");
assert.equal(product(160).fullSizes[125], 950, "Sedley sellado 125ml S/950");
assert.equal(product(160).sealedSize, "125ml", "Sedley incluye presentación completa");
assert.equal(Object.keys(product(160).fullSizes).length, 1, "Sedley no anuncia tamaños no confirmados");
assert.ok(!product(161).quoteOnly && !product(161).sealed, "Valero decant habilitado para compra directa");
for (const [size, price] of Object.entries({1:25,2:49,3:69,5:105,10:209,30:525})) {
  assert.equal(product(161).decantSizes[size], price, `Valero ${size}ml S/${price}`);
}
assert.equal(Object.keys(product(161).decantSizes).length, 6, "Valero conserva exactamente las seis presentaciones informadas");
assert.equal(product(162).fullSizes[100], 1250, "Valero sellado 100ml S/1250 confirmado en foto");
assert.equal(product(162).regularPrice, undefined, "Sin precio referencial inventado");

const paths = [
  "img/perfumes_optimized/SEDLEY.webp",
  "img/perfumes_optimized/SEDLEY 30ml.webp",
  "img/perfumes_optimized/SEDLEY decant premium 5ml.webp",
  "img/perfumes_optimized/SEDLEY decant premium 10 ml.webp",
  "img/perfumes_optimized/PERSEUS.webp",
  "img/perfumes_optimized/PERSEUS 30ml.webp",
  "img/perfumes_optimized/PERSEUS decant premium 5ml.webp",
  "img/perfumes_optimized/PERSEUS decant premium 10 ml.webp",
  "img/perfumes_optimized/VALERO.webp",
  "img/perfumes_optimized/VALERO 100ML SELLADO.webp",
  "img/perfumes_optimized/TROPIKALYS KARMA 50ML SELLADO.webp",
  "img/perfumes_optimized/EDEN ROCK 30ml.webp",
  "img/perfumes_optimized/EDEN ROCK decant premium 5ml.webp",
  "img/perfumes_optimized/EDEN ROCK decant premium 10 ml.webp",
];
for (const image of paths) {
  assert.ok(fs.statSync(path.join(root, image)).size > 1000, `Imagen WebP disponible: ${image}`);
}
for (const id of [159, 160, 161, 162]) {
  assert.ok(fs.existsSync(path.join(root, product(id).cardImage)), `Foto principal ${id}`);
}

// Ejecuta las funciones reales de disponibilidad del script con datos del catálogo.
const source = read("script.js");
const functions = ["isComingSoon", "isUnavailable", "isFullBottleSoldOut", "catalogStockRank"]
  .map((name) => {
    const match = source.match(new RegExp(`  function ${name}\\([^]*?\\n  \\}`));
    assert.ok(match, `Función de stock ${name} existe`);
    return match[0];
  }).join("\n");
const ranked = vm.runInNewContext(`(function () { const FO = window.FO_CONFIG; ${functions};
  return [143, 161, 159, 101, 153, 162, 155].map((id) => window.FO_PRODUCTS.find((p) => p.id === id))
    .sort((a, b) => catalogStockRank(a) - catalogStockRank(b)).map((p) => p.id);
})()`, context);
assert.deepEqual(Array.from(ranked), [161, 101, 162, 143, 159, 153, 155], "Disponibles arriba; agotados y próximos abajo, orden estable");
assert.ok(source.includes("return filtered.sort((a, b) => catalogStockRank(a) - catalogStockRank(b));"), "Orden integrado en filtros y búsqueda");

console.log("PASS: observaciones del cliente, stock, orden, precios e imágenes (14 archivos)");
