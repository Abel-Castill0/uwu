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

// NO_DISPONIBLE: visible en catálogo, pero bloqueado para venta/combo.
const noDispLine = cfg.split("\n").find(l => l.trim().startsWith("NO_DISPONIBLE:"));
const noDispArr = noDispLine ? noDispLine.match(/\[([^\]]+)\]/)[1].split(",").map(s => Number(s.trim())) : [];
console.log("NO_DISPONIBLE:", JSON.stringify(noDispArr));

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

// 1. Previously confirmed available decants (Porthole is now unavailable).
const checks = [
  { id: 62, expect: "Narcotic Delight" },
  { id: 72, expect: "Mezzo" },
  { id: 83, expect: "Pas Ce Soir Extrait" },
  { id: 81, expect: "Gris Charnel EDP" },
  { id: 51, expect: "Birth of Venus" },
  { id: 64, expect: "Paragon" },
  { id: 137, expect: "Toucan" },
];

console.log("\n=== DISPONIBLES CONFIRMADOS ===");
checks.forEach(function(c) {
  const p = findProduct(c.id);
  const inProx = proxArr.includes(c.id);
  const nameOk = p && p.name && p.name.toLowerCase() === c.expect.toLowerCase();
  const purchasable = p && (p.hasDecants || p.hasFull);
  check(c.id + " " + c.expect,
    nameOk && !inProx && purchasable,
    "name=" + (p ? p.name : "NOT FOUND") + " brand=" + (p ? p.brand : "?") + " prox=" + inProx + " purchasable=" + purchasable);
});

// 2. Paragon disponible (cliente 01/10)
console.log("\n=== PARAGON ===");
check("Paragon(64) NOT in PROXIMAMENTE", !proxArr.includes(64), "");

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
check("Mefisto in PROXIMAMENTE (cliente 01/10)", mProx, "prox=" + mProx);
check("Mefisto brand=Xerjoff", m && m.brand === "Xerjoff", "brand=" + (m ? m.brand : "?"));
check("Mefisto has decants", m && m.hasDecants, "");
// El catálogo del cliente confirmó "Mefisto Gentiluomo" (línea Casamorati
// de Xerjoff) con los mismos precios ya vigentes; fotos verificadas
// visualmente (badge del frasco). Reemplaza el guard anterior que asumía
// lo contrario.
check("Mefisto name is Mefisto Gentiluomo", m && m.name === "Mefisto Gentiluomo", "name=" + (m ? m.name : "?"));
// Verify exact prices
if (m) {
  const mefRaw = m.raw || "";
  check("Mefisto 1ml=19", mefRaw.includes("1:19"), mefRaw.substring(0, 300));
  check("Mefisto 2ml=25", mefRaw.includes("2:25"), "");
  check("Mefisto 3ml=35", mefRaw.includes("3:35"), "");
  check("Mefisto 5ml=49", mefRaw.includes("5:49"), "");
  check("Mefisto 10ml=99", mefRaw.includes("10:99"), "");
  check("Mefisto 30ml=249", mefRaw.includes("30:249"), "");
  check("Mefisto NO 5ml_premium", !mefRaw.includes("5_premium"), "");
  check("Mefisto NO 10ml_premium", !mefRaw.includes("10_premium"), "");
  check("Mefisto NO 20ml", !mefRaw.includes("20:"), "");
}

// 5. Images
console.log("\n=== IMAGES ===");
const imgDir = path.join(ROOT, "img", "perfumes_optimized");
const imgChecks = [
  [62, "NARCOTIC DELIGHT.webp"],
  [55, "PORTHOLE.webp"],
  [72, "Mezzo.webp"],
  [83, "PAS CE SOIR EXRAIT.webp"],
  [81, "GRIS CHARNEL EDP.webp"],
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

// 9. Featured 12 (Home) — orden y set exactos confirmados por el cliente
console.log("\n=== FEATURED 12 ===");
const featLine = cfg.split("\n").find(l => l.trim().startsWith("FEATURED_PRODUCT_IDS:"));
const featArr = featLine ? featLine.match(/\[([^\]]+)\]/)[1].split(",").map(s => Number(s.trim())) : [];
const featExpectedOrder = [
  "Avanguardia", "Fierezza", "P*rnst*r", "Oud Maracuja", "God of Fire",
  "Mangomacumba", "Blue Talisman EDP", "Wild Rush", "Vibrato",
  "Gris Charnel Extrait", "Babycat", "Gris Dior",
];
check("featuredCount === 12", featArr.length === 12, "count=" + featArr.length);
check("featured unique === 12", new Set(featArr).size === 12, "unique=" + new Set(featArr).size);
const featProducts = featArr.map(findProduct);
check("every featured ID resolves to a product", featProducts.every(Boolean), JSON.stringify(featArr.filter((id, i) => !featProducts[i])));
featExpectedOrder.forEach(function (expectName, i) {
  const p = featProducts[i];
  check("featured[" + i + "] = " + expectName, !!p && p.name === expectName, "got=" + (p ? p.name : "NOT FOUND"));
});

