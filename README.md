# Fragrance Obsession · Decants de Lujo

Tienda online estática (HTML/CSS/JS puro) de decants premium de perfumes árabes, de diseñador y nicho en Lima, Perú. Sin frameworks ni backend, con checkout 100 % WhatsApp, utilidad local/demo de pedidos y PWA offline.

## Producción

- **Hosting:** Vercel
- **Repositorio:** `Abel-Castill0/uwu`
- **Rama de producción:** `master`
- **Canonical:** `https://www.fraganceobession.com/`
- **Apex:** `https://fraganceobession.com/` → `308` → `https://www.fraganceobession.com/`

## Deploy normal

```bash
git push origin master
```

La integración Git de Vercel crea automáticamente el deployment con target `production`. El despliegue termina cuando el commit de `master` aparece en estado `READY`; normalmente no se crea un deployment manual.

Consulta `DEPLOY.md` para el checklist previo y las verificaciones posteriores.

## Hosting alternativo / histórico

El proyecto sigue siendo HTML/CSS/JS estático y puede servirse desde cualquier hosting compatible. GitHub Pages fue un destino anterior, pero no es la infraestructura de producción actual. Las rutas relativas también permiten servirlo desde una subcarpeta.

## Configuración opcional

- **Admin local/demo:** `admin.html` solo lee pedidos del `localStorage` del mismo navegador. No existe backend, base de datos, sesión ni autenticación server-side. Vercel redirige esta ruta al inicio.
- **Google Analytics:** reemplaza `G-XXXXXXXXXX` en `index.html` solo cuando exista un ID real.
- **Meta Pixel:** reemplaza `XXXXXXXXXXXXXXX` en `index.html` solo cuando exista un ID real.
- **Emails:** `contacto@fraganceobsession.pe` y `cliente@fraganceobsession.pe` se mantienen hasta confirmar un mailbox oficial `.com`; no son un error técnico.

## Verificar localmente

```bash
# Cualquier servidor estático sirve (el Service Worker no funciona con file://)
npx serve .
```
Revisa que `sw.js` esté activo (DevTools → Application → Service Workers) y prueba la app en **modo incógnito** para descartar cachés viejas.

## Notas técnicas

