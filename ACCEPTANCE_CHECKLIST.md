# ACCEPTANCE_CHECKLIST.md — Pruebas de aceptación manual

Completa estas casillas en el orden indicado antes de dar el sitio como **aprobado para producción**. Si alguna falla, anota el paso, el dispositivo y lo que viste.

## 0. Preparación

- [ ] **Limpiar caché y Service Worker** (Safari iOS): Ajustes → Safari → Avanzado → Datos de sitios web → buscar el dominio → Eliminar. Repetir en Chrome desktop: DevTools → Application → Storage → Clear site data.
- [ ] Confirmar que la URL abierta es la correcta (GitHub Pages o dominio final).
- [ ] Tener a mano las capturas de referencia en `tests/shots/` para comparar.

## 1. iPhone 13 (Safari)

### Catálogo
- [ ] Entra a **Catálogo**: deben cargar **24 tarjetas** y aparecer el botón **"Mostrar más"** al final.
- [ ] Toca **"Mostrar más"** varias veces: añade más productos sin lag ni recorte del grid (1 columna en 390px).
- [ ] Los filtros (Nicho / Diseñador / etc.) y la búsqueda funcionan y resetean la carga progresiva.

### Navegación
- [ ] Alterna entre **Inicio, Catálogo y Packs** varias veces: no debe laggear ni volver al inicio.
- [ ] La **topbar** rota los beneficios y las redes (IG/WhatsApp) abren al destino correcto.

### Modal de producto
- [ ] Toca un perfume: el modal abre centrado, sin desbordes, con scroll interno.
- [ ] Cambia entre tamaños **normales y premium**: imagen y precio se actualizan (ej. 5ml S/25 → S/29; 10ml S/39 → S/45).
- [ ] **Frasco Completo** abre WhatsApp de cotización (no se agrega al carrito).

### Carrito y checkout
- [ ] Añade 2-5 decants: se aplica **5% OFF**; desde 6, **10% OFF**; 3+ de la misma marca, **10%** (según `ACUMULAR_DESCUENTOS`).
- [ ] El desglose del carrito (subtotal, descuentos, envío) es correcto y el contador del header coincide.
- [ ] En checkout, el formulario valida (nombre, apellido, **teléfono 9 dígitos que empieza en 9**, dirección, distrito).
- [ ] Confirmar abre **WhatsApp** con el mensaje resumen y luego navega a la página de gracias.

### TikTok
- [ ] La sección TikTok muestra **4 tarjetas estáticas** con miniatura y enlace (se abre en pestaña nueva, **sin iframes** ni errores).

### Tema claro/oscuro
- [ ] Alterna el tema: contraste legible en ambos; las imágenes de productos se ven nítidas (no opacas) en oscuro.

## 2. Desktop (Chrome / Firefox / Edge)

- [ ] Navegación fluida entre todas las secciones.
- [ ] Catálogo en **5 columnas** en pantalla grande; "Mostrar más" funciona igual.
- [ ] Packs: el dropdown **"Ordenar"** (ordenar por precio/marca) funciona.
- [ ] Contraste AA en ambos temas (texto ≥ 4.5:1, texto grande ≥ 3:1).
- [ ] Consola sin errores (DevTools → Console) y red sin requests fallidos (Network, status rojo).
- [ ] Modal de producto, carrito lateral y modales informativos (FAQ, Envíos…) se cierran con `Esc` y no dejan el foco atrapado.
- [ ] `Esc`/clic fuera cierran el modal y el carrito correctamente.

## 3. Tablet (opcional)

- [ ] Catálogo en **3 columnas** (768px).
- [ ] Modales con **scroll interno** sin que la página de fondo se desplace.

## 4. PWA y soporte

- [ ] Con red cortada, la app muestra `offline.html` (contenido en caché del SW).
- [ ] `/pagina-inexistente.html` muestra el `404.html` custom.
- [ ] El manifest se instala como app (opcional, iOS: Compartir → Añadir a pantalla de inicio).

## 5. Resultado

- [ ] **Sin fallos**: aprobar y publicar.
- [ ] Con fallos: copia esta checklist con las notas y pásala al equipo de desarrollo.

---

### Referencia rápida de comandos de verificación automatizada

```bash
npm test                                  # 6 corridas → 104 PASS | 0 FAIL cada una
npm run smoke                             # SMOKE: 14 PASS | 0 FAIL
node tests/runners/cdp-responsive-check.js # RESPONSIVE: 5/5 OK
node tests/runners/cdp-contrast-check.js   # ratios AA
node tests/runners/cdp-shots.js            # regenera tests/shots/ (50 PNG)
```