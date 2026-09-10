"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const src = fs.readFileSync(path.join(ROOT, "productos.js"), "utf8");
const cfg = fs.readFileSync(path.join(ROOT, "config.js"), "utf8");

// Extract PROXIMAMENTE - get the actual array on the line starting with PROXIMAMENTE:
const proxLine = cfg.split("\n").find(l => l.trim().startsWith("PROXIMAMENTE:"));
const proxArr = proxLine ? proxLine.match(/\[([^\]]+)\]/)[1].split(",").map(s => Number(s.trim())) : [];
console.log("PROXIMAMENTE:", JSON.stringify(proxArr));

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log("PASS " + name); }
  else { failed++; console.log("FAIL " + name + (detail ? " -- " + detail : "")); }
}

// Extract product by id using line-by-line approach
function findProduct(id) {
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(new RegExp("id:\\s*" + id + "\\s*,"))) {
      // Collect the full object (may span multiple lines)
      let obj = "";
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        obj += lines[j] + " ";
        if (lines[j].includes("},") || lines[j].includes("}")) break;
      }
      const name = (obj.match(/name:\s*"([^"]+)"/) || [])[1];
      const brand = (obj.match(/brand:\s*"([^"]+)"/) || [])[1];
      const hasDecants = /decantSizes:\s*\{[^}]+\}/.test(obj) && !/decantSizes:\s*\{\s*\}/.test(obj);
      const hasFull = /fullSizes:\s*\{[^}]+\}/.test(obj) && !/fullSizes:\s*\{\s*\}/.test(obj);
      return { id, name, brand, hasDecants, hasFull, raw: obj.substring(0, 500) };
    }
  }
  return null;
}

// 1. Check 6 requested products
const checks = [
  { id: 62, expect: "Narcotic Delight" },
  { id: 55, expect: "Porthole" },
  { id: 72, expect: "Mezzo" },
  { id: 83, expect: "Pas Ce Soir Extrait" },
  { id: 81, expect: "Gris Charnel EDP" },
  { id: 90, expect: "ANI" },
];

console.log("\n=== 6 DISPONIBLES ===");
checks.forEach(function(c) {
  const p = findProduct(c.id);
  const inProx = proxArr.includes(c.id);
  const nameOk = p && p.name && p.name.toLowerCase() === c.expect.toLowerCase();
  const purchasable = p && (p.hasDecants || p.hasFull);
  check(c.id + " " + c.expect,
    nameOk && !inProx && purchasable,
    "name=" + (p ? p.name : "NOT FOUND") + " brand=" + (p ? p.brand : "?") + " prox=" + inProx + " purchasable=" + purchasable);
});

// 2. Paragon should be back in PROXIMAMENTE
console.log("\n=== PARAGON ===");
check("Paragon(64) in PROXIMAMENTE", proxArr.includes(64), "");

// 3. Babycat
console.log("\n=== BABYCAT ===");
const b = findProduct(149);
check("Babycat(149) exists", !!b, "");
if (b) {
  check("Babycat brand=YSL", b.brand === "Yves Saint Laurent", "brand=" + b.brand);
  check("Babycat has decants", b.hasDecants, "");
  // Check prices in raw
  const raw = b.raw || "";
  check("Babycat 2ml=S/35", raw.includes("2:35"), raw.substring(0, 150));
  check("Babycat 10ml=S/159", raw.includes("10:159"), "");
  check("Babycat 30ml=S/399", raw.includes("30:399"), "");
}

// 4. Mefisto
console.log("\n=== MEFISTO ===");
const m = findProduct(150);
const mProx = proxArr.includes(150);
check("Mefisto(150) exists", !!m, "");
check("Mefisto in PROXIMAMENTE (BLOCKER)", mProx, "");
const hasGentiluomo = src.includes("Mefisto Gentiluomo");
check("Mefisto Gentiluomo does NOT exist", !hasGentiluomo, "");

// 5. Images
console.log("\n=== IMAGES ===");
const imgDir = path.join(ROOT, "img", "perfumes_optimized");
const imgChecks = [
  [62, "NARCOTIC DELIGHT.webp"],
  [55, "PORTHOLE.webp"],
  [72, "Mezzo.webp"],
  [83, "PAS CE SOIR EXRAIT.webp"],
  [81, "GRIS CHARNEL EDP.webp"],
  [90, "ANI.webp"],
];
imgChecks.forEach(function([id, file]) {
  check("img " + id + " " + file, fs.existsSync(path.join(imgDir, file)), file);
});

// 6. Full bottle images
console.log("\n=== FULL BOTTLES ===");
const fbChecks = [
  [141, "BURLINGTON 1819 100ML SELLADO.webp"],
  [142, "CASTLEY 125ML SELLADO.webp"],
  [143, "ERBA GOLD 100ML SELLADO.webp"],
  [144, "NARCOTIC DELIGHT 90ML SELLADO.webp"],
  [145, "PARAGON 90ML SELLADO.webp"],
];
fbChecks.forEach(function([id, file]) {
  check("fullbottle " + id + " " + file, fs.existsSync(path.join(imgDir, file)), file);
});

// 7. Fake discount removed
console.log("\n=== FAKE DISCOUNT ===");
check("no fakeDiscount in productos.js", !src.includes("fakeDiscount"), "");

// 8. No PACO fallback
console.log("\n=== NO PACO ===");
const scriptSrc = fs.readFileSync(path.join(ROOT, "script.js"), "utf8");
check("no PACO_PRODUCTS fallback", !scriptSrc.includes("PACO_PRODUCTS"), "");

console.log("\n=== RESULTADO ===");
console.log(passed + " PASS | " + failed + " FAIL");
process.exit(failed > 0 ? 1 : 0);
