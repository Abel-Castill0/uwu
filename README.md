# Fragrance Obsession · Decants de Lujo

Tienda online estática (HTML/CSS/JS puro) de decants premium de perfumes árabes, de diseñador y nicho en Lima, Perú. Sin frameworks ni backend: se publica tal cual en **GitHub Pages**. Checkout 100 % WhatsApp (+ enlace Mercado Pago), panel admin client-side y PWA offline.

## Publicar en GitHub Pages

1. Sube el proyecto a un repositorio de GitHub:
   ```bash
   git init
   git add .
   git commit -m "Fragrance Obsession"
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```
2. En GitHub: **Settings → Pages → Build and deployment** → **Deploy from a branch** → rama `main`, carpeta `/ (root)` → **Save**.
3. Espera ~1 minuto y entra a `https://TU_USUARIO.github.io/TU_REPO/`.

> El archivo `.nojekyll` ya está incluido: impide que GitHub Pages procese las carpetas con `_` (el Service Worker las necesita).

### Publicar en una subcarpeta del dominio
GitHub Pages ya la sirve en `https://TU_USUARIO.github.io/TU_REPO/` (el proyecto es 100 % rutas relativas: funciona en `/`, `/TU_REPO/`, o cualquier subcarpeta). Ver `DEPLOY.md` para el checklist completo (dominio personalizado, SSL, SEO, legales).

## Después de publicar (importante)

1. **Cambia la contraseña del panel admin** (`/admin.html`): el hash actual en `config.js` es de una contraseña de ejemplo. Genera el tuyo:
   ```bash
   # Node (recomendado, disponible en el repo)
   node tools/generate-admin-hash.js
   #   o directamente:  node tools/generate-admin-hash.js "tu-contraseña"
   ```
   ```powershell
   # PowerShell (alternativa)
   $s = Read-Host "Nueva contraseña (no se muestra)"
   $bytes = [System.Text.Encoding]::UTF8.GetBytes($s)
   $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
   ([BitConverter]::ToString($hash)).Replace('-','').ToLower()
   ```
   Pega el resultado en `config.js` → `ADMIN_HASH` y vuelve a subir.
2. **Google Analytics**: en `index.html` reemplaza `G-XXXXXXXXXX` por tu ID real (el loader está preparado y no carga hasta que cambies el ID).
3. **Meta Pixel**: en `index.html` reemplaza `window.META_PIXEL_ID = "XXXXXXXXXXXXXXX"` por tu ID real (idem: no carga hasta que lo cambies).
4. **Dominio personalizado** (opcional): crea `CNAME` con tu dominio y configúralo en Settings → Pages. Verifica que `sitemap.xml` y `robots.txt` usen tu dominio (edita `sitemap.xml` si no es `fraganceobsession.pe`).

## Verificar localmente

```bash
# Cualquier servidor estático sirve (el Service Worker no funciona con file://)
npx serve .
```
Revisa que `sw.js` esté activo (DevTools → Application → Service Workers) y prueba la app en **modo incógnito** para descartar cachés viejas.

## Notas técnicas