// 10. Disponibles ahora — Narcotic Delight y Castley (última confirmación cliente)
console.log("\n=== DISPONIBLES AHORA ===");
check("Narcotic Delight decant(62) NOT in PROXIMAMENTE", !proxArr.includes(62), "");
check("Narcotic Delight sellado(144) NOT in PROXIMAMENTE", !proxArr.includes(144), "");
check("Castley decant(100) NOT in PROXIMAMENTE", !proxArr.includes(100), "");
check("Castley sellado(142) NOT in PROXIMAMENTE", !proxArr.includes(142), "");
// Fierezza pasa a disponible manteniendo su lugar en Featured.
check("Fierezza(140) available and still featured", !proxArr.includes(140) && featArr.includes(140), "");

// Inventario confirmado el 17/09: evalúa el mapa canónico aplicado al catálogo.
const vm = require("vm");
const catalogWindow = {};
vm.runInNewContext(src, { window: catalogWindow });
const inventory = catalogWindow.FO_PRODUCTS;
const requested = [
  [140, "Fierezza", false], [55, "Porthole", true],
  [78, "Gentle Fluidity Silver", true], [81, "Gris Charnel EDP", false],
  [100, "Castley", false], [51, "Birth of Venus", false], [64, "Paragon", false],
  [137, "Toucan", false], [150, "Mefisto Gentiluomo", true],
];
requested.forEach(([id, name, soon]) => {
  const product = inventory.find((p) => p.id === id);
  check(`${name} identity and availability`, product && product.name === name && proxArr.includes(id) === soon, "");
  const images = product ? [product.cardImage, product.fullImage, product.decantImage, ...Object.values(product.sizeImages)] : [];
  check(`${name} canonical images exist`, images.length > 0 && images.every((file) => file && fs.existsSync(path.join(ROOT, file))), "");
});
check("Narcotic full bottle retained as historical data", inventory.some((p) => p.id === 144 && p.fullSizes[90] === 860), "");
check("Narcotic full bottle absent from public inventory", !inventory.filter((p) => p.public !== false && p.sealed).some((p) => p.id === 144), "");
/* Ani(90) "NO DISPONIBLE" (cliente 01/10): debe seguir en el inventario
   (public !== false, con su ficha y badge) y quedar listado en
   NO_DISPONIBLE — nunca en PROXIMAMENTE ni oculto con public:false. */
check("Ani(90) visible en el inventario público", inventory.some((p) => p.id === 90 && p.public !== false), "");
check("Ani(90) NO DISPONIBLE listado y fuera de PROXIMAMENTE", noDispArr.includes(90) && !proxArr.includes(90), "noDisp=" + JSON.stringify(noDispArr));
check("Toucan 20ml (decant) with its own image", inventory.some((p) => p.id === 137 && p.decantSizes[20] && /Toucan 20ml\.webp$/.test(p.sizeImages["20"])), "");
[[151, "Birth of Venus", "Argos", 100, 950], [152, "Dream Sea", "Lorenzo Pazzaglia", 50, 675], [153, "Gris Charnel EDP", "BDK Parfums", 100, 799]].forEach(([id, name, brand, ml, price]) => {
  const p = inventory.find((x) => x.id === id);
  check(`Sealed ${name} ${ml}ml S/${price}`, !!p && p.name === name && p.brand === brand && p.sealed && p.sealedStatus === "sellado" && p.sealedSize === ml + "ml" && p.fullSizes[ml] === price && p.public !== false && !proxArr.includes(id), "");
  check(`Sealed ${name} image exists`, !!p && fs.existsSync(path.join(ROOT, p.cardImage)), "");
});
check("Narcotic decant stays public", inventory.some((p) => p.id === 62 && p.public !== false && Object.keys(p.decantSizes).length > 0), "");

console.log("\n=== RESULTADO ===");
console.log(passed + " PASS | " + failed + " FAIL");
process.exit(failed > 0 ? 1 : 0);