- **Service Worker:** `sw.js` usa cachés versionadas, stale-while-revalidate para CSS/JS/imágenes y network-first para navegación, con fallback a `offline.html`. Cambia su versión cuando cambie el contrato de caché. Si un navegador conserva recursos viejos, desregistra el SW en DevTools → Application → Service Workers y recarga.
- **Utilidad local de pedidos**: `admin.html` valida un SHA-256 en el navegador y solo lee el `localStorage` del mismo origen. Es una demo local, no un panel de producción ni una frontera de seguridad.
- **Temas**: claro/oscuro con `data-theme` en `<html>`; se respeta `prefers-reduced-motion` (desactiva marquee, Ken Burns y micro-interacciones).
- **Filtros**: píldoras de categoría + panel offcanvas en móvil; los resultados se anuncian con `role="status"` y `aria-live`. Los filtros de género están ocultos (todos los perfumes son unisex) — reactivar borrando el bloque `PENDIENTE decisión del cliente` en `styles.css` si el cliente clasifica por género.
- **Imágenes optimizadas**: `img/perfumes_optimized/` (WebP 1000px q82, generadas con `node tools/optimize-images.js --only=perfumes`) es la ÚNICA fuente que sirve el sitio — `productos.js` → `FO_PRODUCT_IMAGES` apunta directo ahí, sin `srcset` ni flags. `img/perfumes/` (PNG originales sin comprimir, ~240MB) es solo la fuente para regenerar; está en `.gitignore` y no se sube al repo. `img/perfumes_backup/` e `img/perfumes_backup_optimized/` guardan archivos huérfanos (sin producto asociado o sin precio conocido) — nunca se borran, solo se mueven ahí. Para añadir un perfume: foto en `img/perfumes/` (en disco, no se versiona; **si el tamaño es 20ml o 30ml el nombre del archivo NUNCA lleva "premium"** — eso es solo para 5ml/10ml) + entrada en `FO_PRODUCT_IMAGES` + `node tools/optimize-images.js --only=perfumes` + `npm test`.
- **SEO/legales:** `robots.txt` + `sitemap.xml` + `privacidad.html` (Ley 29733/ARCO, divulgación IA generativa) + `terminos.html` (takedown UGC D.L. 822, arbitraje D.L. 1071). Vercel sirve el `404.html` del proyecto para rutas estáticas inexistentes.
- **Marca y dominio:** la marca visible es `FRAGRANCE OBSESSION`; el dominio productivo confirmado es `fraganceobession.com`. Las cuentas de TikTok y los emails `.pe` permanecen sin cambios hasta una decisión comercial.
- **"Próximamente"**: la lista de agotados se define en `config.js` → `PROXIMAMENTE` (IDs de `productos.js`). Mecanismo listo: badge "PRÓXIMAMENTE" en la card, botón deshabilitado y aviso en el modal (ver `isComingSoon` en `script.js`). Si no hay stock en `PROXIMAMENTE`, el catálogo se muestra completo.
- **Animaciones (P19.6 → v3):** única librería: GSAP + ScrollTrigger (`animations.js`), cargada solo desde cdnjs. **Lenis, Anime.js y el hero 3D (Three.js, `hero-3d.js`) se eliminaron por completo**. Los hovers de tarjeta y el ícono de FAQ viven en CSS. El stagger de grids anima como máximo 24 tarjetas. `window.FraganceAnimations` es la API interna (el typo es intencional).
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
# Smoke de recursos esenciales
npm run smoke
# Checks de auditoría (Fases 2-6): responsive 5 viewports + contraste
node tests/runners/cdp-responsive-check.js
node tests/runners/cdp-contrast-check.js
# Capturas de auditoría → tests/shots/ (50 PNG: home/catalogo/packs/checkout/tiktok × 5 viewports × light/dark)
node tests/runners/cdp-shots.js
```
Resultado esperado: todos los comandos ejecutados terminan con `0 FAIL`; el contraste debe cumplir AA (≥4.5:1 en texto normal).
Los runners ahora viven en `tests/`; consulta `tests/README.md` para requisitos y detalles.

## Archivos principales

| Archivo | Función |
|---|---|
| `index.html` | Catálogo, packs, home, checkout y modales; GA + Meta Pixel (placeholders) |
| `styles.css` | Tema claro/oscuro y diseño responsive (bloque V17 al final) |
| `script.js` | Lógica completa (filtros, carrito, navegación, srcset optimizado) |
| `config.js` | Ajustes: `SITE_URL`, `ADMIN_HASH` local/demo, `PROXIMAMENTE`, marquee |
| `sw.js` | Service Worker (caché versionada, actualización y fallback offline) |
| `admin.html` | Utilidad local/demo de pedidos del mismo navegador |
| `productos.js`, `descuentos.js`, `animations.js` | Datos y animaciones |
| `gracias.html`, `offline.html`, `404.html` | Páginas de soporte |
| `privacidad.html`, `terminos.html` | Legales (privacidad + términos) |
| `robots.txt`, `sitemap.xml`, `.nojekyll`, `manifest.webmanifest` | SEO y PWA |
| `tools/optimize-images.js` | Genera `img/perfumes_optimized/` (WebP 1000px q82) — imagen canónica del sitio |
| `tools/generate-admin-hash.js` | Genera el `ADMIN_HASH` (SHA-256) para `config.js` |
| `DEPLOY.md`, `ACCEPTANCE_CHECKLIST.md` | Guía de despliegue y checklist de pruebas de aceptación |
| `tests/shots/` | 50 capturas de auditoría (5 vistas × 5 viewports × claro/oscuro) |
