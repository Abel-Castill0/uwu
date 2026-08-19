/* Genera el logo icon-only (sin texto) del sitio + iconos PWA.
 *   logo.webp     512x512  icono transparente (anillos + monograma FO)
 *   icon-192.png  192x192  icono PWA (fondo verde oscuro)
 *   icon-512.png  512x512  icono PWA + maskable
 *   icon-180.png  180x180  apple-touch-icon
 * USO: node tools/gen-logo.js   →   luego node tools/gen-og.js (og-cover incrusta el logo)
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const ICON_SVG = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="silver" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E8EBED"/>
      <stop offset="45%" stop-color="#C6CDD2"/>
      <stop offset="100%" stop-color="#97A2A8"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E4C37F"/>
      <stop offset="100%" stop-color="#B8924A"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="196" fill="none" stroke="url(#silver)" stroke-width="14"/>
  <circle cx="256" cy="256" r="168" fill="none" stroke="url(#gold)" stroke-width="6"/>
  <text x="256" y="310" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="208" fill="url(#silver)">FO</text>
</svg>`;

const MASKABLE_SVG = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0A0A0A"/>
  ${ICON_SVG.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "")}
</svg>`;

(async () => {
  const icon = await sharp(Buffer.from(ICON_SVG)).webp({ quality: 92 }).toBuffer();
  fs.writeFileSync(path.join(ROOT, "logo.webp"), icon);
  const m1 = await sharp(path.join(ROOT, "logo.webp")).metadata();
  console.log("logo.webp " + m1.width + "x" + m1.height + " " + Math.round(icon.length / 1024) + "KB (icon-only)");

  await sharp(Buffer.from(MASKABLE_SVG)).resize(192, 192).png().toFile(path.join(ROOT, "icon-192.png"));
  await sharp(Buffer.from(MASKABLE_SVG)).resize(512, 512).png().toFile(path.join(ROOT, "icon-512.png"));
  await sharp(Buffer.from(MASKABLE_SVG)).resize(180, 180).png().toFile(path.join(ROOT, "icon-180.png"));
  console.log("icon-192.png / icon-512.png / icon-180.png regenerados (negro + icono)");
})();