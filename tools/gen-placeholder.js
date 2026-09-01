/* Genera img/perfumes_optimized/placeholder.webp — fallback de imagen de
   producto (PLACEHOLDER_IMG en script.js).
   Antes este archivo era literalmente el logo de "PACO FRAGANCIAS ·
   DELUXE PRESENCE" (cliente anterior, nunca reemplazado en el rebrand) --
   se filtraba en cualquier producto/talla que cayera a este fallback.
   Reemplazo neutral: fondo crema (mismo tono que el resto de fotos de
   producto, todas sobre fondo blanco/crema), monograma FO, sin simular
   un frasco de perfume, "Imagen próximamente" discreto.
   node tools/gen-placeholder.js */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

(async () => {
  const S = 1000;
  const svg = `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#C99B5F"/><stop offset="1" stop-color="#A67C3D"/>
      </linearGradient>
    </defs>
    <rect width="${S}" height="${S}" fill="#FBF7F0"/>
    <rect x="60" y="60" width="${S - 120}" height="${S - 120}" rx="12" fill="none" stroke="#E2D8C4" stroke-width="2"/>
    <circle cx="${S / 2}" cy="420" r="118" fill="none" stroke="url(#gold)" stroke-width="1.5" opacity="0.55"/>
    <text x="${S / 2}" y="452" text-anchor="middle" dominant-baseline="central" font-family="Georgia, 'Times New Roman', serif" font-size="112" font-weight="300" fill="url(#gold)">FO</text>
    <text x="${S / 2}" y="612" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="26" letter-spacing="7" fill="#8A6F4F">FRAGRANCE OBSESSION</text>
    <text x="${S / 2}" y="656" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="3" fill="#B3A088">Imagen próximamente</text>
  </svg>`;
  const out = path.join(ROOT, "img", "perfumes_optimized", "placeholder.webp");
  await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(out);
  const meta = await sharp(out).metadata();
  console.log("placeholder.webp " + meta.width + "x" + meta.height + " " + Math.round(fs.statSync(out).size / 1024) + "KB");
})();
