/* ════════════════════════════════════════════════════════════════
   TEST UNITARIOS — DESCUENTOS CON DECANTS PREMIUM (Prompt 11)
   Uso: node test-descuentos.js  (sin dependencias, node >= 12)
   ════════════════════════════════════════════════════════════════ */
"use strict";

/* descuentos.js y config.js son IIFEs que usan `window`. */
global.window = global;
global.FO_CONFIG = global.FO_CONFIG || undefined;

const path = require("path");
const ROOT = __dirname;
require(path.join(ROOT, "config.js"));
require(path.join(ROOT, "descuentos.js"));

const calcular = window.FO_CALCULAR_DESCUENTOS;
const cfg = window.FO_CONFIG.DESCUENTOS;

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log("PASS " + name); }
  else { failed++; console.log("FAIL " + name + (detail ? " — " + detail : "")); }
}
function r2(n) { return Math.round(n * 100) / 100; }

/* ── Caso 1: 2 decants premium → 5% por cantidad ── */
{
  const items = [
    { type: "decant", brand: "MarcaA", size: "5_premium", price: 153, qty: 1 },
    { type: "decant", brand: "MarcaB", size: "10_premium", price: 305, qty: 1 },
  ];
  const d = calcular(items);
  check("premium2_cantDecants", d.cantDecants === 2, "cant=" + d.cantDecants);
  check("premium2_pct5", d.detalleCantidad && d.detalleCantidad.pct === 5, JSON.stringify(d.detalleCantidad));
  check("premium2_dtoCant", d.descuentoCantidad === r2((153 + 305) * 0.05), "dto=" + d.descuentoCantidad);
  check("premium2_final", d.subtotalFinal === 435.1, "final=" + d.subtotalFinal);
}

/* ── Caso 2: 3 premium misma marca → 10% por marca (mayor regla gana) ── */
{
  const items = [
    { type: "decant", brand: "MarcaX", size: "5_premium", price: 153, qty: 1 },
    { type: "decant", brand: "MarcaX", size: "5_premium", price: 153, qty: 1 },
    { type: "decant", brand: "MarcaX", size: "5_premium", price: 153, qty: 1 },
  ];
  const d = calcular(items);
  check("marca3_cantDecants", d.cantDecants === 3, "cant=" + d.cantDecants);
  check("marca3_dtoMarca", d.descuentoMarca === r2(459 * 0.1), "dtoMarca=" + d.descuentoMarca);
  check("marca3_ganaMarca", d.descuentoTotal === d.descuentoMarca && d.descuentoCantidad === 0, "total=" + d.descuentoTotal + " cant=" + d.descuentoCantidad);
  check("marca3_final", d.subtotalFinal === 413.1, "final=" + d.subtotalFinal);
  check("marca3_detalle", d.detalleMarcas.length === 1 && d.detalleMarcas[0].marca === "MarcaX" && d.detalleMarcas[0].cant === 3, JSON.stringify(d.detalleMarcas));
}

/* ── Caso 3: 1 premium + 1 normal (misma marca) → 5% por cantidad ── */
{
  const items = [
    { type: "decant", brand: "MarcaY", size: "5_premium", price: 153, qty: 1 },
    { type: "decant", brand: "MarcaY", size: "5", price: 149, qty: 1 },
  ];
  const d = calcular(items);
  check("mix2_cantDecants", d.cantDecants === 2, "cant=" + d.cantDecants);
  check("mix2_pct5", d.detalleCantidad && d.detalleCantidad.pct === 5, JSON.stringify(d.detalleCantidad));
  check("mix2_final", d.subtotalFinal === r2((153 + 149) * 0.95), "final=" + d.subtotalFinal);
}

/* ── Caso 4: 3 misma marca (2 premium + 1 normal) → 10% marca incluye premium ── */
{
  const items = [
    { type: "decant", brand: "MarcaZ", size: "5_premium", price: 153, qty: 1 },
    { type: "decant", brand: "MarcaZ", size: "5_premium", price: 153, qty: 1 },
    { type: "decant", brand: "MarcaZ", size: "5", price: 149, qty: 1 },
  ];
  const d = calcular(items);
  const baseMarca = 153 + 153 + 149;
  check("mix3_baseMarca", d.detalleMarcas[0] && d.detalleMarcas[0].base === baseMarca, JSON.stringify(d.detalleMarcas));
  check("mix3_dtoMarca", d.descuentoMarca === r2(baseMarca * 0.1), "dtoMarca=" + d.descuentoMarca);
  check("mix3_final", d.subtotalFinal === r2(baseMarca * 0.9), "final=" + d.subtotalFinal);
}

/* ── Caso 5: packs NO reciben descuento pero premium sí cuenta en umbral ── */
{
  const items = [
    { type: "decant", brand: "MarcaA", size: "10_premium", price: 305, qty: 1, isPack: false },
    { type: "pack", brand: "Promo", size: "nicho-3", price: 99, qty: 1, isPack: true },
  ];
  const d = calcular(items);
  check("pack_noDcto", d.descuentoCantidad === 0, "dto=" + d.descuentoCantidad);
  check("pack_umbral", d.subtotalOriginal === 404 && d.subtotalFinal === 404, "final=" + d.subtotalFinal);
}

console.log("RESULTADO: " + passed + " PASS | " + failed + " FAIL");
process.exit(failed ? 1 : 0);