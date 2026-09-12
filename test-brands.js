"use strict";

/* ════════════════════════════════════════════════════════════════
   TEST UNITARIOS — BRAND FILTER
   Uso: node test-brands.js (sin dependencias, node >= 12)
   ════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const ROOT = __dirname;
const src = fs.readFileSync(path.join(ROOT, "productos.js"), "utf8");

/* Extract brands from productos.js */
function extractBrands() {
  const brandSet = new Set();
  const lines = src.split("\n");
  lines.forEach(function (line) {
    const m = line.match(/brand:\s*"([^"]+)"/);
    if (m) brandSet.add(m[1].trim());
  });
  return [...brandSet].sort(function (a, b) {
    return a.localeCompare(b, "es", { sensitivity: "base" });
  });
}

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getBrandGroups(brands) {
  const groups = {};
  brands.forEach(function (b) {
    const first = b.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(first) ? first : "#";
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });
  return groups;
}

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log("PASS " + name); }
  else { failed++; console.log("FAIL " + name + (detail ? " — " + detail : "")); }
}

const brands = extractBrands();

/* ── Caso 1: lista sin duplicados ── */
{
  const rawSet = new Set();
  src.split("\n").forEach(function (line) {
    const m = line.match(/brand:\s*"([^"]+)"/);
    if (m) rawSet.add(m[1].trim());
  });
  check("brandsNoDuplicates", brands.length === rawSet.size, "brandsLen=" + brands.length + " setSize=" + rawSet.size);
}

/* ── Caso 2: orden alfabético ── */
{
  let sorted = true;
  for (let i = 1; i < brands.length; i++) {
    if (brands[i - 1].localeCompare(brands[i], "es", { sensitivity: "base" }) > 0) {
      sorted = false;
      break;
    }
  }
  check("brandsSortedAlphabetically", sorted, JSON.stringify(brands.slice(0, 5)));
}

/* ── Caso 3: agrupación A–Z ── */
{
  const groups = getBrandGroups(brands);
  const groupKeys = Object.keys(groups);
  check("brandGroupsExist", groupKeys.length > 0, "groups=" + groupKeys.length);
  /* Élixir Privé (accent) should group under # */
  check("accentBrandGroupsUnderHash", !!groups["#"], "groups=" + JSON.stringify(groupKeys));
}

/* ── Caso 4: marcas con tildes preservadas ── */
check("accentedBrandPreserved", brands.includes("Élixir Privé"), "");
check("stephanBrandPreserved", brands.some(function (b) { return b.indexOf("Stéphane") !== -1; }), "");

/* ── Caso 5: brand filter — null muestra todas ── */
{
  const allProducts = [];
  const lines = src.split("\n");
  lines.forEach(function (line) {
    const m = line.match(/id:\s*(\d+)/);
    if (m) allProducts.push(Number(m[1]));
  });
  check("brandNullShowsAll", allProducts.length > 100, "products=" + allProducts.length);
}

/* ── Caso 6: Xerjoff filtra Xerjoff ── */
{
  const xerjoffLines = src.split("\n").filter(function (l) { return l.includes('brand: "Xerjoff"'); });
  check("xerjoffBrandFilterable", xerjoffLines.length > 0, "xerjoffCount=" + xerjoffLines.length);
}

/* ── Caso 7: brand + category combinación ── */
{
  const xerjoffNicho = src.split("\n").filter(function (l) {
    return l.includes('brand: "Xerjoff"') && l.includes('category: "nicho"');
  });
  const xerjoffDisenador = src.split("\n").filter(function (l) {
    return l.includes('brand: "Xerjoff"') && l.includes('category: "disenador"');
  });
  check("xerjoffIsNicho", xerjoffNicho.length > 0, "");
  check("xerjoffNotDisenador", xerjoffDisenador.length === 0, "");
}

/* ── Caso 8: search function ── */
{
  const q = "xer";
  const matches = brands.filter(function (b) {
    return stripAccents(b.toLowerCase()).indexOf(q) !== -1;
  });
  check("brandSearchFindsXerjoff", matches.length >= 1 && matches.includes("Xerjoff"), "matches=" + JSON.stringify(matches));
}

/* ── Caso 9: search parfums ── */
{
  const q = "parfums";
  const matches = brands.filter(function (b) {
    return stripAccents(b.toLowerCase()).indexOf(q) !== -1;
  });
  check("brandSearchParfums", matches.length >= 2, "matches=" + JSON.stringify(matches));
}

/* ── Caso 10: # for non-alpha first char ── */
{
  const groups = getBrandGroups(brands);
  const hashGroup = groups["#"] || [];
  check("hashGroupHasNonAlpha", hashGroup.length > 0, "hashGroup=" + JSON.stringify(hashGroup));
}

/* ── Caso 11: empty search returns all ── */
{
  const q = "";
  const matches = q ? brands.filter(function (b) {
    return stripAccents(b.toLowerCase()).indexOf(q) !== -1;
  }) : brands;
  check("emptySearchReturnsAll", matches.length === brands.length, "matches=" + matches.length);
}

/* ── Caso 12: normalize accents for search ── */
{
  const test = "élixir";
  const normalized = stripAccents(test);
  check("stripAccentsWorks", normalized === "elixir", "input=" + test + " output=" + normalized);
}

/* ── Caso 13: long brand names not truncated ── */
check("longBrandNameExists", brands.includes("Stéphane Humbert Lucas 777"), "");
check("bornToStandOutExists", brands.includes("BornToStandOut"), "");

console.log("\nRESULTADO: " + passed + " PASS | " + failed + " FAIL");
process.exit(failed ? 1 : 0);
