/* Genera img/og-cover.webp (1200×630) para compartir en redes. node tools/gen-og.js */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

(async () => {
  const W = 1200, H = 630;
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#F8F3EA"/>
        <stop offset="100%" stop-color="#FDFAF5"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="18" fill="none" stroke="#E2D8C4" stroke-width="2"/>
    <text x="${W / 2}" y="430" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-style="italic" fill="#B8924A">Decants Premium de Fragancias</text>
    <text x="${W / 2}" y="498" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" letter-spacing="6" fill="#5C3D1E">ARABES  ·  DISENADOR  ·  NICHO</text>
    <text x="${W / 2}" y="556" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" letter-spacing="3" fill="#9A8270">fraganceobsession.pe · Lima, Peru</text>
  </svg>`;
  const logo = await sharp(path.join(ROOT, "logo.webp"))
    .resize(220, 220, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const out = path.join(ROOT, "img", "og-cover.webp");
  await sharp(Buffer.from(svg))
    .composite([{ input: logo, top: 95, left: Math.round((W - 220) / 2) }])
    .webp({ quality: 90 })
    .toFile(out);
  const meta = await sharp(out).metadata();
  console.log("og-cover.webp " + meta.width + "x" + meta.height + " " + Math.round(fs.statSync(out).size / 1024) + "KB");
})();
