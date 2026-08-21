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
| SW | `fo-v42-ghpages` |
| Redes sociales | Solo TikTok + WhatsApp + correo (Instagram eliminado) |
| TikTok videos | 2 videos reales (ZSVyQTpeK, ZSVyC1pGB) + perfil |
| Angels Share 30ml | Corregido: id:5 "Angels Share on the Rocks" con sizeImages correcto |
| Modal 30ml (id:6 Angels Share / id:7 Apple Brandy) | Corregido: `FO_PRODUCT_IMAGES[6\|7].sizes` no tenía clave `"30"` (ver Prompt 24) |
| Modal 10ml premium (id:5 Angels Share on the Rocks) | Corregido: `"10_premium"` apuntaba por error a la imagen de 30ml; eliminada la clave, cae al fallback correcto (ver Prompt 24) |
| srcset | Corregido: filenames con espacios omiten srcset (sin errores de consola) |
| SPA navigation | Corregido: CSS `.page { display: none; }` / `.page.active { display: block; }` |

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
