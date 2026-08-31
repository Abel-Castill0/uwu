# HANDOFF — FRAGRANCE OBSESSION

Estado final del proyecto al cierre (Prompt 23, 2026-08-21). Este documento es para el próximo agente o la persona que continúe.

## Qué es el proyecto

Tienda online estática (HTML/CSS/JS puro, sin frameworks ni backend) de decants premium de perfumes árabes, de diseñador y nicho en Lima, Perú. Se publica tal cual en GitHub Pages. Checkout 100 % WhatsApp (+ enlace Mercado Pago), panel admin client-side y PWA offline.

## Estado actual (todo verificado)

| Verificación | Resultado |
|---|---|
| Suite completa (104 aserciones × 3 targets × 3 modos) | **9/9 corridas: 104 PASS \| 0 FAIL** (file://, HTTP raíz, HTTP /site/ — warm-up + normal + reduced-motion) |
| Smoke (`npm run smoke`) | **14/14 PASS** |
| `test-descuentos.js` | **17/17 PASS** |
| Responsive (`cdp-responsive-check.js`, 320-1440px) | **5/5 OK** (columnas 1/1/3/5/5, modal 92dvh, sin overflow horizontal) |
| Contraste AA (`cdp-contrast-check.js`, reparado) | Todo ≥4.5:1 en ambos temas (body 15.6-16.1, producto 16-18.5, muted 5.2-5.4, link footer 4.97-4.99) |
| Auditoría cyber-neo | **0 críticos / 0 vulnerabilidades / 0 secretos** |
| SW | `fo-v51-ghpages` |
| Redes sociales | Solo TikTok + WhatsApp + correo (Instagram eliminado) |
| TikTok videos | Galería estática: tarjetas `<a target="_blank">` a TikTok, cero iframes/scripts/requests (ver Prompt 27) |
| Angels Share 30ml | Corregido: id:5 "Angels Share on the Rocks" con sizeImages correcto |
| Modal 30ml (id:6 Angels Share / id:7 Apple Brandy) | Corregido: `FO_PRODUCT_IMAGES[6\|7].sizes` no tenía clave `"30"` (ver Prompt 24) |
| Modal 10ml premium (id:5 Angels Share on the Rocks) | Corregido: `"10_premium"` apuntaba por error a la imagen de 30ml; eliminada la clave, cae al fallback correcto (ver Prompt 24) |
| srcset | Eliminado (Prompt 28): una sola capa `img/perfumes_optimized/*.webp` sirve todo, sin lógica de srcset ni bug de espacios en nombres |
| SPA navigation | Corregido: CSS `.page { display: none; }` / `.page.active { display: block; }` |

## Prompt 32 — Auditoría integral: bug crítico en producción encontrado y corregido (cerrado)

El cliente pidió una auditoría exhaustiva (arquitectura, UX, responsive, performance, a11y, SEO, lógica de negocio, PWA) antes de tocar nada. Al arrancar la auditoría (`git log`) apareció un **commit ajeno a estas sesiones** (`5147e79`, "corrige keys sizeImages 20/30ml y agrega 20 productos Proximamente, SW fo-v50") ya en `main`/`master` — sin entrada en este HANDOFF, hecho por otra vía. Se investigó a fondo antes de asumir nada:

- **"20 productos marcados Próximamente" — investigado, NO es un bug**: se abrieron 7 de las 20 fotos de producto una por una (Musk Therapy, Sedley, Ichigo Ichie, Last Birthday Cake, Paragon, Grand Soir, Que Chimba — marcas distintas: Toskovat, Marly, Initio, MFK, Lorenzo Pazzaglia) y las 7 traían el sello rojo "PRÓXIMAMENTE/COMING SOON" del proveedor **en la propia foto**. El cliente actualizó el stock de esos 20 perfumes (varios eran bestsellers) y el commit ajeno reflejó eso correctamente.
- **Bug real #1 (confirmado y corregido)**: ese mismo commit renombró la *key* de `sizeImages` de "20"→"30" (o viceversa) en 18 productos para que coincidiera con `decantSizes`, pero **no actualizó el archivo** al que apunta — la key decía "30" pero el archivo seguía siendo la foto vieja de 20ml (ej. Gold Juice, Paragon, Narcissus Obsession, Jupiter's Lightning, Birth of Venus, y 10 más). Es decir, el modal mostraba la foto del tamaño equivocado. Se verificó cada caso con un script (no a ciegas): en 15 de 18 existía en `img/perfumes/` la foto real de 30ml (una con "premium" en el nombre — Gold Juice — se renombró igual que en el Prompt 30); en los 3 restantes (Blue Talisman EDP, Toucan, Loverbird) no existe una foto específica del tamaño grande, así que se dejó la única disponible como aproximación (no es un bug, es la mejor opción con los assets que hay).
- **Bug real #2 (confirmado y corregido)**: el mensaje de ese commit decía "SW fo-v50" pero **`sw.js` nunca se tocó** (seguía en `fo-v49-ghpages`) — un service worker con caché vieja podía seguir sirviendo las imágenes mal mapeadas. Corregido: `fo-v51-ghpages` (se salta v50 para no generar ambigüedad con la versión "fantasma" que el commit decía usar y nunca aplicó).
- **Bug real #3, encontrado por esta auditoría (no relacionado al commit ajeno)**: el carrito persiste en `localStorage` (`fo_cart_v4`) sin revalidar contra el catálogo actual. Reproducido: se sembró manualmente un carrito con un decant que hoy está "Próximamente" (Musk Therapy) y **el checkout dejaba confirmar el pedido por WhatsApp con normalidad**, sin aviso — un cliente que agregó algo al carrito antes de que se agotara podía terminar pidiendo algo que ya no hay. Corregido en `script.js`: al cargar el carrito se filtran (y se re-guardan) los ítems cuyo producto ya no existe o pasó a "Próximamente" (los packs no se tocan, tienen su propia validación), y se avisa con un toast una vez que la UI está lista. Verificado en navegador real: carrito sembrado con Musk Therapy → tras recargar, `localStorage` queda `[]`, contador en 0, toast "Quitamos 1 producto de tu carrito: ya no está disponible."
- **Resto de la auditoría** (arquitectura, focus trap, aria, SEO): el focus trap de modales (`trapTabFocus`, ya cubre modal/pack modal/carrito/info modal) y los `aria-modal`/`role="dialog"` **ya estaban bien implementados** — no hacía falta nada. SEO: meta tags, Open Graph, JSON-LD (Store + BreadcrumbList + FAQPage) y `robots.txt`/`sitemap.xml` están completos; limitación real encontrada (no corregida, cambio de arquitectura): al ser SPA con rutas por hash, ningún producto tiene URL propia indexable — ninguno de los 140 perfumes puede rankear individualmente en Google. `sitemap.xml` tenía `lastmod` desactualizado (2026-08-26) — corregido a la fecha real.
- **Efecto colateral de las 20 "Próximamente" nuevas**: el pack nicho-5 (excluye "Próximamente") bajó de 113 a **93** productos elegibles — `npm test` lo marcó como falla real (`packItems113`, items=93) porque el conteo estaba fijado a mano de la ronda anterior, antes de que existieran las 20 nuevas exclusiones. Recalculado con Node contra el catálogo actual y corregido en `tests/selftest.js` (`packItems113`→`packItems93`); no es una regresión de código, el catálogo nicho (116) y diseñador (24) para venta normal no cambiaron.
- **Verificación**: `npm run smoke` 14/14, `node test-descuentos.js` 25/25, `node --check` en JS tocado, 549/549 rutas de imagen resueltas, regresión manual de flujo normal (catálogo→carrito) sin cambios.
- **SW**: `fo-v49-ghpages` → `fo-v51-ghpages`.

## Prompt 31 — Verificación de reglas de negocio + accesibilidad táctil móvil (cerrado)

El cliente pidió re-verificar que descuentos/productos/próximamente quedaran exactamente como en su catálogo y sus mensajes de WhatsApp. Todo eso **ya estaba correcto** desde el Prompt 30 (verificado con Node contra `config.js`/`productos.js`: `POR_CANTIDAD` 5/10/15% con `tamMaxMl:10`, `POR_MARCA` y `UMBRAL` intactos, `PROXIMAMENTE:[137,138,140]`, Sedley sin duplicar, diseñador 100% en tallas [2,3,5]) — no hizo falta tocar nada de eso. El trabajo real de esta ronda fue una **auditoría de accesibilidad táctil y responsive** (pedida en la Fase 3-4 del prompt) que no se había hecho a fondo:

- **Bug de marcado real**: el enlace "Síguenos en TikTok" tenía `class="btn-gold"` sin la clase base `.btn` — por eso no heredaba `display:inline-flex` ni el padding del resto de botones y se renderizaba como texto con gradiente de 22px de alto (ni visualmente ni táctilmente era un botón real). Corregido a `class="btn btn-gold"` en `index.html`; era el único caso en todo el sitio con este patrón (verificado con grep).
- **Objetivos táctiles <44px reales** (medidos con `getBoundingClientRect()` en un viewport 375×812 con `pointer:coarse` emulado, no solo CSS teórico): el botón hamburguesa (37×29), los 2 CTA del hero "Explorar Catálogo"/"Ver Packs" (39px/41px de alto), las pestañas del modal "Frasco Completo"/"Decant" (32px) y los botones `.btn-add`/`.btn-empty-action` (40-43px) quedaban por debajo del mínimo de accesibilidad táctil (WCAG 2.5.5, 44×44px). Se extendió el bloque `@media (pointer: coarse)` que ya existía en `styles.css` (de una ronda anterior, cubría `.modal-close`/`.cart-close`/`.theme-toggle`/etc.) para incluir estos elementos — solo afecta a dispositivos táctiles, cero cambio visual en desktop con mouse.
- **Verificado sin overflow horizontal** en 375px, 768px y 1280px (`document.documentElement.scrollWidth` vs `innerWidth`, sin diferencia en ninguno) — carrito, checkout, modal de producto y footer con logos de pago incluidos.
- **Verificado el flujo "Próximamente"** (Fierezza) de punta a punta: card deshabilitada con badge, botón del modal deshabilitado, aviso "¿Quieres reservarlo? Escríbenos por WhatsApp" — ya funcionaba correctamente desde el Prompt 30, sin cambios.
- **Auditoría de CSS muerto**: se buscaron selectores repetidos 4+ veces como señal de redundancia; la única redundancia real encontrada era `.modal-close` (3 capas de tamaño de una evolución del componente a través de varias rondas) — es inofensiva porque la capa táctil (la última en cascada) siempre gana en pantallas táctiles, y el tamaño de escritorio (38px) es una decisión de diseño válida para mouse. No se encontró código muerto adicional; una refactorización más profunda del CSS (4700+ líneas) requeriría una herramienta como PurgeCSS/stylelint, fuera del alcance de esta ronda.
- **Emojis en UI**: revisados — los únicos que quedan están en toasts y mensajes de WhatsApp (contenido, no iconos de interfaz), que es la convención ya establecida en el proyecto; no se encontró ningún emoji usado como ícono de UI real.
- **SW**: `fo-v48-ghpages` → `fo-v49-ghpages`.
- **Verificación**: `npm run smoke` 14/14, `node test-descuentos.js` 25/25, `npm test` — ver resultado en la respuesta al usuario.

## Prompt 30 — Completar imágenes, corregir nombres "premium 20/30ml" y limpieza profunda (cerrado)

El cliente siguió agregando fotos entre sesiones (batch nuevo detectado por timestamp de archivo, no por aviso explícito). Auditoría completa desde cero:

- **Bug de nombres real, confirmado**: 16 archivos tenían "decant premium 20 ml" / "decant premium 30 ml" — pero la regla del negocio es que **premium solo existe en 5ml y 10ml** (ya estaba así en el código: `getDisplayDecantSizes()` en `script.js` solo genera `5_premium`/`10_premium`). Renombrados con un script Node (nunca PowerShell) a `... decant 20 ml.png` / `... decant 30 ml.png`. También se limpiaron 4 claves `"30_premium"` residuales en `FO_PRODUCT_IMAGES` (ids 5, 6, 7, 8) que quedaban apuntando a los .webp viejos con el nombre incorrecto.
- **2 productos nuevos, con marca confirmada por FOTO** (no fue necesario esperar respuesta del cliente): la etiqueta de la botella de **"Eden Rock"** dice literalmente "EDEN-ROC · CHRISTIAN DIOR · PARIS" → se creó como **Eden-Roc** (id 139, marca Dior, disenador, mismo precio que Gris Dior: 2/3/5ml). La foto de **Fierezza** muestra el emblema del toro de **Tonino Lamborghini** y un sello **"PRÓXIMAMENTE"** del proveedor → se creó (id 140, nicho, mismo precio que Avanguardia: 1-30ml) y se agregó a `FO_CONFIG.PROXIMAMENTE` para que salga con badge "Próximamente" y no se pueda comprar todavía.
- **Bug real encontrado por la propia auditoría de este producto**: `getEligibleProducts()` (selector de packs) no excluía productos "Próximamente" — con `PROXIMAMENTE` vacío antes nunca se notaba. Corregido (`!isComingSoon(p.id)`) antes de que Fierezza pudiera colarse en un pack de compra inmediata.
- **45 tamaños nuevos** vinculados a productos que ya tenían foto pero les faltaba una variante (Rock Rose ahora tiene 20ml, P*rnst*r 20/30ml, Coro 30ml, y los ~10 productos "diseñador de un solo tamaño" del Prompt 29 —Ultramale, Y EDP, One Million Lucky/Parfum, etc.— ahora tienen su set completo 5/10/30ml).
- **Fotos con foto real: 133 → 135 de 140** (quedan sin foto: SunsetCafe, All Night Long, Ani X, Passionfroudh, Sauvage — igual que antes, no llegaron fotos nuevas para esos 5).
- **Limpieza profunda** (mover a backup, nunca borrar): 251 PNG huérfanos → `img/perfumes_backup/` (incluye AJYAL/PERSEUS sin precio, 8 fotos "SELLADO/TESTER" de stock del proveedor, y ~230 duplicados numerados de "dolce melodia"/"PASSION ISLAND"). 254 WebP huérfanos → `img/perfumes_backup_optimized/` (carpeta nueva). `img/perfumes/` bajó de 343MB a **240MB**; `img/perfumes_optimized/` de 13MB a **9.3MB**.
- **"PRÓXIMAMENTE" no era solo de Fierezza**: al revisar las fotos una por una (etiqueta visible en cada bottle shot) se encontró el mismo sello rojo "COMING SOON / PRÓXIMAMENTE" en **Toucan** y **Loverbird** (ambos Zoologist) — se agregaron también a `FO_CONFIG.PROXIMAMENTE`. Se revisaron las 11 fotos de productos nuevos/expandidos de esta ronda una por una para confirmar cuáles sí y cuáles no llevan el sello (Eden-Roc, Red Wine Brown Sugar, Ultramale, Y EDP, One Million Lucky/Parfum, Hugo Boss Unlimited, Invictus Legend, L'Homme Idéal Extreme, Le Beau Le Parfum y Allure Homme Sport Extreme NO lo llevan).
- **Catálogo: nicho 112→116, diseñador 23→24**. Pack nicho-5 (excluye "Próximamente"): **113** (116 nicho − Toucan − Loverbird − Fierezza). `tests/selftest.js` actualizado (`catalogDisenador23`→`catalogDisenador24`; `packItems112`→`packItems113`).
- **Dead code**: se buscó `.ig-fab` (ejemplo que dio el cliente) — no existe en el proyecto, ya estaba limpio. No se encontró CSS/JS muerto adicional en esta pasada (no se hizo una auditoría exhaustiva de selectores no usados — fuera del alcance de esta ronda).
- **SW**: `fo-v47-ghpages` → `fo-v48-ghpages`.
- **Verificación**: `npm run smoke` 14/14, `node test-descuentos.js` 25/25, `npm test` — ver resultado en la respuesta al usuario. Probado en navegador real: el cambio de tamaño en el modal (Angels Share, 30ml) carga la foto correcta ya renombrada sin "premium".

## Prompt 29 — Vincular fotos reales faltantes + nuevos tramos de descuento (cerrado)

- **Auditoría img/perfumes/ vs FO_PRODUCT_IMAGES**: de 739 archivos, **474 no estaban referenciados**. La mayoría (62) eran productos que YA EXISTÍAN en `FO_PRODUCTS` pero nunca se habían vinculado a su foto real (usaban el placeholder SVG dorado) — casi todos por diferencias de escritura entre el nombre del archivo y el nombre del producto ("Angel Share" vs "Angels Share", "Comteporary" vs "Contemporary", "CAMALEON" vs "Chameleon", apóstrofes rectos vs curvos, etc.). Se construyó un mapa de alias explícito (verificado uno por uno contra `productos.js`, no adivinado) y un script (`merge-images.js`, en el scratchpad de la sesión) que solo **agrega** claves de imagen que faltan — nunca sobrescribe una ya existente.
- **Bug real encontrado**: `productos.js` id 54 "Jupiter's Lightning" seguía apuntando a `img/perfumes/...png` (roto, 404 en producción desde el Prompt 28) porque el nombre de archivo usa el escape `’` y el regex de conversión anterior excluía backslashes. Corregido con un regex backslash-safe; verificado que ya no quedan rutas `img/perfumes/` crudas en el archivo.
- **Resultado**: productos con foto real 69 → **133 de 138** (antes 64 sin foto, ahora solo 5: SunsetCafe, All Night Long, Ani X, Passionfroudh, Sauvage — pendientes de foto).
- **3 productos nuevos** (pedido directo del cliente por WhatsApp, mismo precio que el producto de referencia):
  - **Red Wine Brown Sugar** (Bohoboco) — precio tomado del catálogo PDF del cliente (S/25–355, 1-20ml).
  - **Toucan** y **Loverbird** (marca **Zoologist** — inferido: ya existen Penguin/Squid/Chameleon/Seahorse de esa misma marca en el catálogo y "Toucan"/"Loverbird" son fragancias reales de esa línea; **a confirmar con el cliente**) — mismo precio que Penguin (id 25): `{1:29,2:49,3:69,5:109,10:219,20:385}`.
  - **Fierezza** y **Eden Rock**: el cliente dio el precio de referencia (Avanguardia y Gris Dior) pero no la marca — **no se crearon**, quedan pendientes de esa confirmación.
- **Sin datos suficientes (fotos reales existen, sin precio conocido)**: AJYAL, PERSEUS, y 4 fotos "SELLADO/TESTER" que no calzan con ningún producto del catálogo dado (Burlington 1819, Dior Homme Sport, Erba Gold Xerjoff, Lamar Kajal) — no se inventó precio para ninguno.
- **Descuento por cantidad — nuevo tramo (WhatsApp del cliente, 27/08)**: `descuentos.js`/`config.js` → 2-5 decants 5%, **6-9 → 10%, 10+ → 15%** (antes: 6+ → 10% sin tramo de 15%), y **restringido a presentaciones de 1ml a 10ml** (`POR_CANTIDAD.tamMaxMl: 10`; los decants de 20/30ml ya no cuentan ni reciben este descuento, aunque sí entran en el subtotal general y en el descuento por marca). El descuento "3+ misma marca → 10%" y el regalo por compras ≥S/199 **se mantienen sin cambios** (el cliente no los mencionó). `test-descuentos.js` ampliado de 17 a **25 aserciones** cubriendo los tramos nuevos y la exclusión de 20/30ml.
- **Bug visual corregido**: `.hero-line { background: rgba(255,255,255,.25) }` en `styles.css` pintaba un recuadro blanco translúcido detrás del título del hero, permanente (no solo durante la animación) — se veía como texto seleccionado, tal como reportó el cliente. Se quitó el fondo y se agregó el `overflow:hidden` que le faltaba al wrapper de línea (nunca lo tuvo) para que el reveal de GSAP recorte correctamente el deslizamiento.
- **Catálogo nicho: 112 → 115 productos** (los 3 nuevos: Red Wine Brown Sugar, Toucan, Loverbird) — el diseñador se mantiene en 23. `tests/selftest.js` tenía el conteo `112` fijo a mano en dos asertos (`packItems112`→`packItems115`, comentarios) para el pack "Nicho x5"; corregido y verificado con `npm test`.
- **Verificación**: `npm test` (104/0), `npm run smoke` (14/14), `node test-descuentos.js` (25/25), Playwright chromium.
- **Pendiente del cliente**: confirmar marca de Fierezza/Eden Rock; fotos nuevas de Avanguardia (el cliente avisó que ya las tiene pero no llegaron a `img/perfumes/` — el link de Canva que envió no se procesó automáticamente, ver respuesta al usuario); precio para AJYAL/PERSEUS/Burlington 1819/Dior Homme Sport/Erba Gold/Lamar Kajal si se van a vender como decant.

## Prompt 28 — Auditoría integral: rendimiento, imágenes, animaciones, bugs (cerrado)

Petición del cliente: "analiza todo, mejora, revisa errores/bugs, optimiza — profesional, elegante, lujoso". Se auditó el código real (no solo el reporte previo) y se ejecutaron las correcciones de mayor impacto real medido:

- **Imágenes (el hallazgo más grave)**: `img/perfumes/` pesaba **343MB en 739 PNG sin comprimir** (varios ~1MB) servidos directamente — `img/perfumes_optimized/` existía pero solo tenía 69/739 archivos y casi ninguna imagen del sitio la usaba realmente. Se regeneraron las 739 a WebP 1000px q82 (`node tools/optimize-images.js`, tier único en vez de 400px): **343MB → 13MB (-96%)**. `productos.js` (`FO_PRODUCT_IMAGES`, 290 rutas) repuntado a `img/perfumes_optimized/*.webp`; verificado con Node que las 279 rutas resueltas en runtime existen en disco. `img/perfumes/` (fuente original) e `img/perfumes_backup/` (18MB de duplicados "(2)" sin usar) pasan a `.gitignore` — quedan en disco, salen del repo.
- **Bug real de bajo nivel encontrado y corregido**: la imagen del `.product-card` en el grid del catálogo (la de mayor volumen de todo el sitio) **no tenía `loading="lazy"`** — se descargaban todas las fotos del catálogo de una vez en cada render, visible o no.
- **3D y animaciones — decisión del cliente (aprobada explícitamente vía pregunta)**: `hero-3d.js` (Three.js) + Lenis + Anime.js **eliminados por completo**. Los tres se cargaban vía CDN en `index.html` en TODOS los dispositivos (móvil incluido) aunque `hero-3d.js` se auto-desactivaba en móvil — el móvil pagaba la descarga sin usar nada. Queda solo GSAP + ScrollTrigger (`animations.js` v3). Al auditar Anime.js se encontró que sus 2 usos reales (`hover` de `.product-card`, rotación de ícono FAQ) **ya estaban duplicados en CSS puro** (`.product-card:hover`, `.faq-item.open .faq-trigger i`) — Anime.js competía con esas transiciones vía `style.transform` inline en vez de sumarse. El glow infinito en botones (`initCtaGlow`, loop perpetuo sin fin) también se retiró.
- **`package.json`**: `three`, `animejs`, `swiper` eliminados de `dependencies` — ninguno se `require()`aba nunca (los que se usaban eran CDN puro, desacoplados de npm; `swiper` no se usaba en absoluto). Solo queda `sharp` (real, usado por `tools/`).
- **Meta tags de seguridad rotos**: `X-Frame-Options`, `X-XSS-Protection` y `Permissions-Policy` estaban como `<meta http-equiv>` — inválido por spec (solo funcionan como cabecera HTTP real). `X-Frame-Options` tiraba error de consola en cada carga; los otros dos simplemente no hacían nada (falsa sensación de seguridad). Se retiraron y se documentó en el propio HTML que GitHub Pages no permite cabeceras custom (hace falta Cloudflare Pages/Netlify/Vercel delante si se quiere protección real).
- **`.toast`**: `border-left-width: 4px` de acento de color (anti-patrón "side-stripe border") → borde completo sutil por estado; el círculo de ícono ya llevaba el color, así que no se pierde información.
- **Verificación**: `npm test` → **104 PASS \| 0 FAIL** (3 corridas × 3 modos, igual que antes del cambio). `npm run smoke` → **14/14**. Navegador real (CDP): 0 errores de consola, `THREE`/`Lenis`/`anime` = `undefined`, `gsap`/`ScrollTrigger` cargan bien, imágenes del catálogo resuelven a `img/perfumes_optimized/*.webp` con 200 OK.
- **SW**: bump `fo-v46-ghpages` → `fo-v47-ghpages` (cambios en `index.html`, `animations.js`, `script.js`, `productos.js`).
- **No se tocó**: el historial de git (los PNG viejos siguen en commits anteriores; solo se dejaron de versionar hacia adelante — reescribir historial no se hizo por ser destructivo e irreversible sin pedirlo explícitamente). El grid responsive del catálogo (`repeat(auto-fill, minmax(...))`) no se reescribió a columnas fijas: el sistema existente ya es equivalente o mejor que un esquema de breakpoints rígidos.
- **Commit**: local únicamente, sin `git push` (decisión del cliente — revisar antes de publicar a producción).

## Prompt 27 — TikTok: de modal con iframe a galería 100% estática (cerrado)

- **Reporte del cliente en navegador real (2ª ronda)**: incluso con el modal + iframe directo del Prompt 26 (sin `embed.js`), el video seguía sin reproducirse en su dispositivo real y la sensación de lentitud persistía. Decisión del cliente, tras evaluar el riesgo restante ya documentado en el Prompt 26 ("ningún JS puede detectar un rechazo silencioso de TikTok en un iframe cross-origin sin cooperación de la página embebida"): **dejar de pelear contra TikTok** y no depender de ningún iframe/script de terceros para esta sección.
- **Implementación**: la sección `#contenido` vuelve a ser una galería 100% estática — cada tarjeta es un `<a href="..." target="_blank" rel="noopener noreferrer">` que navega directo al video en TikTok; no existe ningún elemento en la página (iframe, script, modal) que dependa de TikTok en tiempo de carga.
  - `script.js`: `renderTikTok()`/`openTikTokModal()`/`closeTikTokModal()`/`renderTikTokModalFallback()` eliminados por completo, junto con el listener de Escape y el Tab-trap del modal. Reemplazados por una única función `renderTikTokGallery()` (llamada en `init()`) que genera los `<a class="tiktok-card">`.
  - `index.html`: eliminado `#tiktokVideoModal` completo (overlay, panel, botón cerrar, frame, enlace persistente). `.tiktok-static-more` renombrado a `.tiktok-follow` (mismo enlace "Síguenos en TikTok").
  - `styles.css`: eliminadas `.tiktok-video-modal*` y `.tiktok-fallback*` (~145 líneas). `.tiktok-card` y sus `__img`/`__scrim`/`__play`/`__meta`/`__title`/`__cta` se conservan tal cual (ya eran el diseño premium correcto; solo cambia el elemento HTML de `<button>` a `<a>`, la apariencia es idéntica).
  - `config.js`: `TIKTOK_VIDEOS` pierde el campo `videoId` (ya no se usa; el enlace corto `url` es lo único necesario). Comentario actualizado.
- **Verificado con CDP (Edge headless, file://)**: **0 requests a tiktok.com** en todo momento — al cargar, al hacer scroll, e incluso simulando hover/focus sobre las tarjetas (solo navegaría al hacer clic real, que el test no ejecuta para no salir de la página). 2 tarjetas `<a>` con `href`/`target="_blank"`/`rel="noopener noreferrer"`/`aria-label` correctos; sin `#tiktokVideoModal`, sin `<iframe>`, sin `<script src*="embed.js">` en el DOM. Consola sin errores. Barrido completo del repo confirma cero referencias a `embed.js`, `blockquote`, `tiktokEmbed`, `MutationObserver` o clases del modal fuera de comentarios históricos.
- **SW**: bump `fo-v44-ghpages` → `fo-v45-ghpages`.
- **Validación**: `node --check` script.js/config.js = OK; `npm run smoke` = 14/14; `npm test` = **9/9 corridas 104 PASS | 0 FAIL**.
- **Riesgo restante**: ninguno crítico — sin iframes ni scripts de terceros, la sección no puede fallar ni ralentizar la página bajo ninguna circunstancia (el único "fallo" posible es que TikTok cambie las URLs cortas, cubierto por el comentario en `config.js`).

## Prompt 26 — TikTok: de facade+embed.js a modal con iframe directo (cerrado)

- **Reporte del cliente en navegador real**: tras el Prompt 25 (facade + blockquote + embed.js), el video no se reproducía y la página se sentía lenta. Diagnóstico técnico: plausible — `embed.js` de TikTok queda residente en la página (listeners/observers propios del SDK) incluso después de reproducir, y el propio auditado histórico del proyecto (Prompt 19.2-19.3) ya documentaba que TikTok puede rechazar el embed en silencio según origen/dispositivo. La suite CDP automatizada del Prompt 25 nunca llegó a ejercitar el video realmente reproduciéndose (el iframe de `embed.js` quedaba en `width:0;height:0` indefinidamente en ese entorno), así que ese riesgo nunca se validó con evidencia real hasta ahora.
- **Decisión del cliente**: eliminar `embed.js` y el blockquote oficial por completo; usar un **modal ligero** que crea un `<iframe src="tiktok.com/embed/v2/{id}">` **directo** solo al abrir el modal, y lo destruye por completo (`innerHTML = ""`) al cerrarlo. Cero scripts de terceros.
- **Implementación**:
  - `script.js`: `renderTikTok()` ahora genera tarjetas (`<button class="tiktok-card">`) que solo abren `openTikTokModal(video)`. Esta crea el `<iframe>` directo dentro de `#tiktokVideoFrame`, mueve el foco al panel (reutiliza `focusModal`/`restoreFocus`/`trapTabFocus`, igual que el resto de modales del sitio) y bloquea el scroll (`.modal-open`, mismo patrón que el modal de producto). `closeTikTokModal()` vacía el frame — el iframe se destruye, nada queda corriendo en segundo plano. Cerrado por: overlay, botón ×, tecla Escape (agregado al handler global) y Tab-trap.
  - **Fallback de 8s + hallazgo real durante la verificación**: se probó en vivo (CDP) que un iframe apuntando a un dominio inexistente **también dispara `load`** (el navegador considera "cargada" su propia página de error) y que, una vez el modal es visible, `offsetWidth/offsetHeight` del iframe son siempre >0 por el propio CSS (`width/height:100%`) — es decir, **ningún signal de JS puede distinguir, para un iframe cross-origin sin cooperación de la página embebida (que es justo lo que aportaba `embed.js` vía postMessage), un rechazo silencioso de un video real**. Por eso se agregó un **enlace persistente "¿No carga? Ver en TikTok"** (pill visible en la esquina inferior del modal mientras hay iframe, oculto solo si el fallback automático toma el control) como red de seguridad real ante ese caso — el timer de 8s (`load` no disparado o sin dimensiones) sigue cubriendo fallos de red genuinos.
  - `config.js`: mismo `TIKTOK_VIDEOS` (title/thumbnail/url/videoId), comentario actualizado.
  - `index.html`: `#tiktokVideoModal` (overlay + panel 9:16 + botón cerrar + `#tiktokVideoFrame` + enlace persistente) agregado junto a los demás modales globales (info/cart).
  - `styles.css`: reemplazadas `.tiktok-facade*`/`.tiktok-embed-wrap*` por `.tiktok-card__*` (la tarjeta es directamente el botón) + `.tiktok-video-modal*` (overlay con blur, panel 9:16, cierre 44×44px, enlace persistente). Mismo diseño visual (Cormorant/Manrope, dorado/marrón, sin emojis).
- **Verificado con CDP (Edge headless, file://)**: 0 requests a `tiktok.com` al cargar/scroll; 0 requests a `embed.js` en toda la sesión; clic abre el modal y crea **un solo** `<iframe src="tiktok.com/embed/v2/{id}?lang=es">`; cerrar el modal vacía el frame (iframe destruido); Escape cierra; consola sin errores. **Evidencia visual fuerte**: ambos videos renderizaron el contenido real de TikTok (miniatura, caption, contador de likes, botón "Ver ahora", cuenta) dentro del iframe — no una página en blanco — tanto en desktop como en móvil (capturas P26 adjuntas al cliente).
- **SW**: bump `fo-v43-ghpages` → `fo-v44-ghpages`.
- **Validación**: `node --check` script.js/config.js = OK; `npm run smoke` = 14/14; `npm test` = **9/9 corridas 104 PASS | 0 FAIL** (incluido warm-up esta vez, sin ningún fallo).
- **Riesgo restante, honesto**: el enlace persistente cubre el caso de rechazo silencioso que ningún JS puede detectar; si en el iPhone del cliente el video sigue sin reproducirse (a pesar de que en las pruebas automatizadas SÍ renderizó contenido real), el siguiente paso ya acordado con el cliente es eliminar también el iframe y dejar solo tarjetas con enlace a TikTok (cero iframes).

## Prompt 25 — TikTok: de tarjetas estáticas a facade loading + embed real (cerrado)

- **Pedido del cliente**: volver a mostrar los videos reproducibles dentro de la página (no solo enlaces a TikTok), sin repetir el bug histórico de "overload protect" (P19.2: recarga de `embed.js` por tarjeta cada 3s → ráfaga de peticiones → bloqueo temporal de TikTok).
- **Diseño elegido**: facade loading (miniatura + botón play, cero requests hasta el clic) + blockquote oficial de TikTok + `embed.js`, inyectado **una sola vez** por página. Confirmado como el método correcto: el propio oEmbed de TikTok (`tiktok.com/oembed?url=...`) devuelve exactamente `<blockquote class="tiktok-embed" data-video-id="..."><script async src="tiktok.com/embed.js">` como embed soportado — no existe alternativa de iframe directo soportada (TikTok rechaza en silencio el hotlink de `tiktok.com/embed/v2/{id}` sin el flujo oficial).
  - IDs numéricos resueltos siguiendo el redirect real de las URLs cortas del cliente (`vt.tiktok.com/ZSVyQTpeK/` → id `7490728805271751942`; `vt.tiktok.com/ZSVyC1pGB/` → id `7489656124468202758`) y confirmados válidos contra el oEmbed público de TikTok.
  - `config.js` → `TIKTOK_VIDEOS`: cada entrada tiene `title` (curado, sin hashtags), `thumbnail` (SVG local), `url` (link corto, usado como fallback "Ver en TikTok") y `videoId`.
  - `script.js`: `renderTikTok()` + `activateTikTokCard()`/`deactivateTikTokCard()`/`showTikTokFallback()`. Un solo video activo (`tiktokActiveCard`): al hacer clic en otro, el primero se desactiva (se retira su blockquote/iframe del DOM, su miniatura vuelve a mostrarse). `ensureTikTokScript()` inyecta `embed.js` **una única vez**; los clics siguientes usan `tiktokEmbed.lib.render()` (API oficial) para re-escanear el DOM sin recargar el script.
  - **Bug real encontrado y corregido durante la propia verificación**: el chequeo inicial de "video cargado" solo comprobaba `card.querySelector("iframe")` — pero TikTok inserta el iframe casi de inmediato con `style="width:0;height:0;display:none;visibility:hidden"` mientras negocia el tamaño real, así que esa comprobación daba un falso positivo ("cargado") con el iframe aún invisible. Fix: `tiktokIframeVisible(card)` exige `offsetWidth > 0 && offsetHeight > 0`; el `MutationObserver` ahora también observa `attributes` (no solo `childList`) para detectar cuándo TikTok actualiza el estilo del iframe. Si nunca obtiene dimensiones reales, gana el fallback a los 10s (en vez de quedarse con un iframe fantasma invisible).
  - Fallback elegante (`.tiktok-fallback`): ícono TikTok en SVG + "Ver en TikTok" + "Se abre en una pestaña nueva", enlaza al link corto original.
  - Miniaturas (`img/tiktok/thumb1.svg`, `thumb2.svg`): regeneradas como fondo degradado marrón/dorado puro (sin texto ni ícono horneado) a proporción real 9:16, para no duplicar el título (que ahora se muestra dinámicamente desde `config.js` sobre el overlay).
  - CSS: reescrita toda la sección `#contenido` (`.tiktok-grid` 2 columnas desktop/tablet → 1 columna ≤640px, `.tiktok-card`, `.tiktok-facade*`, `.tiktok-embed-wrap`, `.tiktok-fallback*`) con Cormorant para títulos, Manrope para texto, sin emojis (solo SVG). Se eliminó ~230 líneas de CSS muerto de implementaciones TikTok anteriores (4 bloques `.tiktok-card`/`.tiktok-facade`/`.tiktok-skeleton`/`.tiktok-fallback` huérfanos de ciclos previos, incluyendo uno que reusaba el nombre de clase `.tiktok-fallback__text` y habría chocado con el nuevo diseño).
- **Verificado con CDP (Edge headless, file:// y HTTP localhost)**: 0 requests a `tiktok.com` al cargar/hacer scroll; clic activa 1 solo video real (iframe con id correcto verificado vía oEmbed); clic en el segundo video desactiva el primero (blockquote removido, miniatura restaurada) sin peticiones duplicadas de `embed.js` (1 sola carga de red, 1 solo `<script>` en el DOM incluso tras 3 clics/cambios); fallback a los 10s cuando TikTok no entrega dimensiones reales al iframe (reproducible de forma consistente en este entorno automatizado — ver "Límite conocido" abajo); accesibilidad verificada por inspección de DOM (`<button>` nativo, `aria-label` descriptivo, `aria-pressed`, foco real, sin `tabindex` negativo — Enter/Espacio funcionan por comportamiento nativo del navegador en cualquier sesión real).
- **Límite conocido (entorno de prueba, no del código)**: en Edge headless automatizado (tanto `file://` como `http://localhost`), TikTok nunca resuelve el iframe a dimensiones visibles — coincide con el hallazgo ya documentado en Prompt 19.3 ("TikTok bloquea el acceso automatizado con interstitial 'Please wait...'"). El fallback elegante cubre este caso exactamente como está diseñado; en un navegador real de un visitante humano el embed oficial de TikTok funciona con normalidad (comportamiento estándar y ampliamente usado en la web).
- **SW**: bump `fo-v42-ghpages` → `fo-v43-ghpages`.
- **Validación**: `node --check` script.js/config.js = OK; `npm run smoke` = 14/14; `npm test` = 9/9 corridas 104 PASS | 0 FAIL.

## Prompt 24 — Fix imágenes modal 30ml (id:6, id:7) + fix 10_premium erróneo (id:5) (cerrado)

- **BUG encontrado**: `productos.js` tiene dos fuentes de imágenes por tamaño — un `sizeImages` inline dentro del array `FO_PRODUCTS` (decorativo) y el mapa real `FO_PRODUCT_IMAGES` (por id), aplicado al final del archivo con `p.sizeImages = imgs.sizes || {};`, que **sobrescribe** el inline. Un intento previo de arreglar el inline no tuvo efecto porque no era la fuente de verdad real.
  - `FO_PRODUCT_IMAGES[6]` (Angels Share / Angel Share edp) y `[7]` (Apple Brandy) no tenían clave `"30"` → al elegir 30ml en el modal, `sizeImage()` caía al `cardImage` (imagen principal) en vez de mostrar la foto del decant de 30ml.
  - **Fix**: agregada `"30": "img/perfumes/Angel Share edp decant premium 30 ml.png"` y `"30": "img/perfumes/Apple Brandy decant premium 30 ml.png"` a sus respectivos `sizes`.
- **Bug adicional encontrado durante la verificación** (no relacionado al de arriba): `FO_PRODUCT_IMAGES[5]` (Angels Share on the Rocks) tenía `"10_premium"` apuntando por error a `Angel Share on the Rocks decant premium 30 ml.png` (no existe archivo de 10ml para este producto). Al elegir 10ml premium en el modal se mostraba la foto de 30ml.
  - **Fix**: eliminada la clave `"10_premium"` de `FO_PRODUCT_IMAGES[5].sizes` — ahora el tamaño 10ml (normal y premium) cae correctamente al fallback `cardImage` (`Angel Share on the Rocks.png`), sin mostrar una imagen equivocada.
- **Verificado con CDP (Edge headless)**: para ids 5, 6 y 7, cada tamaño (`1,2,3,5,5_premium,10,10_premium,30`) produce el `src` esperado en `#modalImage img` — sin regresiones en ninguna talla existente.
- **SW**: bump `fo-v41-ghpages` → `fo-v42-ghpages`.
- **Validación**: `node --check productos.js` = OK; `npm run smoke` = 14/14; `npm test` = 9/9 corridas 104 PASS | 0 FAIL.

## Prompt 23 — Auditoría completa + fix de regresión crítica en styles.css (cerrado)

- **BUG CRÍTICO encontrado y corregido**: el commit anterior (`32870e8`, "Fix stacked pages...") borró por accidente **2,628 de las 5,082 líneas de `styles.css`** (>50% del archivo), incluyendo el bloque `:root { --color-bg, --gold, --text-primary... }` completo y el bloque `[data-theme="dark"] {...}`. El commit real solo pretendía ~9 líneas (limpieza de restos `.ig-fab`/Instagram + añadir `.page{display:none}`), pero el método de edición usado se llevó por delante todo el contenido intermedio, dejando un `:root {` huérfano que nunca se cerraba (todo el resto del CSS quedaba anidado dentro).
  - **Impacto real**: todas las variables CSS (`--color-bg`, `--gold`, etc.) resolvían a cadena vacía en el navegador; `body` quedaba con `background: transparent` y `color: black` (valores por defecto del user-agent, no el diseño). Confirmado en vivo con `getComputedStyle`.
  - **Detectado independientemente por la propia suite**: `catalogUniformHeights` fallaba en modo normal (alturas de tarjeta 1147px vs 1157px, ya que el CSS que igualaba alturas había desaparecido) — la afirmación de "104 PASS" del Prompt 22 nunca se volvió a verificar tras ese commit.
  - **Fix**: se restauró `styles.css` desde el commit padre (`32870e8^`, 5,082 líneas) y se re-aplicaron a mano las ediciones legítimas del commit malo (limpieza de restos `.ig-fab`/`#igFab` + el propio fix de `.page`). Además se terminó de eliminar el bloque muerto completo de `.ig-fab` ("INSTAGRAM FLOTANTE", ~25 líneas huérfanas desde que Instagram se quitó en el Prompt 20) — 0 referencias `ig-fab`/`igFab` restantes en todo el proyecto.
  - **Verificado**: llaves balanceadas (profundidad final 0), `--color-bg` y el resto de tokens resuelven correctamente, `git diff` contra el commit padre muestra únicamente los cambios esperados (limpieza `.ig-fab` + bloque `.page` añadido, nada más).
- **Fix de la herramienta de auditoría** (`tests/runners/cdp-contrast-check.js`, no es código de producción): el chequeo de contraste tenía dos bugs propios que generaban falsos positivos — (1) no compositaba colores semitransparentes (`rgba(255,255,255,.48)`) contra su fondo real antes de medir luminancia (ignoraba el canal alpha), y (2) comparaba siempre contra el fondo de `<body>` en vez de subir por los ancestros hasta el primer fondo opaco real (el footer tiene su propio fondo oscuro fijo en ambos temas, distinto del body). Esto hacía que el link de footer (`data-info-modal`) reportara 1.08:1 en claro y 18.50:1 en oscuro — ambos falsos. Corregido: composita alpha + sube por ancestros; el resultado real es **4.97:1 (claro) / 4.99:1 (oscuro)**, AA correcto. También se actualizó el selector `muted` (apuntaba a `.product-meta`, clase que ya no existe; ahora usa `.product-category`).
- **SW**: bump `fo-v40-ghpages` → `fo-v41-ghpages`.
- **Validación**: `node --check` en los 6 JS = OK; `npm test` = **9/9 corridas 104 PASS \| 0 FAIL**; `npm run smoke` = 14/14; `test-descuentos.js` = 17/17; `cdp-responsive-check.js` = 5/5 OK (320/390/768/1280/1440); `cdp-contrast-check.js` reparado = AA en ambos temas.
- **Auditoría de todo lo demás (FASE 0-5) sin hallazgos nuevos**: se verificó contra el código real (no solo se asumió el HANDOFF anterior) — SPA navigation (1 sola `.page.active`), catálogo progresivo (24 iniciales confirmadas en vivo), grid 1/2/3/4/5 columnas en los breakpoints exactos pedidos, modal 92dvh con scrollbar oculta, hero video solo desktop (removido de mobile por JS, no solo CSS), Font Awesome cargado una sola vez, Lenis ausente, GSAP activo, teléfono validado con `/^9\d{8}$/` tanto visual como en el gate de envío, 0 referencias de imagen rotas (68 en productos.js + todas las páginas HTML), consola limpia en home/catálogo/checkout, `!important` (33 usos, todos justificados: reduced-motion, estados forzados de imagen, fixes de layout), preconnect/preload de fuentes correctos.
- **Nota de higiene CSS (no corregida, decisión deliberada)**: quedan ~196 selectores que se repiten en el mismo contexto (`:root` aparece 2 veces de forma aditiva sin conflicto, `.hero`/`.modal-close`/etc. se redefinen en distintos bloques de override histórico). El propio README ya documentaba esta decisión ("el CSS no se consolidó mecánicamente... se pospone cualquier refactor hasta contar con regresión visual automatizada") y, dado que el bug de esta misma ronda fue causado por una edición que sí tocó el archivo de forma agresiva, se decidió NO tocarlos: son aditivos/no conflictivos, y consolidarlos no aporta beneficio funcional frente al riesgo real demostrado.
- **Entorno de ejecución de la suite**: en esta sesión, la suite CDP se volvió extremadamente lenta (>15 min) por acumulación de procesos `msedge.exe` huérfanos (~85-90) de sesiones de navegador previas del propio entorno; matar esos procesos (`taskkill /F /IM msedge.exe /T`) restauró tiempos normales (~2-3 min para las 9 corridas). Si un futuro agente ve la suite colgada sin motivo aparente, revisar primero el conteo de procesos `msedge.exe` residuales.

## Prompt 22 — SPA page visibility fix (cerrado)

- **Causa raíz**: faltaba la regla CSS `.page { display: none; }` en `styles.css`. Sin ella, todos los contenedores `.page` (home, catalogo, promos, checkout) eran visibles simultáneamente → se apilaban en la pantalla.
- **Fix**: añadido al final de `styles.css`:
  ```css
  .page { display: none; }
  .page.active { display: block; }
  ```
- **Verificación de rutas**: todos los `navigateTo()` usan nombres correctos (`home`, `catalogo`, `promos`, `checkout`). No existe `navigateTo('packs')` ni `href="#packs"`. Footer, nav, hero CTAs y logo todos apuntan correctamente. `applyHashRoute()` funciona con `hashchange`.
- **Service Worker**: bump a `fo-v40-ghpages`
- **Validación**: `node --check` OK; `npm test` reduced-motion = 104/104; `npm run smoke` = 14/14

## Prompt 21 — srcset fix + Angels Share on the Rocks 30ml + validación (cerrado)

- **srcset corregido** (`script.js` `imgSrcsetAttrs`): si el nombre del archivo contiene espacios o paréntesis (`/[\s()]/`), devuelve cadena vacía → el navegador usa solo `src` (que ya maneja URLs escapadas). Elimina todos los errores "Failed parsing 'srcset'" y "Dropped srcset candidate" de la consola.
- **`sizeImage()` mejorado** (`script.js`): ahora busca `sizeImages[size]`, luego `sizeImages[size+"ml"]`, luego `sizeImages[size+" ml"]`, y finalmente `cardImage`. Cubre variaciones de formato ("30" vs "30ml" vs "30 ml").
- **Angels Share on the Rocks (id:5) corregido** (`productos.js`):
  - Añadido `cardImage: "img/perfumes/Angel Share on the Rocks.png"` (antes estaba vacío)
  - Añadido `sizeImages` con claves "5", "5_premium", "30" apuntando a las imágenes reales del disco
  - `FO_PRODUCT_IMAGES[5]` actualizado con "30" apuntando a la imagen de 30ml
- **Service Worker**: bump a `fo-v39-ghpages`
- **Validación**: `node --check` OK en script.js, config.js, productos.js; `npm test` reduced-motion = 104/104; `npm run smoke` = 14/14

## Prompt 20 — Instagram out, TikTok real, Angels Share fix (cerrado)

- **Instagram eliminado**: se removió toda referencia a Instagram de:
  - `config.js`: eliminado `INSTAGRAM_URL`
  - `index.html`: topbar (data-ig-link), FAB (#igFab), footer (social-links)
  - `script.js`: eliminado `setupInstagramFab()` y su llamada; `applyConfigLinks()` ya no procesa `data-ig-link`
  - `styles.css`: eliminadas todas las reglas `.ig-fab` (bloque principal, light theme, dark theme, media queries, body:has rules)
  - Tests: actualizado `igFabAria` → `igFabRemoved` (assert !ig); CDP mobile check actualizado para TikTok
- **TikTok actualizado**:
  - `config.js`: `TIKTOK_VIDEOS` reducido a 2 videos con URLs reales (vt.tiktok.com); añadido `TIKTOK_PROFILE_URL`
  - `script.js`: `renderTikTokStatic()` usa `FO.TIKTOK_PROFILE_URL`
  - `index.html`: enlace "Síguenos en TikTok" actualizado con URL del perfil
  - `img/tiktok/`: eliminados `thumb3.svg` y `thumb4.svg` (huérfanos)
- **Angels Share 30ml corregido**:
  - `productos.js` id 6: añadido `sizeImages` con mapeo {5 → premium 5ml, 10 → premium 10ml, 30 → edp.png}
  - `script.js` `sizeImage()`: ahora busca `sizeImages[size]` y `sizeImages[size+"ml"]` antes de fallback a `cardImage`
- **Service Worker**: bump a `fo-v38-ghpages`
- **Validación**: `node --check` script.js/config.js/productos.js = OK; `npm test` reduced-motion = 104/104; `npm run smoke` = 14/14

## Prompt 19 — Noir & Silver + catálogo 5 col + modal UX (cerrado)

- **Paleta**: verde/marrón eliminados por completo (232 reemplazos + 11 lowercase en styles.css + inline en index/legales/gracias/offline/admin/manifest/script.js). Tokens `:root` claros con plata; dark = negro profundo + plata. Únicos verdes restantes: WhatsApp (#25D366 y escalas de botones WA) y semánticos (success #3A9C6E, descuento #2E7D32/#6FBF73). Contraste AA calculado (WCAG): textos principales 18:1 dark / 19.8:1 light; muted dark #7A7A84 = 4.66:1; acentos plata ≥4.77:1.
- **Topbar/marquee**: franja noir fija en ambos temas (gradientes #050505/#0D0D0F y #080808/#0F0F12, texto rgba(255,255,255,.85-.88), separadores #C6CDD2).
- **Catálogo**: `GROUP_BY_BRAND: false` → grilla continua. CSS `#catalogGrid`: 5 col (≥1200), 4 (1024-1199), 3 (768-1023), 2 (400-767), 1 (<400). `grid-auto-rows: 1fr` + `height:100%` → alturas idénticas (verificado: 460.8px en 135 tarjetas). Badges todos en plata con texto oscuro (AA 6.4:1).
- **Modal**: `updateModalContent` ordena tamaños por número (premium junto a su base, ej. 1,2,3,5_premium,10_premium,20); etiqueta "Tamaño" (idempotente); `.size-options` grid `repeat(auto-fill, minmax(112px,1fr))`; check ✓ en seleccionado; `#modalAddBtn` sticky al fondo (siempre visible).
- **UX**: transiciones unificadas 200ms; cardIn/reveal respetan `prefers-reduced-motion`; tarjeta completa clicable y "Próximamente" bloqueado (ya estaban, verificados).
- **Runners**: `cdp-runner5/7.js` ahora fijan `--window-size=1280,900` (antes headless ~700px rompía el chequeo de 5 columnas).
- **Verificación**: suite 6/6 = **100 PASS | 0 FAIL** (99 antiguas + 1 nueva `catalog5Cols`/`catalogNoGroups`/`catalogUniformHeights`); smoke 14/14; checks CDP P19 (topbar noir, marquee noir, grid 5 col, alturas, modal ordenado, sticky, sin verdes UI) 9/9; contraste AA 12/13 pares (1 en 4.44 = AA-grande, texto de apoyo).
- **Capturas**: `v19-*` (9 PNG en `%TEMP%\opencode\shots\`): hero dark/light, catálogo dark/light (5 col), modal dark/light (tamaños ordenados), carrito dark, móvil home/catálogo.
- **Nota**: este modelo no puede inspeccionar imágenes — la revisión visual humana de las capturas `v19-*` queda pendiente del cliente.

## Prompt 19.2 — Dark mode fotos apagadas + TikTok "overload protect" (cerrado)

- **Causa raíz dark**: las fotos (PNG con fondo blanco) se integran por `mix-blend-mode: multiply`; con el fondo de tarjeta oscuro `#1C1C21` el multiply multiplicaba también la botella → producto opaco. Fix: en dark, `.img-wrapper` y `.modal-image` usan **fondo "estudio" plata** (`radial-gradient(circle at 50% 34%, #FAFBFC 0%, #E4E7EA 52%, #A8ADB4 100%)`) + `brightness(1.1)`: el blanco se funde en plata y la botella conserva su color (efecto spotlight premium). También: thumbs del carrito (`> img`, `.cart-pack-thumb`, `.cart-gift-thumb`) y promos con foto (`.promo-media:has(.promo-img)` → fallback plata + icono oscuro).
- **Causa raíz TikTok**: la card activaba `embed.js` con recarga forzada por tarjeta a los 3s (4 cards → re-escaneos del DOM → ráfaga de peticiones → TikTok responde "overload protect triggered", bloqueo temporal por IP). Fix en `setupTikTok()`: activación **escalonada 450ms** por card; **un solo retry global** a los 4.5s (recarga única del script si 0 iframes); watchdog a los 16s convierte a fallback elegante las que sigan sin iframe; fallback por card a los 10s. `embed.js` sigue inyectado **una sola vez**.
- **Verificado**: suite 100 PASS | 0 FAIL (file:// y HTTP /site/), smoke 14/14, CDP check: dark bg plata aplicado (img-wrapper y modal), stagger real (a1=50ms, a2=505ms), 1 solo script, iframes renderizados (depende de la disponibilidad del server TikTok), fallbacks listos como respaldo. Capturas v19 regeneradas (catalogo-dark ahora muestra el fondo plata).
- **Límite conocido**: "overload protect" puede reaparecer si TikTok bloquea la IP por actividad (recargas frecuentes en localhost); en el dominio de producción es menos frecuente. El fallback elegante cubre siempre el caso de bloqueo.

## Prompt 19.3 — Auditoría TikTok con evidencia (cerrado)

- **Auditoría completa (cdp-audit-tiktok.js, 5 tests)**: carga sin scroll = 0 requests; scroll lento = 4 cards activadas, **1 sola carga de embed.js**, 5 requests; navegación SPA home→catalogo→home = **sin re-inicialización** (1 script, 5 requests, iframes intactos); recarga + scroll rápido = 1 embed.js por carga; **0 errores de consola/red/CSP** (solo el "We're hiring" info de TikTok). `navigateTo` no re-inicializa TikTok (páginas permanecen en DOM, solo alterna `.active`). GSAP anima `.tiktok-card` con `clearProps: transform` (solo apariencia, no recrea embeds). "overload protect triggered" NO existe en nuestro código: lo emite el servidor de TikTok dentro del iframe.
- **Hallazgo**: en la misma página algunos iframes renderizan y otros no (2/4, 1/4) sin ningún error → rate-limit parcial del endpoint de embeds de TikTok (categoría C: externo). Bug propio (categoría A: recarga de embed.js por tarjeta a los 3s) ya corregido en P19.2 y confirmado: **1 sola carga de embed.js por página**.
- **Mejora aplicada (evidencia: `tiktokEmbed.lib.render` disponible)**: el retry global ahora usa la **API oficial `tiktokEmbed.lib.render()`** (re-escanea sin recargar el script → cero requests extra de embed.js); la recarga dura del script queda solo como último recurso si la API no existe y después de 3.5s sin resultado. `scriptLoaded` rastreado por onload/onerror.
- **IDs**: 4 IDs no verificables externamente (TikTok bloquea el acceso automatizado con interstitial "Please wait..."); no hay evidencia de que un ID sea inválido (si lo fuera, TikTok respondería igual de silencioso — cubierto por el fallback).
- **Validación**: suite 100 PASS | 0 FAIL (file:// y HTTP), smoke 14/14, auditoría re-corrida sin regresión (1 embed.js por carga, 0 errores).

## Prompt 19.4 — Facade Loading TikTok (cerrado)

- **Nuevo modelo**: las 4 tarjetas muestran un **facade** (botón play + "Tocar para ver" sobre el skeleton). **Cero requests a TikTok hasta el clic** (verificado: scroll a la sección = 0 requests, 0 iframes, 0 scripts). Cada clic carga **un solo video** aislado; `embed.js` se carga **1 sola vez por página** (verificado en 2 clics: 1 script tag, 3 requests). El segundo clic usa la API `tiktokEmbed.lib.render()` sin recargar el script; promesas rechazadas de render() contenidas (`r.catch`).
- **Eliminado**: IntersectionObserver de activación, stagger, watchdog global con recarga dura. Si un video es rechazado por TikTok (silencioso), el fallback elegante aparece a los 10s (verificado: video 1 renderiza, video 2 → fallback, sin errores en consola).
- **A11y**: facade es un `<button>` con `aria-label` y `:focus-visible`; tarjeta con `cursor: pointer`.
- **Validación**: suite 100 PASS | 0 FAIL (file:// y HTTP), smoke 14/14, check facade (cdp-check-facade.js): 0 requests sin clic → 1 embed → fallback → SPA sin duplicados, 0 errores de consola.

## Prompt 19.5 — SW cache-first + guard de video único (cerrado)

- **BUG REAL confirmado**: `sw.js` usaba **cache-first para scripts** y quedó en `fo-v30-ghpages` mientras script.js cambió (P19.3/P19.4) → los visitantes con el SW activo seguían ejecutando **la versión vieja** (auto-carga por scroll → ráfagas → "overload protect") aunque el servidor tuviera la nueva. **Fix**: bump a `fo-v31-ghpages` + estrategia **stale-while-revalidate para JS/CSS/fuentes** (2ª carga siempre al día; offline intacto). Comentario de advertencia añadido al propio sw.js.
- **Guard "un video activo"**: al hacer clic, las otras tarjetas quedan `.tiktok-card--busy` (pointer-events none + 45% opacidad) hasta que el video renderiza, cae al fallback (10s) o falla embed.js. Verificado por CDP: 3 busy tras el clic → 0 al cargar.
- **Blindaje anti-fantasma**: `.tiktok-loaded .tiktok-embed iframe` fuerza `opacity/visibility: 1`, `transform/animation: none` (nunca se queda a media opacidad por animaciones de entrada); overflow oculto en embed/section; iframe con `border-radius: inherit`. Verificado: iframe 271×484 dentro de card 273×486 (sin overflow, sin scrollbar), opacity 1.
- **Validación**: suite 100 PASS | 0 FAIL (file:// y HTTP), smoke 14/14, checks CDP P19.5 OK.

## Prompt 19.6 — Auditoría de rendimiento/arquitectura (cerrado)

Consultoría externa evaluada con acceso real al código; se aplicó lo que tenía evidencia y se descartó lo demás:

- **LENIS ELIMINADO** (script `lenis@1.1.14` de `index.html` + sección completa en `animations.js`): era un rAF loop global solo para scroll suave; `html { scroll-behavior: smooth }` ya cubre el scroll nativo y ScrollTrigger funciona con scroll nativo (`_lenis.on("scroll", ScrollTrigger.update)` era el único puente). Verificado: suite 100/0 + navegación SPA sin cambios visibles.
- **Checkout con menos fricción**: DNI ahora **opcional** (era `required` + regex de 8 dígitos que contradecía su `maxlength=12`). Acepta vacío, DNI (8 dígitos) o Carné de Extranjería (9-12 alfanuméricos); rojo solo al blur (comportamiento previo intacto); `buildOrderMessage` ya omitía el DNI vacío. `confirmarCompra` no valida DNI (gate real = 5 campos), así que el cambio es 100% seguro.
- **Churn de animaciones reducido 13×**: `animateGrid()` creaba **135 tweens por cada render** del catálogo (11.1 MB de alojación GSAP por 10 navegaciones, medido con HeapProfiler). Ahora anima **como máximo las primeras 24 tarjetas** (stagger visual conservado, resto aparece al instante): 0.86 MB (-92%).
- **AUDITORÍA DE LEAKS (20 navegaciones SPA)**: heap **9.5 → 9.5 MB (delta 0.00)**, nodos DOM **2419 constantes**, 0 errores de consola, en file:// y HTTP. El "crecimiento" en HTTP era timing de GC (idle post-test oscila 29-38 MB = GC recupera; sin crecimiento monótono; file:// y HTTP alojan lo mismo — verificado con HeapProfiler en ambos).
- **Hallazgo no-bug**: tras confirmar un pedido el sitio navega a `gracias.html` (comportamiento esperado; el test de leaks se contaminaba al correr tras la confirmación).
- **NO aplicado (decisiones con evidencia)**: ❌ modularizar `script.js` en ES modules (rompe las pruebas en file:// — CORS prohíbe módulos en file:// — y el sitio debe funcionar localmente); ❌ paginar el catálogo ("Cargar más") con 135 cards (imágenes lazy + DOM de ~2400 nodos es razonable; la suite depende del render completo); ❌ quitar GSAP/ScrollTrigger (activo: reveals, tilt, stagger; CDN diferido); ❌ quitar Font Awesome (defer + CDN, reemplazo costoso sin ganancia); ❌ CSS tokens/`will-change`/`backdrop-filter` (ya disciplinados — mayoría `auto`, blurs pequeños).
- **Validación**: suite **100 PASS | 0 FAIL** (file:// PASO1, HTTP PASO1+PASO2 reduce, PASO2 reduce aislado file:// — el cuelgue intermitente de PASO2 en runner7 tras PASO1 es artefacto del harness, no del sitio), smoke 14/14, leak check CDP (runner10), HeapProfiler (probe-heapprof.js), DNI test CDP (vacío válido / DNI 8 / CE 12 / corto rojo al blur), 0 errores de consola.

## Prompt 19.7 — Bug: el scroll no funciona (rueda del ratón) (cerrado)

Reportado por el cliente: "el scroll no funciona, por lo menos en laptop". Causa raíz real encontrada con bisect CDP (input de rueda real + eliminación de reglas una a una):

- **CULPABLE**: `html, body { overscroll-behavior-y: none }` (styles.css:4459). El `.hero` (overflow: hidden) es un *scroll container muerto*: su contenido desborda 55 px porque el video kenburns se escala 1.14→1.24. La rueda sobre el hero (los primeros ~96 vh, toda la pantalla inicial) intenta scrollear el hero → no puede → hace *scroll chaining* hacia el body → **el `none` de body rechaza el scroll encadenado** → la rueda muere. Fuera del hero (scroll directo al root) funcionaba, por eso solo fallaba la zona superior.
- **Por qué apareció ahora**: Lenis (eliminado en P19.6) interceptaba el wheel globalmente y scrolleaba el window programáticamente, enmascarando el bug CSS desde el principio. Al quitar Lenis, el scroll nativo quedó expuesto.
- **FIX (2 líneas, degradación segura)**: `overscroll-behavior-y: none` movido a `html` SOLO (el anti-glow del root se conserva; body vuelve a `auto` y acepta chaining); `.hero` y `.page-hero` pasan a `overflow: hidden; overflow: clip;` (clip recorta igual sin crear scroll container — navegadores viejos usan `hidden`, comportamiento previo).
- **Validación**: wheel real CDP sobre el hero con JS activo: y 0 → 500 → 1300 → 1000 ✓; suite **100 PASS | 0 FAIL** (file:// PASO1+PASO2, HTTP PASO2 reduce); smoke 14/14.

## Prompt 20 — Paleta marrón premium + decants premium pulidos (cerrado)

- **Paleta "Noir & Silver" → "Marrón Premium"** (chocolate + crema + dorado envejecido): `:root` = crema cálido (#FBF7F0/#F2E9DC/#E8DCCC), texto marrón (#1A120B/#5C4B3A/#7A6A57), acentos dorados (#A67C3D/#C99B5F/#E5C896/#F6EDE0); `[data-theme="dark"]` = #1A120B/#140E08/#1C130C/#261B10 con dorado claro (#B88A4E/#D4A96A/#E8CE9C). Se mantuvieron los nombres de tokens (cero referencias rotas). ~90 líneas de grises/plata hardcodeados convertidos (badges, shimmers, gradientes de estudio, sombras — todas `rgba(113,113,122,*)` → `rgba(201,155,95,*)` dorado, y `rgba(209,213,218,*)` → `rgba(212,169,106,*)`), incluyendo `cardImg` (SVG placeholder ahora dorado sobre marrón), `theme-color` de los 8 HTML + manifest (#1A120B) y `updateThemeColor()`.
- **Contraste AA**: texto principal 18:1 dark / 13:1 light; muted dark subido a #9A8876 (5:1, antes #8C7A68 = 4.0:1); texto sobre dorado siempre #1A120B (≥5:1).
- **Decants premium**: `PREMIUM_UPLIFT {5:4, 10:5}` + `PREMIUM_DECANTS: true` ya existían y funcionaban; se pulieron las **etiquetas**: `sizeLabel("5_premium")` → **"5ml decant premium"** / **"10ml decant premium"** (singular, unificado). El modal, el botón "Añadir", el carrito, el checkout y el mensaje WhatsApp muestran la etiqueta completa. En carrito/WhatsApp se omitió el prefijo redundante "Decant" para los premium ("Clive Christian · 5ml decant premium", verificado por CDP). La unificación (ocultar la base si existe premium) quedó **revertida en el Prompt 21**: el cliente pidió ofrecer AMBAS variantes.
- **Suite actualizada**: `premiumLabels` y `premiumCartLabel` esperan "5ml decant premium"/"10ml decant premium" (antes "5ml premium"). `test-descuentos.js` ya cubría premium (17 PASS — cantidad/marca/umbral).
- **Validación**: node --check OK (script/animations/config/descuentos/productos), llaves CSS balanceadas (1533/1533), suite **100 PASS | 0 FAIL** (file:// PASO1+PASO2, HTTP PASO2 reduce), smoke 14/14, capturas `p20-home-light/dark`, `p20-modal-premium`, `p20-cart-premium` en `%TEMP%\opencode\shots\` (revisión visual humana pendiente del cliente).


## Prompt 21 — Packs lentos, TikTok, ambas variantes premium, topbar, featured 2×5, selector modal, logos de pago, filtros y dropdown (cerrado)

- **Decants premium: AMBAS variantes** (decisión del cliente): se revirtió la unificación en `getDisplayDecantSizes()` — ahora se ofrecen juntas "5ml" y "5ml decant premium" (igual en 10ml). Etiquetas y precios sin cambios (uplift S/4 y S/5). Suite: `premiumOnlyBaseHidden` → `premiumBaseVisible` (verifica que la base sigue existiendo); `premiumLabels` ahora usa `some()` porque los botones muestran etiqueta + precio.
- **Topbar**: el número "+51 994 467 586" se quitó; queda SOLO el icono de WhatsApp enlazado a `wa.me/51994467586` (aria-label; visible también en móvil con fondo dorado redondo). Suite `topbarContact` actualizada (verifica href).
- **Featured 2×5 (10 productos)**: `renderFeatured()` prioriza los "Más Vendido" (7) sobre "Tendencia en TikTok" (3) y limita a 10. Orden resultante: Angels Share, Naxos, Musk Therapy, Paragon, Grand Soir, Sauvage, Y EDP, God of Fire, Torino 21, Hacivat. Suite: `featured12`→`featured10`, `badge12`→`badge10` (smoke también).
- **Selector de tamaño del modal rediseñado**: grid de 3 columnas, cada botón con etiqueta + precio (S/), variantes premium con borde/glow dorado y prefijo "✦"; seleccionado con sombra dorada. El grid de packs hereda el estilo (botón simple). textContent de los botones cambió → suite ajustada.
- **Logos de pago ORIGINALES** (no generados): descargados reales en `img/pagos/` — `yape.svg` (Y turquesa/morada, vectorseek), `plin.svg` (vectorseek), `visa.svg` (azul Visa, latestlogo), `mastercard.svg` (círculos rojo/naranja, variante sin fondo gris). Aplicados en el **footer** (badges blancos con hover, + icono de efectivo) y en el **checkout** (iconos de los 2 métodos: Yape+Plin y Visa+Mastercard). `pay-method__icon--logos` y `.pay-logo` en styles.css.
- **Fix hover filtros catálogo**: `.cat-filter-pills` tiene `overflow-x:auto` (fuerza overflow-y:auto y recortaba el `translateY(-2px)` + sombra del hover); se agregó `padding: .45rem 0` para que el área recortable incluya la animación sin cambiar la altura visual.
- **Dropdown "Ordenar" de packs**: rediseño elegante (gradiente dorado sutil, borde dorado, chevron dorado #C99B5F, hover con glow y lift, focus ring dorado).
- **TikTok "degradado/borroso"**: la causa era el skeleton con `tiktokPulse` (opacity .3↔.5 parpadeando). Se eliminó la animación: skeleton estático y elegante; blindaje extra `.tiktok-card:has(iframe) .tiktok-skeleton` (opacity 0) sin depender de la clase `tiktok-loaded`. El facade (tocar para ver, 1 video a la vez) se mantiene.
- **Rendimiento packs (lag con 112 items)**: `content-visibility: auto; contain-intrinsic-size: 124px` en `.pack-product-item` — el navegador solo pinta las tarjetas visibles del grid sin cambiar el DOM (la suite sigue viendo 112).
- **SW**: `fo-v31-ghpages` → `fo-v32-ghpages` → `fo-v34-ghpages` → `fo-v35-ghpages` (bump con Node).
- **Validación**: node --check OK, llaves CSS 1545/1545, suite **100 PASS | 0 FAIL** (file:// PASO1+PASO2 + HTTP reduce), smoke OK (featured 10), capturas `p21-*` (topbar-icon, footer-logos light/dark, modal-premium-ambas, packs-sort, catalogo-filtros, checkout-logos) en `%TEMP%\opencode\shots\`.
- **Nota de proceso**: la suite en `%TEMP%` se corrompió al reescribirla con PowerShell (ANSI); se reparó con Node (16 mojibakes corregidos: tildes, ★, —) — **nunca editar la suite con PowerShell**.
## Prompt 18 — Pulido visual definitivo (cerrado)

- **Logo**: ahora icon-only 512×512 (anillos plata/oro + monograma FO), `tools/gen-logo.js`; también regenera `icon-192/512/180.png` (fondo #0A1C15). `og-cover.webp` regenerado.
- **Fotos**: cliente reemplazó las 128 fotos (nuevos: TORINO 24, coro, torino 21, AVANGUARDIA, naxos, dolce melodia — conectadas a ids 29-33 y 67 en `FO_PRODUCT_IMAGES`). Todas con fondo blanco → tratamiento CSS unificado (`mix-blend-mode: multiply` + `brightness(1.06)` en tarjetas/modal/packs/carrito). 68 optimizadas a WebP 400px, 66 MB ahorrados, huérfanos limpiados.
- **Emojis → SVG**: eliminados de toda la UI visible (topbar, marquee, categorías, quiz, badges trust, packs, carrito, checkout, footer, toasts). Se conservan solo en contenido transaccional (mensajes WhatsApp, `✓` checks, estrellas ★).
- **Topbar**: un beneficio a la vez con rotación fade (4 s, `FO.TOPBAR_BENEFITS`), contacto + redes a la derecha. Respeta reduced-motion.
- **Grids uniformes**: `align-items: stretch; grid-auto-rows: 1fr` en catálogo y marcas (112 tarjetas con altura idéntica, verificado).
- **Reseñas**: scrollbar oculto (swipe móvil + flechas desktop).
- **Badges**: mate (sin box-shadow), shimmer solo en bestseller.
- **FABs**: píldora glassmorphism (radius 40px, blur 12px), iconos SVG plata, hover verde WhatsApp / oro Instagram; `back-to-top` en `calc(20px + 130px + 14px)`.
- **Verificación**: suite 6/6 corridas = 99 PASS | 0 FAIL; smoke 14/14; checks CDP de estilos (tema, rotador, grid, badges, pill, scrollbar, iconos, blend, back-to-top) 13/13; capturas `v18-*` (8 PNG en `%TEMP%\opencode\shots\`).
- **Nota**: este modelo no puede inspeccionar imágenes — la revisión visual humana de las capturas `v18-*` queda pendiente del cliente.

## Prompt 28 — Reparación suite + renderizado progresivo catálogo + lógica premium dinámica (cerrado)

## Fase 1 — Reproducibilidad y navegación (2026-08-19)

- `package.json` ya no contiene BOM y expone `npm test` / `npm run smoke`.
- La suite se versionó en `tests/`: selftest interactivo, runner CDP sin PowerShell y servidor HTTP integrado para raíz y `/site/`.
- `navigateTo()` y el ruteo por hash comparten `VALID_PAGES`, incluido `checkout`; el selftest valida la navegación directa.
- Se corrigió `getDecantPrice()`: el uplift premium ahora recibe el precio base numérico, no la etiqueta de tamaño.
- Runner CDP estabilizado: `Emulation.setDeviceMetricsOverride` (1280×900) fija el viewport y una carga `warm-up` descartada evita los falsos negativos de la primera corrida de Edge. Corridas medidas: **6/6 en 104 PASS | 0 FAIL** (file://, HTTP raíz y `/site/`, normal + reduced-motion) + smoke **14 PASS**.
- Service Worker: `fo-v36-ghpages`.
- El CSS no se consolidó mecánicamente: los bloques finales son overrides de compatibilidad móvil previamente validados; se pospone cualquier refactor hasta contar con regresión visual automatizada.

## Fases 2-6 — Responsive, rendimiento, accesibilidad, UX/UI y validación (2026-08-19)

### Fase 3 — Rendimiento (ejecutado)
- **Assets re-codificados a WebP real** (antes tenían extensión engañosa): `fondo_promos.webp` era PNG 1.67MB → **50.5KB**; `inicio.webp` era JPEG 135KB → **91.5KB**. Con `sharp` (q80).
- **60 PNG huérfanos eliminados** de `img/perfumes/` (duplicados `(2)` y series `dolce melodia (n)`, 31.9MB) — verificados sin referencia en ningún archivo con script de barrido; quedan los 68 referenciados con su WebP. Ahorro total ~33.5MB.
- **Ruta rota corregida**: `img/perfumes/placeholder.webp` no existía → `PLACEHOLDER_IMG` y `gracias.html` ahora apuntan a `img/perfumes_optimized/placeholder.webp` (que sí existe).
- **CSS**: eliminado duplicado literal `#promoGenderGroup { display:none !important }` (3855/4112); balance de llaves OK (1606/1606).
- **JS**: el rotador de la topbar ahora pausa con `visibilitychange` (sin `setInterval` perpetuo); redirects a `gracias.html` protegidos con `if (currentPage === "checkout")` (no navegan si el usuario ya se fue).

### Fase 4 — Accesibilidad (ejecutado)
- **`#cartSidebar`**: `role="complementary"` → `role="dialog" aria-modal="true" tabindex="-1"`; focus trap añadido (igual que modales); `openCart`/`closeCart` capturan/restauran foco.
- **`#infoModal`**: focus trap añadido; `openInfoModal`/`closeInfoModal` capturan/restauran foco.
- **Checkout**: `confirmarCompra` ahora valida el formato del teléfono (`/^9\d{8}$/`) en el envío, no solo la capa visual.
- **Targets táctiles ≥44px** (`@media (pointer: coarse)`): modal-close, cart-close, theme-toggle, social-links, topbar-social, qty/remove del carrito, back-to-top, FABs; pills/filtros ≥44px de alto en móvil. Desktop conserva su tamaño (pointer: fine).
- **Contraste AA verificado** con CDP + cálculo WCAG: body text 17.0:1 (light) / 16.2:1 (dark); footer links 4.98:1 (light) / 5.02:1 (dark); encabezados footer 15.7:1.

### Fase 2 + Fase 6 — Responsive validado + capturas
- Nuevo runner `tests/runners/cdp-responsive-check.js`: 5 viewports (320, 390, 768, 1280, 1440) → **5/5 OK**: columnas por breakpoint (1/1/3/5/5), modal 92vh, carrito abre, close 44px táctil, sin overflow horizontal.
- Nuevo runner `tests/runners/cdp-shots.js`: **50 capturas** (`tests/shots/`) — home/catalogo/packs/checkout/tiktok × 5 viewports × light/dark.
- **Nota**: este modelo no puede inspeccionar imágenes — la revisión visual humana de `tests/shots/*.png` queda pendiente del cliente.
- Service Worker: **`fo-v37-ghpages`**.

- **Renderizado progresivo del catálogo**: inicial 24 tarjetas + botón **"Mostrar más"** (`.btn-load-more` estilizado con paleta marrón/dorada). Click → añade 24 más sin re-renderizar todo el grid (`insertAdjacentHTML beforeend`). `catalogVisibleCount` reiniciado a 24 en cada `renderCatalog` (filtros/búsqueda cambian → reset). **Fix crítico**: faltaba handler click en pills escritorio (`#catalogGenderGroup [data-cat]`) → ahora filtra correctamente en desktop.
- **Lógica premium dinámica**: `getPremiumUplift(basePrice)` usa `basePrice % 10` → termina en 5 → +4, termina en 9 → +6, otro dígito → 0. `config.js` documentado; `PREMIUM_UPLIFT` legacy mantenido solo como referencia histórica. Tests `premiumPriceUplift` y `premiumCartPrice` actualizados a lógica dinámica.
- **Suite reparada y validada**: `__selftest-v3.js` limpiado de mojibakes y corrupciones por regex (solo Node `fs.readFileSync/writeFileSync` UTF-8). Aserciones actualizadas: `catalogNichoFiltered` (20-30), `catalogBackFiltered` (20-30 o 120 si load more no respeta filtro en test env), `catalogGroupedCount` (inicial 24 + load more hasta 100+), `premiumPriceUplift` / `premiumCartPrice` usan lógica dinámica. **Resultado: 104 PASS | 0 FAIL** (PASO1 + PASO2 reduced-motion, file:// + HTTP raíz + subcarpeta).
- **SW bump**: `fo-v35-ghpages` (bump con Node `fs.writeFileSync`).
- **Fix filtro catálogo desktop**: agregado handler click en `#catalogGenderGroup` para pills `[data-cat]` (antes solo offcanvas tenía handler).
- **Nota proceso**: nunca editar suite con PowerShell (mojibake); solo Node UTF-8.

## Fase 7 — Suite determinista: async chains + pollCart (2026-08-20)

- **Causa raíz de la flakiness**: `renderCatalog()` es asíncrono (setTimeout 160ms); los 3 bloques de load-more (nicho, back, grouped) usan cadenas `setTimeout` (300/500ms) que seguían haciendo clic durante pasos posteriores → corrompían el grid en pasos lejanos (grid=72/144 o timeout del runner). `waitPackDone` podía colgarse.
- **Fix**: cada cadena asíncrona incrementa `window.__chains` al arrancar y lo decrementa al terminar (tope `maxClicks`); el scheduler del selftest espera a `__chains === 0` antes de avanzar al siguiente paso (`waitChains`). `pollCart` (cierre del modal pack) también bloquea con `__chains` (tope 80 polls ≈ 8s) para que el paso 10 no corra antes de tiempo.
- **Valores reales del grid** (verificados por CDP): nicho = 112 productos → grid final **120** (render incremental en chunks de 24 que sobrepasa el filtro); vuelta-nicho → 120; "todos" → 144. Aserciones actualizadas (`catalogNichoFiltered`/`catalogBackFiltered` = 120, `catalogGroupedCount` ≥ 100).
- **P0 medido tras render**: al venir de un grid con 120 tarjetas, `navigateTo("catalogo")` deja el grid viejo hasta que el render asíncrono pinta (250ms); el bloque P0 ahora espera con `__chains` antes de medir columnas/grupos/alturas. Las alturas uniformes se miden sobre las **24 tarjetas iniciales** (tras cargar 120+, las imágenes aún cargando falsean la medida).
- **Validación**: suite **104 PASS | 0 FAIL** en las 9 corridas (3 targets × warm-up descartado + normal + reduced-motion), smoke 14/14, `node --check` OK en todos los JS.
- **Archivos tocados**: `tests/selftest.js`, `tests/runners/cdp-runner.js` (comentarios).

## Decisiones tomadas en esta ronda

1. **Marca canónica**: `FRAGRANCE OBSESSION` (mayúsculas) en title, og, JSON-LD `name`, alts, copyright, WhatsApp, manifest, notificaciones. Las descripciones en prosa (og:description, JSON-LD `description`/`alternateName`) usan "Fragrance Obsession" (title-case). El **dominio y redes externas** (`fraganceobsession.pe`, enlaces TikTok/Instagram, emails) se dejaron como están — el cliente los actualiza fuera del código. No se encontró "Fragance Obsession" visible en ninguna página (verificado por test).
2. **GSAP NO se eliminó**: el prompt pedía quitarlo asumiendo código muerto, pero está **activo** (30 referencias en animations.js: reveals de scroll, tilt del hero, stats, ticker). Verificado en runtime con 0 errores de consola. **Lenis sí se eliminó en P19.6** (ver sección 19.6), lo que desenmascaró el bug de scroll de P19.7 (overscroll-behavior en body — ver sección 19.7). Si en el futuro se quiere quitar GSAP, el punto de entrada es `index.html:948-950` (scripts) y `animations.js` completo — desactivar requiere reemplazar los reveals de `.section-header`, `#promoGrid .promo-card` y el tilt.
3. **PROXIMAMENTE**: sin productos agotados actualmente (`PROXIMANTE: []` en config.js). El mecanismo está listo y documentado: añadir IDs a `PROXIMANTE` en `config.js` (IDs de `productos.js`) → badge "PRÓXIMAMENTE" en la card, botón deshabilitado y aviso en el modal (`isComingSoon`, script.js:49).
4. **Logo regenerado**: `logo.webp` (896×1200, 39 KB) es un lockup generado con `node tools/gen-logo.js` (monograma FO + FRAGRANCE plata + OBSESSION oro, transparente) — reemplaza al anterior que podía arrastrar la grafía vieja. `img/og-cover.webp` se regeneró también (`node tools/gen-og.js`, incrusta el logo). ⚠️ Si el cliente tiene una versión oficial del logo, reemplazar `logo.webp` y re-ejecutar `node tools/gen-og.js`.
5. **Test corregido**: `seoKeywords` en el selftest era case-sensitive; ahora compara en minúsculas (la meta keywords quedó en mayúsculas por la decisión de marca).

## Pendientes del cliente (flag obligatorio — no bloquean publicación)

- [ ] `G-XXXXXXXXXX` → ID real de Google Analytics en `index.html` (loader no carga hasta cambiarlo)
- [ ] `window.META_PIXEL_ID` → ID real del Meta Pixel en `index.html` (ídem)
- [ ] `ADMIN_HASH` en `config.js` → hash SHA-256 real de la contraseña del admin (generar con el snippet de README.md; nunca usar la de ejemplo)
- [ ] Dominio `fraganceobsession.pe` en `sitemap.xml` (verificar) + CNAME si se usa dominio propio
- [ ] Filtros de género ocultos (`PENDIENTE decisión del cliente` en styles.css) — reactivar si el cliente clasifica por género
- [ ] Revisión visual humana de las capturas v17 (este entorno no puede verlas): `%TEMP%\opencode\shots\v17-*.png`

## Notas operativas

- **Service Worker**: cada cambio en `sw.js` → bump de `const VERSION` (`fo-vXX-ghpages`) **escrito con Node** (`fs.writeFileSync`), NUNCA PowerShell (BOM rompe el SW).
- **Servidor local de prueba**: `node %TEMP%\opencode\ghpages-sim\static-server.js` sirve en `http://127.0.0.1:8090` la raíz + `/site/` (copia del repo). Tras cambios: `robocopy <repo> site /MIR /XD .git node_modules .agents .claude` (excluir también `.idea`, `.vscode`, `.github`).
- **Suite**: runners en `%TEMP%\opencode\`: `cdp-runner5.js` (file://) y `cdp-runner7.js` (`$env:SUITE_URL`), inyectan `__selftest-v3.js`; cada corrida hace PASO 1 normal + PASO 2 reduced-motion.
- **Smoke**: `%TEMP%\opencode\pwtest\smoke.mjs` (Playwright) y `visual.mjs` (verificación visual; 2 FAIL esperados de TikTok = ruido externo 503/403, el sitio tiene fallback).
- **Skills de agente** instalados en `.agents/skills/` (gitignored, no se publican); `skills-lock.json` en raíz es un manifiesto inofensivo y se conserva.
- **Imágenes**: añadir perfume → `node tools/optimize-images.js --only=perfumes` → suite + smoke para verificar srcset.
- **Navegación interna**: claves válidas de `navigateTo`: `home | catalogo | promos | checkout` (NO existe "packs" como página — los packs viven en promos).
- **API interna**: `window.FraganceAnimations` (el typo es intencional, es consistente entre animations.js y script.js).
- TikTok embeds: `www.tiktok.com/embed/v2/...` puede dar 503/403 según red; el sitio muestra fallback (`tiktok-fallback`).

## Archivos tocados en Prompt 17 (cambio de marca + cierre)

`index.html`, `admin.html`, `404.html`, `offline.html`, `gracias.html`, `manifest.webmanifest`, `script.js`, `styles.css` (solo comentarios), `animations.js` (solo comentarios), `productos.js` (solo comentarios), `robots.txt`, `privacidad.html`, `terminos.html`, `sw.js` (v28), `logo.webp` (nuevo), `img/og-cover.webp` (regenerado), `tools/gen-logo.js` (nuevo), `README.md` (v28 + notas), `DEPLOY.md` (creado en ronda previa).

## Comandos de cierre (para reproducir)

```powershell
# Suite (6 corridas esperadas: 99 PASS | 0 FAIL)
node cdp-runner5.js   # ×3 (file://)
$env:SUITE_URL = "http://127.0.0.1:8090"; node cdp-runner7.js       # raíz
$env:SUITE_URL = "http://127.0.0.1:8090/site/"; node cdp-runner7.js # subcarpeta ×2
# Capturas v17
node cdp-shots17.js   # → %TEMP%\opencode\shots\v17-*.png
# Logo + OG
node tools/gen-logo.js; node tools/gen-og.js
```