- **Service Worker** (`sw.js`, versión `fo-v49-ghpages`): cachea los assets críticos con rutas relativas y `scope "./"`; al actualizar la página el nuevo SW **toma el control de inmediato** (`skipWaiting` + `clients.claim`) — no hace falta recargar dos veces. Si ves versiones viejas, desregistra el SW en DevTools > Application > Service Workers y recarga con Ctrl+F5. ⚠️ Cada cambio del SW hay que subirlo con **Node** (escribir `sw.js` con `fs.writeFileSync`), nunca con PowerShell, para no alterar el BOM.
- **Panel admin**: `/admin.html` valida con SHA-256 en el navegador (`crypto.subtle`); no hay contraseña en el cliente ni servidor. Es un candado de disuasión del hosting estático, no autenticación real.
- **Temas**: claro/oscuro con `data-theme` en `<html>`; se respeta `prefers-reduced-motion` (desactiva marquee, Ken Burns y micro-interacciones).
- **Filtros**: píldoras de categoría + panel offcanvas en móvil; los resultados se anuncian con `role="status"` y `aria-live`. Los filtros de género están ocultos (todos los perfumes son unisex) — reactivar borrando el bloque `PENDIENTE decisión del cliente` en `styles.css` si el cliente clasifica por género.
- **Imágenes optimizadas**: `img/perfumes_optimized/` (WebP 1000px q82, generadas con `node tools/optimize-images.js --only=perfumes`) es la ÚNICA fuente que sirve el sitio — `productos.js` → `FO_PRODUCT_IMAGES` apunta directo ahí, sin `srcset` ni flags. `img/perfumes/` (PNG originales sin comprimir, ~240MB) es solo la fuente para regenerar; está en `.gitignore` y no se sube al repo. `img/perfumes_backup/` e `img/perfumes_backup_optimized/` guardan archivos huérfanos (sin producto asociado o sin precio conocido) — nunca se borran, solo se mueven ahí. Para añadir un perfume: foto en `img/perfumes/` (en disco, no se versiona; **si el tamaño es 20ml o 30ml el nombre del archivo NUNCA lleva "premium"** — eso es solo para 5ml/10ml) + entrada en `FO_PRODUCT_IMAGES` + `node tools/optimize-images.js --only=perfumes` + `npm test`.
- **SEO/legales**: `robots.txt` + `sitemap.xml` + `privacidad.html` (Ley 29733/ARCO, divulgación IA generativa) + `terminos.html` (takedown UGC D.L. 822, arbitraje D.L. 1071). El `404.html` ya está en producción (lo sirve GitHub Pages automáticamente).
- **Marca**: canónica `FRAGRANCE OBSESSION` (mayúsculas) en metadata/visible (título, og, JSON-LD, alts, copyright, WhatsApp, manifest); las descripciones en prosa usan "Fragrance Obsession". El dominio y las redes externas (`fraganceobsession.pe`, TikTok/WhatsApp/email) se actualizan fuera del código.
- **"Próximamente"**: la lista de agotados se define en `config.js` → `PROXIMAMENTE` (IDs de `productos.js`). Mecanismo listo: badge "PRÓXIMAMENTE" en la card, botón deshabilitado y aviso en el modal (ver `isComingSoon` en `script.js`). Si no hay stock en `PROXIMAMENTE`, el catálogo se muestra completo.
- **Animaciones (P19.6 → v3)**: única librería: GSAP + ScrollTrigger (`animations.js`), cargada solo desde cdnjs. **Lenis, Anime.js y el hero 3D (Three.js, `hero-3d.js`) se eliminaron por completo** — se descargaban en todos los dispositivos (también móvil) aunque no se usaran. Los hovers de tarjeta y el ícono de FAQ ya no dependen de JS: viven en CSS puro (`.product-card:hover`, `.faq-item.open .faq-trigger i`), que ya los cubría — Anime.js los duplicaba y competía con esas transiciones. El stagger de grids anima como máximo 24 tarjetas. `window.FraganceAnimations` es la API interna (el typo es intencional). Verificado: suite 104/0, smoke 14/0, 0 errores de consola.
- **Paleta marrón premium (P20)**: chocolate profundo + crema + dorado envejecido, coherente con perfumes. `:root` = crema cálido (#FBF7F0/#F2E9DC) + texto marrón (#1A120B) + acentos dorados (`--gold*` = #C99B5F/#A67C3D/#E5C896); `[data-theme="dark"]` = marrón oscuro (#1A120B/#140E08/#261B10) + dorado claro (#D4A96A/#E8CE9C/#B88A4E). Sin grises plata en la UI (sombras y glows con tinte dorado). Verdes solo semánticos (WhatsApp #25D366, success/discount). Contraste AA verificado (muted dark #9A8876 = 5:1).
- **Catálogo (P19 + P28)**: grilla continua sin agrupación por marca (`GROUP_BY_BRAND: false` en config.js) — 5 columnas desktop (≥1200px), 4 (1024-1199), 3 (768-1023), 2 (400-767), 1 (<400). Tarjetas de altura idéntica (`grid-auto-rows: 1fr`), sin huecos. **Renderizado progresivo (P28)**: carga inicial 24 tarjetas + botón "Mostrar más" (`.btn-load-more`) que añade 24 más sin re-renderizar el grid completo (`insertAdjacentHTML beforeend`). `catalogVisibleCount` se reinicia a 24 al cambiar filtros/búsqueda.
- **Modal (P19)**: tamaños ordenados menor→mayor (1ml, 2ml, 3ml, 5ml premium, 10ml premium, 20ml…), etiqueta "Tamaño", grid 3-2 columnas, check ✓ en el seleccionado, botón Añadir sticky al fondo (siempre visible).
- **Topbar y marquee (P20)**: franja marrón fija en ambos temas (gradiente #1A120B→#261B10, texto dorado, bordes rgba(212,169,106)).
- **Fotos en dark (P20)**: las tarjetas usan un fondo "estudio" dorado claro (`radial-gradient #F6EDE0→#C99B5F`) para que el `multiply` funda el blanco sin apagar el producto; igual en modal, carrito y promos con foto.
- **TikTok (P19.2-P19.5)**: **facade loading** — las tarjetas muestran un facade con botón play hasta el clic; 2 videos reales (vt.tiktok.com) + enlace al perfil; `embed.js` se carga una sola vez por página; **un solo video activo a la vez**; videos rechazados por TikTok → fallback elegante. SW en **stale-while-revalidate** para JS/CSS.
- **Logo**: `logo.webp` (512×512) es un **icono sin texto** (anillos plata/oro + monograma FO), generado con `node tools/gen-logo.js` (también regenera `icon-192.png`, `icon-512.png` y `icon-180.png` para PWA/apple-touch; fondo #0A0A0A). `img/og-cover.webp` incrusta el icono (`node tools/gen-og.js`). Regenerar con Node, nunca a mano.
- **Fotos de producto**: fondo blanco, integradas con la paleta vía CSS (`mix-blend-mode: multiply` + `brightness(1.06)` en `.img-wrapper img`, `.modal-image img`, `.promo-media img`, `.cart-item img`). El sitio sirve siempre `img/perfumes_optimized/*.webp` (ver nota de imágenes optimizadas arriba); `img/perfumes/` con los PNG originales no se versiona.
- **Iconos**: sin emojis en la UI visible — todo SVG inline (`stroke="currentColor"`, trazo fino, dorado/marrón). Se conservan emojis solo en toasts y mensajes de WhatsApp (contenido, no iconos).
- **Topbar**: muestra un beneficio a la vez (rotación con fade cada 4 s desde `FO.TOPBAR_BENEFITS` en `config.js`); contacto y redes separados a la derecha. Respeta `prefers-reduced-motion`.
- **FABs**: píldora glassmorphism (WhatsApp + TikTok) en la esquina inferior derecha, iconos SVG monocromáticos plata con color de marca en hover; `back-to-top` reposicionado para no solaparse.
- **Skills de agente**: `npx skills add Leonxlnx/taste-skill` (13 skills) y `npx skills add DietrichGebert/ponytail` (6 skills) instalados en `.agents/skills/` (local, no se publica).
- **Scroll con rueda del ratón**: `overscroll-behavior-y: none` solo en `html` (en body rompía el scroll encadenado desde el hero, cuyo video kenburns desborda el `overflow: hidden`); el hero usa `overflow: clip` (recorte sin crear scroll container).

## Verificación (suite + smoke)

```bash
# Suite completa (DOM + CSS + reduced-motion) en file://, HTTP raíz y /site/
npm test
# Smoke reproducible de los 14 recursos esenciales
npm run smoke
# Checks de auditoría (Fases 2-6): responsive 5 viewports + contraste
node tests/runners/cdp-responsive-check.js
node tests/runners/cdp-contrast-check.js
# Capturas de auditoría → tests/shots/ (50 PNG: home/catalogo/packs/checkout/tiktok × 5 viewports × light/dark)
node tests/runners/cdp-shots.js
```
Resultado esperado: `0 FAIL` en las seis corridas de la suite, smoke `14 PASS`, responsive `5/5 OK` y contraste AA (≥4.5:1) en texto normal.
Los runners ahora viven en `tests/`; consulta `tests/README.md` para requisitos y detalles.

## Archivos principales

| Archivo | Función |
|---|---|
| `index.html` | Catálogo, packs, home, checkout y modales; GA + Meta Pixel (placeholders) |
| `styles.css` | Tema claro/oscuro y diseño responsive (bloque V17 al final) |
| `script.js` | Lógica completa (filtros, carrito, navegación, srcset optimizado) |
| `config.js` | Ajustes: `SITE_URL`, `ADMIN_HASH`, `PROXIMAMENTE`, marquee |
| `sw.js` | Service Worker (offline + actualización inmediata, `fo-v45-ghpages`) |
| `admin.html` | Panel de administración (login con SHA-256) |
| `productos.js`, `descuentos.js`, `animations.js` | Datos y animaciones |
| `gracias.html`, `offline.html`, `404.html` | Páginas de soporte |
| `privacidad.html`, `terminos.html` | Legales (privacidad + términos) |
| `robots.txt`, `sitemap.xml`, `.nojekyll`, `manifest.webmanifest` | SEO y PWA |
| `tools/optimize-images.js` | Genera `img/perfumes_optimized/` (WebP 1000px q82) — imagen canónica del sitio |
| `tools/generate-admin-hash.js` | Genera el `ADMIN_HASH` (SHA-256) para `config.js` |
| `DEPLOY.md`, `ACCEPTANCE_CHECKLIST.md` | Guía de despliegue y checklist de pruebas de aceptación |
| `tests/shots/` | 50 capturas de auditoría (5 vistas × 5 viewports × claro/oscuro) |
