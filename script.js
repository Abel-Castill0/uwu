(function () {
  "use strict";
  /* ══════════════════════════════════════════════════════════════
     DATA — PRODUCTOS
  ══════════════════════════════════════════════════════════════ */

  /* ══════════════════════════════════════════════════════════════
     DATA — productos y packs viven en productos.js
     (edita ese archivo para agregar/quitar perfumes, no este)
  ══════════════════════════════════════════════════════════════ */
  const products = window.FO_PRODUCTS || window.PACO_PRODUCTS || [];
  // Única fuente de verdad para rutas de la SPA. Las vistas auxiliares se
  // conservan porque los modales informativos las usan internamente.
  const VALID_PAGES = new Set([
    "home", "catalogo", "promos", "checkout", "cart", "modal", "packmodal",
    "faq", "envios", "devoluciones", "terminos", "nosotros",
  ]);
  /* ══════════════════════════════════════════════════════════════
     CONSTANTES
  ══════════════════════════════════════════════════════════════ */
  const PLACEHOLDER_IMG = "img/perfumes_optimized/placeholder.webp";
  /* Imagen por defecto elegante: monograma dorado sobre marrón profundo.
     Se genera en SVG (data URI) cuando el perfume no tiene foto propia. */
  function cardImg(p) {
    const name = (p && (p.name || p.brand)) || "Fragrance Obsession";
    const label = name.replace(/[^\w\s-]/g, "");
    const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "FO";
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">' +
      '<defs>' +
      '<linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">' +
      '<stop offset="0" stop-color="#1C130C"/><stop offset="0.5" stop-color="#140E08"/><stop offset="1" stop-color="#0D0A06"/>' +
      '</linearGradient>' +
      '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#E5C896"/><stop offset="0.5" stop-color="#C99B5F"/><stop offset="1" stop-color="#A67C3D"/>' +
      '</linearGradient>' +
      '<radialGradient id="glow" cx="0.5" cy="0.42" r="0.55">' +
      '<stop offset="0" stop-color="#C99B5F" stop-opacity="0.08"/><stop offset="1" stop-color="#C99B5F" stop-opacity="0"/>' +
      '</radialGradient>' +
      '</defs>' +
      '<rect width="600" height="600" fill="url(#bg)"/>' +
      '<rect width="600" height="600" fill="url(#glow)"/>' +
      '<rect x="32" y="32" width="536" height="536" rx="8" fill="none" stroke="url(#gold)" stroke-opacity="0.2" stroke-width="1.5"/>' +
      '<rect x="44" y="44" width="512" height="512" rx="4" fill="none" stroke="url(#gold)" stroke-opacity="0.08" stroke-width="0.5"/>' +
      '<text x="300" y="278" text-anchor="middle" dominant-baseline="central" font-family="Georgia, \'Times New Roman\', serif" font-size="160" font-weight="300" fill="url(#gold)" fill-opacity="0.85">' + initials + '</text>' +
      '<line x1="220" y1="340" x2="380" y2="340" stroke="url(#gold)" stroke-opacity="0.25" stroke-width="1"/>' +
      '<text x="300" y="490" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-size="18" letter-spacing="8" fill="#C99B5F" fill-opacity="0.4">FRAGRANCE OBSESSION</text>' +
      '</svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  /* Imagen específica por tamaño de decant (vial "5ml" / "10 ml").
     Si no hay variante para ese tamaño, cae a la imagen base del producto. */
  function sizeImage(p, size) {
    if (!p || !p.sizeImages) return p && p.cardImage || "";
    return p.sizeImages[size] || p.sizeImages[size + "ml"] || p.sizeImages[size + " ml"] || p.cardImage || "";
  }
  /* ── Decants premium ──────────────────────────────────────────
     Las variantes "5ml_premium" / "10ml_premium" se generan en el modal
     (getDisplayDecantSizes) con precio = normal + PREMIUM_UPLIFT. */
  function isPremiumSize(size) {
    return typeof size === "string" && size.endsWith("_premium");
  }
  /* ── "Próximamente" ─────────────────────────────────────────
     Productos aún sin stock: sus ids van en config.js
     (FO_CONFIG.PROXIMAMENTE). Se muestran con badge, botón
     deshabilitado en la card y aviso en el modal. */
  function isComingSoon(id) {
    const list = FO.PROXIMAMENTE;
    return Array.isArray(list) && list.some((x) => String(x) === String(id));
  }
  function baseSizeOf(size) {
    return isPremiumSize(size) ? size.replace("_premium", "") : size;
  }
  /* "5" → "5ml" · "5ml" → "5ml" · "5_premium" → "5ml premium" */
  function sizeLabel(size) {
    const base = isPremiumSize(size) ? baseSizeOf(size) : size;
    const baseLabel = /^\d+$/.test(base) ? base + "ml" : base;
    return isPremiumSize(size) ? baseLabel + " decant premium" : baseLabel;
  }
  function getPremiumUplift(basePrice) {
    if (typeof basePrice !== "number") return 0;
    const lastDigit = basePrice % 10;
    if (lastDigit === 5) return 4;
    if (lastDigit === 9) return 6;
    return 0;
  }
  function getDisplayDecantSizes(product) {
    const sizes = Object.assign({}, product.decantSizes || {});
    if (FO.PREMIUM_DECANTS === false) return sizes;
    // Solo 5ml y 10ml pueden tener variante premium; el resto de tamaños
    // (1, 2, 3, 20, 30...) se mantienen solo en su versión base. getPremiumUplift
    // sigue usando basePrice % 10 (termina en 5 → +4, en 9 → +6, otro → 0).
    if (sizes["5"] && !sizes["5_premium"]) {
      sizes["5_premium"] = sizes["5"] + getPremiumUplift(sizes["5"]);
    }
    if (sizes["10"] && !sizes["10_premium"]) {
      sizes["10_premium"] = sizes["10"] + getPremiumUplift(sizes["10"]);
    }
    return sizes;
  }
  /* ⚠️ Valores del negocio centralizados en config.js (window.FO_CONFIG).
     Edita SOLO config.js. Los fallbacks evitan romper si falta el archivo. */
  const FO = window.FO_CONFIG || {};
  const WHATSAPP_NUMBER = FO.WHATSAPP_NUMBER || "51994467586";
  const MERCADOPAGO_LINK = ""; /* ej. "https://mpago.la/XXXXX" — link de pago cuando exista */
  const SITE_URL = FO.SITE_URL || "https://fraganceobsession.pe/";
  // Modo desarrollo (solo localhost): habilita logs de diagnóstico.
  const IS_DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  /* ── Google Analytics: envío seguro de eventos (no falla sin ID) ── */
  function track(name, params) {
    try {
      if (typeof window.gtag === "function") window.gtag("event", name, params || {});
    } catch (e) { /* noop */ }
  }

  /* ── SEO dinámico por producto (meta tags al compartir ?producto=ID) ── */
  const META = {};
  function metaEl(sel) { return document.querySelector(sel); }
  function snapshotMeta() {
    META.title = document.title;
    META.desc = metaEl('meta[name="description"]')?.content || "";
    META.ogTitle = metaEl('meta[property="og:title"]')?.content || "";
    META.ogDesc = metaEl('meta[property="og:description"]')?.content || "";
    META.ogImage = metaEl('meta[property="og:image"]')?.content || "";
    META.ogUrl = metaEl('meta[property="og:url"]')?.content || "";
    META.canonical = metaEl('link[rel="canonical"]')?.href || SITE_URL;
  }
  function setMeta(map) {
    if (map.title != null) document.title = map.title;
    const set = (sel, attr, val) => { const el = metaEl(sel); if (el && val != null) el.setAttribute(attr, val); };
    set('meta[name="description"]', "content", map.desc);
    set('meta[property="og:title"]', "content", map.ogTitle);
    set('meta[property="og:description"]', "content", map.ogDesc);
    set('meta[property="og:image"]', "content", map.ogImage);
    set('meta[name="twitter:image"]', "content", map.ogImage);
    set('meta[property="og:url"]', "content", map.ogUrl);
    set('link[rel="canonical"]', "href", map.canonical);
  }
  function setProductMeta(product) {
    const sizes = Object.values(product.decantSizes || {});
    const min = sizes.length ? Math.min(...sizes) : (Object.values(product.fullSizes || {})[0] || null);
    const desde = min ? `Desde ${formatPrice(min)}. ` : "";
    const img = product.cardImage ? SITE_URL + product.cardImage : META.ogImage;
    const url = SITE_URL + "?producto=" + product.id;
    setMeta({
      title: `${product.name} · FRAGRANCE OBSESSION`,
      desc: `Compra ${product.name} de ${product.brand} en decant. ${desde}Envíos a todo el Perú.`,
      ogTitle: `${product.name} · ${product.brand}`,
      ogDesc: `${product.name} de ${product.brand} en decant. ${desde}FRAGRANCE OBSESSION.`,
      ogImage: img,
      ogUrl: url,
      canonical: url,
    });
  }
  function restoreMeta() {
    setMeta({
      title: META.title, desc: META.desc, ogTitle: META.ogTitle, ogDesc: META.ogDesc,
      ogImage: META.ogImage, ogUrl: META.ogUrl, canonical: META.canonical,
    });
  }

  /* Imágenes de producto: productos.js ya apunta directamente a
     img/perfumes_optimized/*.webp (generadas con `node tools/optimize-images.js`,
     1000px · q82). No hace falta srcset: una sola capa optimizada sirve
     tanto el grid como el modal sin peso extra. */

  /* ══════════════════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════════════════ */
  let cart = [];
  let activeFilters = { category: null, gender: null };
  let searchTerm = "";
  let quickFilter = "todos";
  // Los packs (type: "group") viven en el mismo array pero NO son perfumes:
  // no deben aparecer en catálogo, búsqueda ni filtros rápidos.
  const isProduct = (p) => !p.type || p.type === "product";
  const QUICK_FILTERS = {
    todos: (p) => !p.tester && isProduct(p),
    hombre: (p) => !p.tester && isProduct(p) && p.gender === "masculino",
    mujer: (p) => !p.tester && isProduct(p) && p.gender === "femenino",
    unisex: (p) => !p.tester && isProduct(p) && p.gender === "unisex",
    nicho: (p) => !p.tester && isProduct(p) && p.category === "nicho",
    arabe: (p) => !p.tester && isProduct(p) && p.category === "arabe",
    disenador: (p) => !p.tester && isProduct(p) && p.category === "disenador",
  };
  let currentModalProduct = null;
  let currentModalView = "full";
  let currentModalSize = null;
  let currentPage = "home";
  let catalogVisibleCount = 24;
  /* ── Pack Builder state ── */
  let comboSize = "3";
  let comboSelectedIds = [];
  let comboSearchQuery = "";
  const COMBO_MAX = 6;
  const COMBO_MIN = 3;
  /* currentSearchTerm eliminado — búsqueda removida */

  try {
    const saved = localStorage.getItem("fo_cart_v4") || localStorage.getItem("paco_cart_v4");
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    cart = [];
  }
  /* Carrito persistido + catálogo que cambia con el tiempo (ej. un producto
     pasa a "Próximamente", se retira del catálogo, cambia de precio, o el
     tamaño guardado ya no existe) pueden desincronizarse: un pedido con un
     ítem inválido no debe poder confirmarse por WhatsApp/Mercado Pago.
     Única fuente de verdad (sanitizeCartAvailability, definida más abajo,
     disponible aquí por hoisting): se usa tanto al cargar el carrito como
     justo antes de generar el pedido en confirmarCompra() — así un producto
     que cambia de estado SIN que el usuario recargue la página también
     queda bloqueado. Los packs (isPack) no se tocan: validan su propia
     elegibilidad al seleccionarse (getEligibleProducts). */
  let removedFromCartCount = 0;
  {
    const result = sanitizeCartAvailability(cart);
    if (result.removed > 0) {
      cart = result.items;
      removedFromCartCount = result.removed;
      try { localStorage.setItem("fo_cart_v4", JSON.stringify(cart)); } catch (e) { /* noop */ }
    }
  }

  /* ══════════════════════════════════════════════════════════════
     UTILITIES
  ══════════════════════════════════════════════════════════════ */
  const $ = (id) => document.getElementById(id);

  function saveCart() {
    try { localStorage.setItem("fo_cart_v4", JSON.stringify(cart)); } catch (e) { /* almacenamiento no disponible */ }
  }
  function getCartTotal() {
    return calcularDescuentos(cart).subtotalFinal;
  }
  /* Desglose visual del carrito/checkout: subtotal, descuentos, envío y vial. */
  function breakdownHTML(d) {
    var rows = [];
    rows.push(
      '<div class="bd-row"><span>Subtotal</span><span>' + formatPrice(d.subtotalOriginal) + "</span></div>",
    );
    if (d.detalleCantidad) {
      rows.push(
        '<div class="bd-row bd-disc"><span>' + esc(d.detalleCantidad.pct) + "% por " + esc(d.detalleCantidad.cant) + " decants</span><span>−" + formatPrice(d.detalleCantidad.monto) + "</span></div>",
      );
    }
    d.detalleMarcas.forEach(function (m) {
      rows.push(
        '<div class="bd-row bd-disc"><span>' + esc(m.pct) + "% en " + esc(m.marca) + " (" + esc(m.cant) + " ítems)</span><span>−" + formatPrice(m.monto) + "</span></div>",
      );
    });
    if (d.aplicaEnvioGratis) {
      rows.push('<div class="bd-row bd-good"><span>Envío</span><span>GRATIS</span></div>');
    }
    if (d.vialGratisAgregado) {
      rows.push('<div class="bd-row bd-good"><span><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7.5" width="17" height="13" rx="2"/><path d="M12 7.5V20.5M3.5 12.5h17M12 7.5c-2.8 0-4.6-1-4.6-2.7S9.2 2 12 2s4.6 1 4.6 2.8-1.8 2.7-4.6 2.7z"/></svg> Vial de regalo</span><span>S/ 0.00</span></div>');
    }
    return rows.join("");
  }
  function renderBreakdown(containerId) {
    var el = $(containerId);
    if (!el) return;
    el.innerHTML = cart.length ? breakdownHTML(calcularDescuentos(cart)) : "";
  }
  function getCartCount() {
    return cart.reduce((sum, i) => sum + i.qty, 0);
  }
  function getProductById(id) {
    return products.find((p) => p.id === id);
  }
  /* ── Contrato de negocio ──────────────────────────────────────────
     El carrito es una representación TEMPORAL del catálogo. El catálogo
     actual (products + FO_CONFIG.PROXIMAMENTE) siempre tiene autoridad
     sobre disponibilidad, presentación y precio — nunca un valor viejo
     persistido en localStorage. sanitizeCartAvailability() es la única
     fuente de verdad que aplica ese contrato; se llama al cargar el
     carrito y otra vez justo antes de confirmarCompra() (un producto
     puede cambiar de estado mientras la pestaña sigue abierta, sin
     recarga de por medio). Coordina helpers pequeños en vez de hacerlo
     todo ella misma. Los packs (isPack) no se tocan: validan su propia
     elegibilidad en getEligibleProducts(). */
  function isProductStillAvailable(id) {
    const prod = getProductById(id);
    return prod && !isComingSoon(id) ? prod : null;
  }
  // Precio vigente para (producto, tipo, talla) según el catálogo actual,
  // o undefined si esa talla ya no existe (ítem inválido).
  function resolveCurrentPrice(prod, type, size) {
    const sizes = type === "full" ? prod.fullSizes : prod.decantSizes;
    const basePrice = sizes ? sizes[baseSizeOf(size)] : undefined;
    if (typeof basePrice !== "number") return undefined;
    return isPremiumSize(size) ? basePrice + getPremiumUplift(basePrice) : basePrice;
  }
  // Cantidad válida = entero finito ≥ 1 (localStorage manipulado a mano
  // puede traer 0, negativos, NaN, Infinity o strings). No inventa un
  // tope máximo: no hay política comercial existente de límite por ítem.
  function normalizeQty(qty) {
    const n = Math.floor(Number(qty));
    return Number.isFinite(n) && n >= 1 ? n : null;
  }
  function sanitizeCartAvailability(items) {
    const cleaned = [];
    let removed = 0;
    (Array.isArray(items) ? items : []).forEach((it) => {
      if (!it || typeof it !== "object") { removed++; return; }
      if (it.isPack) { cleaned.push(it); return; }
      const prod = isProductStillAvailable(it.productId);
      if (!prod) { removed++; return; }
      const price = resolveCurrentPrice(prod, it.type, it.size);
      if (price === undefined) { removed++; return; }
      const qty = normalizeQty(it.qty);
      if (qty === null) { removed++; return; }
      it.price = price;
      it.qty = qty;
      cleaned.push(it);
    });
    return { items: cleaned, removed };
  }
  function formatPrice(p) {
    return "S/ " + p.toFixed(2);
  }
  /* Fake discount: returns { fakeOriginal, pct, html } or null if disabled.
     The "real" price stays the same; we just show a higher crossed-out price. */
  function getFakeDiscount(realPrice) {
    const cfg = FO.FAKE_DESCUENTO;
    if (!cfg || !cfg.activo || typeof realPrice !== "number" || realPrice <= 0) return null;
    const pct = cfg.porcentaje || 22;
    const fakeOriginal = Math.round(realPrice / (1 - pct / 100));
    return {
      fakeOriginal,
      pct,
      html: `<span class="price-fake-original">${esc(formatPrice(fakeOriginal))}</span><span class="price-fake-pct">${pct}% OFF</span><span class="price-fake-real">${esc(formatPrice(realPrice))}</span>`,
    };
  }
  // Escapa texto que se inyecta en HTML para prevenir roturas de markup
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  // Detecta el tipo de toast a partir del emoji inicial del mensaje (retrocompatible).
  function detectToastType(msg) {
    if (/^[⚠️❌🚫]/u.test(msg) || msg.startsWith("⚠")) return "error";
    if (/^[🛒🛍️📲ℹ️]/u.test(msg) || msg.startsWith("🛒") || msg.startsWith("🛍")) return "info";
    return "success";
  }
  const TOAST_ICONS = { success: "✓", error: "✗", info: "ℹ" };
  function showToast(msg, type) {
    const t = $("toast");
    if (!t) return;
    const kind = type || detectToastType(String(msg));
    t.className = "toast toast-" + kind;
    t.innerHTML =
      `<span class="toast-icon" aria-hidden="true">${TOAST_ICONS[kind] || "✓"}</span>` +
      `<span class="toast-msg">${esc(msg)}</span>`;
    // reinicia la animación de entrada
    void t.offsetWidth;
    t.classList.add("show");
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove("show"), 2600);
  }
  function pulseCartCount() {
    const el = $("cartCount");
    if (!el) return;
    el.classList.remove("pulse");
    void el.offsetWidth;
    el.classList.add("pulse");
  }
  // Animación: una miniatura "vuela" desde el origen hasta el ícono del carrito.
  function flyToCart(imgSrc, originEl) {
    if (!imgSrc || !originEl) return;
    const cartBtn = $("btnCart");
    if (!cartBtn) return;
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const o = originEl.getBoundingClientRect();
    const c = cartBtn.getBoundingClientRect();
    const startX = o.left + o.width / 2;
    const startY = o.top + o.height / 2;
    const endX = c.left + c.width / 2;
    const endY = c.top + c.height / 2;
    const fly = document.createElement("img");
    fly.src = imgSrc;
    fly.className = "fly-to-cart";
    fly.alt = "";
    fly.setAttribute("aria-hidden", "true");
    fly.style.left = startX - 28 + "px";
    fly.style.top = startY - 28 + "px";
    fly.onerror = () => fly.remove();
    document.body.appendChild(fly);
    requestAnimationFrame(() => {
      fly.style.transform =
        `translate(${endX - startX}px, ${endY - startY}px) scale(.18)`;
      fly.style.opacity = "0.25";
    });
    setTimeout(() => fly.remove(), 650);
  }
  function getCategoryIcon() {
    return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.5h4M11 2.5v4.6c0 .9.4 1.7 1 2.3l.7.7c.9.9 1.4 2.1 1.4 3.3V19a2.5 2.5 0 0 1-2.5 2.5h-1.2A2.5 2.5 0 0 1 9.9 19v-5.6c0-1.2.5-2.4 1.4-3.3l.7-.7c.6-.6 1-1.4 1-2.3V2.5"/></svg>`;
  }

  /* ══════════════════════════════════════════════════════════════
     CART — CORE LOGIC
  ══════════════════════════════════════════════════════════════ */
  function addToCart(productId, type, size, qty = 1) {
    const product = getProductById(productId);
    if (!product) return;
    const sizes = type === "full" ? product.fullSizes : product.decantSizes;
    if (!sizes || Object.keys(sizes).length === 0) {
      showToast("⚠️ Este producto solo está disponible en presentación completa");
      return;
    }
    const baseSize = baseSizeOf(size);
    const basePrice = sizes[baseSize];
    if (typeof basePrice !== "number") return;
    const price = isPremiumSize(size) ? basePrice + getPremiumUplift(basePrice) : basePrice;
    const existing = cart.find(
      (item) =>
        item.productId === productId &&
        item.size === size &&
        item.type === type,
    );
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        productId,
        type,
        name: product.name,
        brand: product.brand,
        image: type === "full" ? product.fullImage : sizeImage(product, size),
        size,
        price,
        qty,
      });
    }
    saveCart();
    updateCartUI();
    showToast("✅ ¡Añadido al carrito!");
    pulseCartCount();
    track("add_to_cart", { currency: "PEN", value: price * qty, items: [{ item_id: productId, item_name: product.name, item_brand: product.brand, price: price, quantity: qty }] });
  }
  function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
  }
  function updateCartQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart();
    updateCartUI();
  }
  function updateCartUI() {
    const countEl = $("cartCount");
    if (countEl) countEl.textContent = getCartCount();
    const headerCount = $("cartHeaderCount");
    if (headerCount) {
      const c = getCartCount();
      headerCount.textContent = c;
      headerCount.style.display = c > 0 ? "inline-flex" : "none";
    }
    renderCartItems();
    updateCartFooter();
    renderUpsell();
    if (currentPage === "checkout") renderCheckoutPage();
  }

  /* ══════════════════════════════════════════════════════════════
     CART — RENDER
  ══════════════════════════════════════════════════════════════ */
  function renderCartItems() {
    const container = $("cartItems");
    if (!container) return;
    if (cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 8.5h13l1.2 12a1.8 1.8 0 0 1-1.8 2H6.1a1.8 1.8 0 0 1-1.8-2l1.2-12z"/><path d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5"/></svg></div>
          <p>Tu carrito está vacío.</p>
          <span>¡Explora nuestra colección y encuentra tu próxima fragancia!</span>
          <button type="button" class="btn-empty-action" data-action="keep-shopping">
            <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Seguir comprando
          </button>
        </div>`;
      return;
    }
    container.innerHTML = cart
      .map((item, i) => {
        const hasGift = item.isPack && item.gift;
        const isMultiPack =
          item.isPack &&
          item.includedProducts &&
          item.includedProducts.length > 0 &&
          !hasGift;
        let imageHtml = "";
        if (!isMultiPack) {
          imageHtml = `<img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" decoding="async" onerror="if(this.src!=='${PLACEHOLDER_IMG}'){this.src='${PLACEHOLDER_IMG}';}else{this.style.display='none';}" />`;
          if (hasGift) {
            imageHtml = `
              <div class="cart-gift-wrap">
                ${imageHtml}
                <img src="${esc(item.gift.image)}" alt="${esc(item.gift.name)}" loading="lazy" decoding="async"
                     class="cart-gift-thumb" onerror="this.style.display='none'" />
              </div>`;
          }
        }
        let nameHtml = `<div class="cart-item-name">${esc(item.name)}</div>`;
        const typeTxt = item.type === "full" ? "Caja Sellada" : item.type === "decant" ? "Decant" : "Pack";
        const metaSize = item.type === "decant" && isPremiumSize(item.size) ? sizeLabel(item.size) : typeTxt + " " + sizeLabel(item.size);
        let metaHtml = `<div class="cart-item-meta">${esc(item.brand)} · ${esc(metaSize)}</div>`;
        if (hasGift) {
          metaHtml += `<div class="cart-gift-note"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7.5" width="17" height="13" rx="2"/><path d="M12 7.5V20.5M3.5 12.5h17M12 7.5c-2.8 0-4.6-1-4.6-2.7S9.2 2 12 2s4.6 1 4.6 2.8-1.8 2.7-4.6 2.7z"/></svg> Incluye: ${esc(item.gift.name)} (${esc(item.gift.size)})</div>`;
        }
        let extraProductsHtml = "";
        if (isMultiPack) {
          extraProductsHtml = `
            <div class="cart-pack-strip">
              ${item.includedProducts
              .map(
                (p) => `
                <div class="cart-pack-item">
                  <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async"
                       class="cart-pack-thumb" onerror="this.src='${PLACEHOLDER_IMG}'" />
                  <div class="cart-pack-name">${esc(p.name)}</div>
                </div>`,
              )
              .join("")}
            </div>`;
        }
        return `
          <div class="cart-item">
            ${imageHtml}
            <div class="cart-item-info">
              ${nameHtml}
              ${metaHtml}
              ${extraProductsHtml}
              <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
            </div>
            <div class="cart-item-qty">
              <button data-action="qty" data-index="${i}" data-delta="-1" aria-label="Restar">−</button>
              <span>${item.qty}</span>
              <button data-action="qty" data-index="${i}" data-delta="1" aria-label="Sumar">+</button>
            </div>
            <button class="cart-item-remove" data-action="remove" data-index="${i}" title="Eliminar" aria-label="Eliminar"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 10.5v5.5M14 10.5v5.5"/></svg></button>
          </div>`;
      })
      .join("");
  }
  function updateCartFooter() {
    const footer = $("cartFooter");
    const total = $("cartTotal");
    if (!footer || !total) return;
    if (cart.length === 0) {
      footer.style.display = "none";
      renderBreakdown("cartBreakdown");
    } else {
      footer.style.display = "block";
      total.textContent = formatPrice(getCartTotal());
      renderBreakdown("cartBreakdown");
    }
    updateStickyCart();
  }

  /* Upselling: 3 muestras 2ml aleatorias que no estén en el carrito.
     Se re-renderiza en cada actualización para que las ya agregadas
     desaparezcan de las sugerencias. */
  function renderUpsell() {
    const strip = $("upsellStrip");
    const wrap = $("upsellItems");
    if (!strip || !wrap) return;
    if (cart.length === 0) {
      strip.style.display = "none";
      wrap.innerHTML = "";
      return;
    }
    const inCart = new Set(cart.filter((i) => i.type === "decant").map((i) => i.productId));
    const candidates = products.filter(
      (p) => !p.tester && p.decantSizes && p.decantSizes["2ml"] && !inCart.has(p.id),
    );
    if (candidates.length === 0) {
      strip.style.display = "none";
      wrap.innerHTML = "";
      return;
    }
    const picks = [];
    const pool = [...candidates];
    const want = Math.min(3, pool.length);
    for (let i = 0; i < want; i++) {
      picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    strip.style.display = "block";
    wrap.innerHTML = picks
      .map((p) => {
        const price = p.decantSizes["2ml"];
        return `
          <div class="upsell-item">
            <img src="${esc(p.cardImage || p.decantImage || cardImg(p))}" alt="${esc(p.name)}" loading="lazy" decoding="async" onerror="if(this.src!=='${PLACEHOLDER_IMG}'){this.src='${PLACEHOLDER_IMG}';}else{this.style.display='none';}" />
            <div class="upsell-item__info">
              <div class="upsell-item__name">${esc(p.name)}</div>
              <div class="upsell-item__meta">2ml · ${esc(p.brand)}</div>
            </div>
            <button type="button" class="upsell-item__add" data-upsell-id="${p.id}">+ S/${Number(price).toFixed(2)}</button>
          </div>`;
      })
      .join("");
  }

  /* Sticky bottom cart (móvil): se muestra al hacer scroll cuando el
     carrito tiene productos. Un solo botón gigante hacia el checkout. */
  function updateStickyCart() {
    const bar = $("stickyCart");
    if (!bar) return;
    const countEl = $("stickyCartCount");
    const totalEl = $("stickyCartTotal");
    const count = getCartCount();
    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
    renderStickyCartVisibility();
  }
  function renderStickyCartVisibility() {
    const bar = $("stickyCart");
    if (!bar) return;
    const onMobile = window.matchMedia("(max-width: 768px)").matches;
    const hasItems = cart.length > 0;
    /* Regla "una sola capa fija inferior": en Combos manda el dock del
       combo (#comboSummary), nunca deben coexistir los dos. */
    const onExcludedPage = currentPage === "checkout" || currentPage === "promos";
    const scrolled = window.scrollY > 260;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const show = onMobile && hasItems && !onExcludedPage && scrolled;
    bar.classList.toggle("visible", show);
    if (reduce) bar.classList.toggle("visible", onMobile && hasItems && !onExcludedPage);
  }
  window.addEventListener("scroll", renderStickyCartVisibility, { passive: true });
  const cartItemsEl = $("cartItems");
  if (cartItemsEl) {
    cartItemsEl.addEventListener("click", function (e) {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      const index = parseInt(btn.dataset.index, 10);
      if (action === "qty") updateCartQty(index, parseInt(btn.dataset.delta, 10));
      else if (action === "remove") {
        const row = btn.closest(".cart-item");
        if (row && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          row.classList.add("removing");
          setTimeout(() => removeFromCart(index), 240);
        } else {
          removeFromCart(index);
        }
      } else if (action === "keep-shopping") closeCart();
    });

    // Upselling: agregar muestra 2ml directamente desde las sugerencias
    const upsellWrap = $("upsellItems");
    if (upsellWrap) {
      upsellWrap.addEventListener("click", function (e) {
        const btn = e.target.closest(".upsell-item__add");
        if (!btn) return;
        const productId = parseInt(btn.dataset.upsellId, 10);
        if (!productId) return;
        addToCart(productId, "decant", "2ml", 1);
      });
    }

    // Swipe-to-delete en móvil: deslizar el item a la izquierda lo elimina.
    let swipeRow = null, startX = 0, startY = 0, dx = 0, locked = null;
    cartItemsEl.addEventListener("touchstart", function (e) {
      const row = e.target.closest(".cart-item");
      if (!row || e.touches.length !== 1) return;
      swipeRow = row; startX = e.touches[0].clientX; startY = e.touches[0].clientY;
      dx = 0; locked = null;
      row.classList.add("swiping");
    }, { passive: true });
    cartItemsEl.addEventListener("touchmove", function (e) {
      if (!swipeRow) return;
      dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (locked === null) locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (locked !== "x") return;
      const t = Math.min(0, dx); // solo hacia la izquierda
      swipeRow.style.transform = `translateX(${t}px)`;
      swipeRow.style.background = t < -40 ? "rgba(210,75,75,.12)" : "";
    }, { passive: true });
    cartItemsEl.addEventListener("touchend", function () {
      if (!swipeRow) return;
      const row = swipeRow; swipeRow = null;
      row.classList.remove("swiping");
      row.style.background = "";
      if (locked === "x" && dx < -80) {
        const btn = row.querySelector('[data-action="remove"]');
        const idx = btn ? parseInt(btn.dataset.index, 10) : -1;
        row.classList.add("removing");
        setTimeout(() => { if (idx >= 0) removeFromCart(idx); }, 240);
      } else {
        row.classList.add("swipe-reset");
        row.style.transform = "";
        setTimeout(() => row.classList.remove("swipe-reset"), 260);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     CART — OPEN / CLOSE
  ══════════════════════════════════════════════════════════════ */
  function openCart() {
    const cartSidebar = $("cartSidebar");
    $("cartOverlay").classList.add("active");
    cartSidebar.classList.add("mounted");
    requestAnimationFrame(() => cartSidebar.classList.add("active"));
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");
    if (window.__modalScrollY === undefined) window.__modalScrollY = window.scrollY;
    updateCartUI();
    focusModal(cartSidebar);
  }
  function closeCart() {
    const cartSidebar = $("cartSidebar");
    $("cartOverlay").classList.remove("active");
    cartSidebar.classList.remove("active");
    window.setTimeout(() => {
      if (!cartSidebar.classList.contains("active")) cartSidebar.classList.remove("mounted");
    }, 350);
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");
    if (window.__modalScrollY !== undefined) {
      window.scrollTo(0, window.__modalScrollY);
      window.__modalScrollY = undefined;
    }
    restoreFocus();
  }
  function goToCheckout() {
    if (cart.length === 0) {
      showToast("🛒 Tu carrito está vacío");
      return;
    }
    track("begin_checkout", { currency: "PEN", value: getCartTotal() });
    closeCart();
    navigateTo("checkout");
  }

  /* ══════════════════════════════════════════════════════════════
     MODAL — PRODUCT
  ══════════════════════════════════════════════════════════════ */
  function openModal(productId, skipHistory) {
    const product = getProductById(productId);
    if (!product) return;
    currentModalProduct = product;
    currentModalView =
      product.fullSizes && Object.keys(product.fullSizes).length > 0 ? "full" : "decant";
    currentModalSize =
      (product.fullSizes && Object.keys(product.fullSizes)[0]) ||
      (product.decantSizes && Object.keys(product.decantSizes)[0]) || null;
    updateModalContent();
    $("modalOverlay").classList.add("active");
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");
    if (window.__modalScrollY === undefined) window.__modalScrollY = window.scrollY;
    // Accesibilidad: captura el foco y lo mueve dentro del modal
    focusModal($("modal"));
    // SEO dinámico + analítica
    setProductMeta(product);
    track("view_item", { item_id: product.id, item_name: product.name, item_brand: product.brand, item_category: product.category });
    // URL compartible: ?producto=ID
    if (!skipHistory) {
      try { history.pushState({ producto: productId }, "", "?producto=" + productId); } catch (e) { /* noop */ }
    }
  }
  function closeModal(skipHistory) {
    $("modalOverlay").classList.remove("active");
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");
    if (window.__modalScrollY !== undefined) {
      window.scrollTo(0, window.__modalScrollY);
      window.__modalScrollY = undefined;
    }
    currentModalProduct = null;
    restoreMeta();
    restoreFocus();
    if (!skipHistory && /[?&]producto=/.test(location.search)) {
      try { history.pushState({}, "", location.pathname); } catch (e) { /* noop */ }
    }
  }
  function updateModalContent() {
    const product = currentModalProduct;
    if (!product) return;
    // Los testers (y productos sin decants) solo se venden en frasco completo:
    // se oculta la pestaña "Decant" y se fuerza la vista de frasco.
    const hasDecants =
      !product.tester &&
      product.decantSizes &&
      Object.keys(product.decantSizes).length > 0;
    const hasFull =
      product.fullSizes && Object.keys(product.fullSizes).length > 0;
    if (!hasDecants) currentModalView = "full";
    const tabSwitch = $("tabSwitch");
    if (tabSwitch) tabSwitch.style.display = hasDecants || hasFull ? "" : "none";
    const tabFull = $("tabFull");
    const tabDecant = $("tabDecant");
    if (tabFull) tabFull.style.display = hasFull ? "" : "none";
    if (tabDecant) tabDecant.style.display = hasDecants ? "" : "none";
    if (!hasFull && !hasDecants) return;
    const isFull = currentModalView === "full";
    const sizes = isFull ? product.fullSizes : getDisplayDecantSizes(product);
    if (!sizes || Object.keys(sizes).length === 0) {
      currentModalSize = null;
    } else if (!sizes[currentModalSize]) {
      currentModalSize = Object.keys(sizes)[0];
    }
    // La imagen del modal cambia según el tamaño seleccionado (5ml/10ml)
    const modalImgContainer = $("modalImage");
    if (modalImgContainer) {
      const modalImg = modalImgContainer.querySelector("img");
      if (modalImg) {
        const imgSrc = (isFull ? product.fullImage : sizeImage(product, currentModalSize)) || cardImg(product);
        modalImg.src = imgSrc;
        modalImg.alt = product.name;
        modalImg.onerror = function() {
          if (this.src !== PLACEHOLDER_IMG) { this.src = PLACEHOLDER_IMG; }
          else { this.style.display = 'none'; }
        };
      }
    }
    $("modalName").textContent = product.name;
    $("modalBrand").textContent = product.brand;
    // Condición real (Tester / Parcial): visible junto a nombre/marca, no
    // escondida dentro del párrafo de descripción (pedido explícito).
    const modalConditionEl = $("modalCondition");
    if (modalConditionEl) {
      const condition = sealedConditionLabel(product);
      modalConditionEl.textContent = condition;
      modalConditionEl.style.display = condition ? "block" : "none";
    }
    $("modalNotes").textContent =
      "✨ " + product.description + (product.notes ? "\n\nNotas: " + product.notes : "");
    $("tabFull").classList.toggle("active", isFull);
    $("tabDecant").classList.toggle("active", !isFull);
    const sizeContainer = $("modalSizes");
    // Orden lógico de tamaños: menor a mayor (premium va justo tras su base)
    const sizeKeys = Object.keys(sizes).sort((a, b) => {
      const va = parseFloat(baseSizeOf(a)) + (isPremiumSize(a) ? 0.5 : 0);
      const vb = parseFloat(baseSizeOf(b)) + (isPremiumSize(b) ? 0.5 : 0);
      return va - vb;
    });
    // Etiqueta "Tamaño" sobre el selector (accesible, idempotente)
    let sizeLabelEl = document.getElementById("modalSizeLabel");
    if (!sizeLabelEl) {
      sizeLabelEl = document.createElement("div");
      sizeLabelEl.className = "size-label";
      sizeLabelEl.id = "modalSizeLabel";
      sizeLabelEl.textContent = "Tamaño";
      sizeContainer.parentNode.insertBefore(sizeLabelEl, sizeContainer);
    }
    sizeContainer.innerHTML = sizeKeys
      .map((size) => {
        const price = sizes[size];
        const premium = isPremiumSize(size);
        return `<button class="size-option${size === currentModalSize ? " selected" : ""}${premium ? " size-option--premium" : ""}" data-size="${esc(size)}" type="button">
            <span class="size-option__label">${esc(sizeLabel(size))}</span>
            <span class="size-option__price">${typeof price === "number" ? esc(formatPrice(price)) : ""}</span>
          </button>`;
      })
      .join("");
    const price = currentModalSize ? sizes[currentModalSize] : null;
    const modalPromo = isFull ? productPromoInfo(product) : null;
    const modalFake = !modalPromo && price ? getFakeDiscount(price) : null;
    $("modalPrice").innerHTML = modalPromo
      ? `<span class="price-regular">${esc(formatPrice(modalPromo.regularPrice))}</span><span class="price-pct">${modalPromo.pct}% menos</span><span class="price-final">${esc(formatPrice(modalPromo.price))}</span> <span class="price-size-badge">${esc(sizeLabel(currentModalSize))}</span>`
      : modalFake
      ? `${modalFake.html} <span class="price-size-badge">${esc(sizeLabel(currentModalSize))}</span>`
      : price
      ? `${esc(formatPrice(price))} <span class="price-size-badge">${esc(sizeLabel(currentModalSize))}</span>`
      : "Selecciona tamaño";
    // Botón principal: cotizar por WhatsApp (frasco) o añadir al carrito (decant)
    const addBtn = $("modalAddBtn");
    const isQuote = isFull && FO.FRASCO_COMPLETO_WHATSAPP !== false;
    addBtn.classList.toggle("btn-add-wa", isQuote);
    addBtn.innerHTML = isQuote
      ? `<i class="fab fa-whatsapp" aria-hidden="true"></i><span>Cotizar Frasco por WhatsApp</span>`
      : `<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i><span>${price ? `Añadir ${esc(sizeLabel(currentModalSize))} — ${esc(formatPrice(price))}` : "Añadir al Carrito"}</span>`;
    // Producto "Próximamente": sin stock, no agregable (solo aviso + reserva)
    const soon = isComingSoon(currentModalProduct.id);
    let soonNote = document.getElementById("modalSoonNote");
    if (soon) {
      addBtn.disabled = true;
      addBtn.classList.add("btn-soon");
      addBtn.classList.remove("btn-add-wa");
      addBtn.innerHTML = `<i class="fa-regular fa-clock" aria-hidden="true"></i><span>Próximamente</span>`;
      if (!soonNote) {
        soonNote = document.createElement("p");
        soonNote.id = "modalSoonNote";
        const priceEl = $("modalPrice");
        if (priceEl) priceEl.after(soonNote);
      }
      if (soonNote) {
        soonNote.textContent = "Producto disponible próximamente. ¿Quieres reservarlo? Escríbenos por WhatsApp.";
      }
    } else {
      addBtn.disabled = false;
      addBtn.classList.remove("btn-soon");
      if (soonNote) soonNote.remove();
    }
    // Enlace de cotización: visible cuando el producto NO tiene frasco completo
    const quoteLink = $("modalQuoteLink");
    if (quoteLink) quoteLink.style.display = !hasFull && FO.FRASCO_COMPLETO_WHATSAPP !== false ? "" : "none";
  }
  /* Cotización de frasco completo por WhatsApp (botón del modal y enlace). */
  function openWhatsAppQuote(product) {
    if (!product) return;
    // La condición (Tester/Parcial) y el precio no deben perderse al pasar
    // a WhatsApp -- pedido explícito del cliente, el mensaje ya no puede
    // ser solo "nombre + marca".
    const condition = sealedConditionLabel(product);
    const sizeForPrice = currentModalSize && product.fullSizes && product.fullSizes[currentModalSize] !== undefined
      ? currentModalSize
      : Object.keys(product.fullSizes || {})[0];
    const price = sizeForPrice ? product.fullSizes[sizeForPrice] : null;
    const priceText = typeof price === "number" ? formatPrice(price) : "";
    const msg = typeof FO.WHATSAPP_COTIZAR_MSG === "function"
      ? FO.WHATSAPP_COTIZAR_MSG(product.name, product.brand, condition, priceText)
      : `Hola, quiero cotizar el frasco completo de ${product.name} (${product.brand}). ¿Me pueden dar más información?`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    const win = window.open(url, "_blank");
    if (!win) location.href = url;
    track("quote_full_bottle", { item_id: product.id, item_name: product.name, item_brand: product.brand });
    showToast("📲 Abriendo WhatsApp para cotizar tu frasco...");
  }
  window.cotizarFrascoWhatsApp = function () { openWhatsAppQuote(currentModalProduct); };
  const quoteLinkEl = $("modalQuoteLink");
  if (quoteLinkEl) {
    quoteLinkEl.addEventListener("click", function (e) {
      e.preventDefault();
      openWhatsAppQuote(currentModalProduct);
    });
  }
  $("tabFull").addEventListener("click", function () {
    currentModalView = "full";
    updateModalContent();
  });
  $("tabDecant").addEventListener("click", function () {
    currentModalView = "decant";
    updateModalContent();
  });
  $("modalSizes").addEventListener("click", function (e) {
    const btn = e.target.closest(".size-option");
    if (!btn) return;
    currentModalSize = btn.dataset.size;
    updateModalContent();
  });
  $("modalAddBtn").addEventListener("click", function () {
    if (!currentModalProduct || !currentModalSize) {
      showToast("⚠️ Selecciona un tamaño");
      return;
    }
    // Frasco completo → cotización por WhatsApp (nunca se agrega al carrito)
    if (currentModalView === "full" && FO.FRASCO_COMPLETO_WHATSAPP !== false) {
      openWhatsAppQuote(currentModalProduct);
      return;
    }
    const flyImg =
      currentModalView === "full"
        ? currentModalProduct.fullImage
        : sizeImage(currentModalProduct, currentModalSize);
    flyToCart(flyImg, this);
    addToCart(currentModalProduct.id, currentModalView, currentModalSize);
    // micro-check ✓ antes de cerrar
    const btn = this;
    btn.classList.add("added");
    setTimeout(() => {
      btn.classList.remove("added");
      closeModal();
      openCart();
    }, 550);
  });
  $("modalOverlay").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });

  /* ── Accesibilidad: trampa de Tab + foco inicial/restaurado en modales ──
     El Esc ya se maneja globalmente (document keydown). */
  let lastFocusedEl = null;
  function trapTabFocus(container, e) {
    if (e.key !== "Tab") return;
    const items = Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  const modalEl = $("modal");
  if (modalEl) {
    modalEl.addEventListener("keydown", (e) => trapTabFocus(modalEl, e));
  }
  const packModalEl = $("packModal");
  if (packModalEl) {
    packModalEl.addEventListener("keydown", (e) => trapTabFocus(packModalEl, e));
  }
  const cartSidebarEl = $("cartSidebar");
  if (cartSidebarEl) {
    cartSidebarEl.addEventListener("keydown", (e) => trapTabFocus(cartSidebarEl, e));
  }
  const infoModalEl = $("infoModal");
  if (infoModalEl) {
    infoModalEl.addEventListener("keydown", (e) => trapTabFocus(infoModalEl, e));
  }
  function focusModal(container, returnTo) {
    if (!container) return;
    lastFocusedEl = returnTo || document.activeElement;
    requestAnimationFrame(() => { try { container.focus(); } catch (e) { /* noop */ } });
  }
  function restoreFocus() {
    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      try { lastFocusedEl.focus(); } catch (e) { /* noop */ }
    }
    lastFocusedEl = null;
  }

  /* ══════════════════════════════════════════════════════════════
     ARMA TU COMBO — constructor de dos paneles en la pagina de packs.
     Combo propio, NO reutiliza calcularDescuentos(): tramos y tope
     distintos, pedidos explicitamente para esta funcionalidad (ver
     HANDOFF.md Prompt 35 -- "reglas propias, explicitamente distintas
     de calcularDescuentos()", instruccion real del negocio, no una
     inferencia del codigo) -- 3-5 decants -> 5%, 6 decants -> 10%
     (tope del combo); 3+ misma marca -> FO_CONFIG.DESCUENTOS.POR_MARCA
     (mismo valor que el resto del sitio, no hardcodeado aparte); gana
     el mayor, no se acumulan.
     El pedido YA NO se manda directo por WhatsApp (cambio explicito de
     una ronda posterior a Prompt 35): confirmCombo() lo agrega al
     carrito como 1 item type:"pack" con el precio ya descontado, y
     navega a Checkout -- mismo final de compra unico que el resto del
     sitio (WhatsApp solo se dispara ahi, no antes).
  ══════════════════════════════════════════════════════════════ */
  function getComboEligibleProducts() {
    return products.filter((p) =>
      !p.tester && !isComingSoon(p.id) && p.decantSizes &&
      (p.decantSizes["3"] !== undefined || p.decantSizes["5"] !== undefined || p.decantSizes["10"] !== undefined)
    );
  }
  function comboProductHasSize(prod, size) {
    return !!(prod && prod.decantSizes && prod.decantSizes[size] !== undefined);
  }
  function getComboDiscountInfo() {
    const count = comboSelectedIds.length;
    const items = comboSelectedIds.map((pid) => {
      const prod = getProductById(pid);
      if (!comboProductHasSize(prod, comboSize)) return null;
      return { brand: prod.brand, price: prod.decantSizes[comboSize] };
    }).filter(Boolean);
    const subtotal = items.reduce((s, it) => s + it.price, 0);
    const qtyPct = count >= COMBO_MAX ? 10 : count >= COMBO_MIN ? 5 : 0;
    const brandCounts = {};
    items.forEach((it) => { brandCounts[it.brand] = (brandCounts[it.brand] || 0) + 1; });
    const marcaCfg = (FO.DESCUENTOS && FO.DESCUENTOS.POR_MARCA) || { minItems: 3, porcentaje: 10 };
    let brandPct = 0, brandName = "";
    Object.keys(brandCounts).forEach((b) => {
      if (brandCounts[b] >= marcaCfg.minItems && marcaCfg.porcentaje > brandPct) { brandPct = marcaCfg.porcentaje; brandName = b; }
    });
    const discountPct = Math.max(qtyPct, brandPct);
    const isValid = count >= COMBO_MIN;
    const discountAmount = isValid ? Math.round(subtotal * discountPct) / 100 : 0;
    const total = Math.round((subtotal - discountAmount) * 100) / 100;
    const ruleLabel = brandPct >= qtyPct && brandPct > 0 ? `${brandPct}% en ${brandName}` : (qtyPct > 0 ? `${qtyPct}% por cantidad` : "");
    return { count, discountPct, subtotal, discountAmount, total, isValid, ruleLabel };
  }
  function comboToggleProduct(productId) {
    const idx = comboSelectedIds.indexOf(productId);
    if (idx > -1) {
      comboSelectedIds.splice(idx, 1);
    } else {
      if (comboSelectedIds.length >= COMBO_MAX) {
        showToast(`⚠️ Tu combo admite máximo ${COMBO_MAX} fragancias`);
        return;
      }
      const prod = getProductById(productId);
      if (!comboProductHasSize(prod, comboSize)) return;
      comboSelectedIds.push(productId);
    }
    renderComboList();
    renderComboSummary();
  }
  window.comboToggleProduct = comboToggleProduct;
  function comboSetSize(size) {
    if (comboSize === size) return;
    comboSize = size;
    /* Cambiar el tamano global re-evalua elegibilidad: un producto sin
       esa talla sale del combo (con aviso); el resto recalcula precio a
       la nueva talla automaticamente en getComboDiscountInfo(). */
    const before = comboSelectedIds.length;
    comboSelectedIds = comboSelectedIds.filter((pid) => comboProductHasSize(getProductById(pid), comboSize));
    if (comboSelectedIds.length < before) {
      showToast(`⚠️ Algunas fragancias no tienen presentación de ${comboSize}ml y se quitaron del combo`);
    }
    document.querySelectorAll(".combo-size-btn").forEach((btn) => {
      const active = btn.dataset.size === comboSize;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    renderComboList();
    renderComboSummary();
  }
  window.comboSetSize = comboSetSize;
  function renderComboList() {
    const list = $("comboList");
    if (!list) return;
    let eligible = getComboEligibleProducts();
    if (comboSearchQuery) {
      const q = comboSearchQuery.toLowerCase();
      eligible = eligible.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    const countEl = $("comboResults");
    if (countEl) countEl.textContent = `${eligible.length} perfumes disponibles`;
    if (eligible.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem 1rem;">No hay perfumes que coincidan con la búsqueda.</p>';
      return;
    }
    /* Fotografia por perfume: mismo criterio de fallback que el resto del
       sitio (cardImage real, o el monograma SVG de marca si no hay foto
       -- nunca un icono roto). loading="lazy" es obligatorio aqui: son
       hasta ~140 filas, sin lazy el navegador pediria todas las imagenes
       de golpe. */
    list.innerHTML = eligible.map((prod) => {
      const isSelected = comboSelectedIds.includes(prod.id);
      const hasSize = comboProductHasSize(prod, comboSize);
      const disabled = !hasSize || (!isSelected && comboSelectedIds.length >= COMBO_MAX);
      const realPrice = hasSize ? prod.decantSizes[comboSize] : null;
      const fake = realPrice ? getFakeDiscount(realPrice) : null;
      const priceHtml = realPrice
        ? (fake ? fake.html : formatPrice(realPrice))
        : `Sin ${comboSize}ml`;
      const imgSrc = prod.cardImage || cardImg(prod);
      return `<label class="combo-item${isSelected ? " selected" : ""}${disabled ? " disabled" : ""}">
        <input type="checkbox" data-product-id="${prod.id}"${isSelected ? " checked" : ""}${disabled ? " disabled" : ""} />
        <span class="combo-item__check" aria-hidden="true"></span>
        <img class="combo-item__img" src="${esc(imgSrc)}" alt="" loading="lazy" decoding="async"
             onerror="this.src='${PLACEHOLDER_IMG}';" />
        <span class="combo-item__text">
          <span class="combo-item__brand">${esc(prod.brand)}</span>
          <span class="combo-item__name">${esc(prod.name)}</span>
        </span>
        <span class="combo-item__price">${priceHtml}</span>
      </label>`;
    }).join("");
  }
  function renderComboSummary() {
    const countEl = $("comboSummaryCount");
    const chipsEl = $("comboSummaryChips");
    const hintEl = $("comboSummaryHint");
    const totalWrap = $("comboSummaryTotal");
    const discountLabelEl = $("comboDiscountLabel");
    const totalAmountEl = $("comboTotalAmount");
    const confirmBtn = $("comboConfirmBtn");
    const summaryEl = $("comboSummary");
    const dockText = $("comboDockText");
    const dockAmount = $("comboDockAmount");
    if (!countEl) return;
    /* En movil el panel es un dock flotante (position:fixed) y solo se
       muestra si hay algo que resumir -- mismo patron que .sticky-cart.
       Sin esto, tapaba el footer de forma permanente incluso con el combo
       vacio. En desktop es sticky dentro del grid, la clase no tiene
       efecto visual ahi. */
    if (summaryEl) summaryEl.classList.toggle("visible", comboSelectedIds.length > 0);
    /* Si el combo se vacia (ultimo item quitado), colapsa el sheet: no
       tiene sentido dejarlo "abierto" mostrando un panel vacio. */
    if (summaryEl && comboSelectedIds.length === 0) comboSetSheetExpanded(false);
    countEl.textContent = `${comboSelectedIds.length}/${COMBO_MAX} fragancias`;
    const info = getComboDiscountInfo();
    if (dockText) {
      if (comboSelectedIds.length >= COMBO_MIN) dockText.textContent = `${info.count} fragancias · ${formatPrice(info.total)}`;
      else {
        const falta = COMBO_MIN - comboSelectedIds.length;
        dockText.textContent = `${comboSelectedIds.length} fragancia${comboSelectedIds.length === 1 ? "" : "s"} · Te falta${falta === 1 ? "" : "n"} ${falta} para continuar`;
      }
    }
    chipsEl.innerHTML = comboSelectedIds.map((pid) => {
      const prod = getProductById(pid);
      if (!prod) return "";
      return `<span class="combo-chip">${esc(prod.name)} <button type="button" class="combo-chip-x" onclick="comboToggleProduct(${pid})" aria-label="Quitar ${esc(prod.name)}">&times;</button></span>`;
    }).join("");
    if (info.isValid) {
      hintEl.style.display = "none";
      totalWrap.style.display = "flex";
      discountLabelEl.textContent = info.discountPct > 0 ? `${info.discountPct}% dto (${info.ruleLabel})` : "Sin descuento aún";
      totalAmountEl.textContent = info.discountPct > 0 ? `${formatPrice(info.subtotal)} → ${formatPrice(info.total)}` : formatPrice(info.subtotal);
      confirmBtn.disabled = false;
      if (dockAmount) dockAmount.textContent = formatPrice(info.total);
    } else {
      totalWrap.style.display = "none";
      hintEl.style.display = "block";
      const falta = COMBO_MIN - info.count;
      hintEl.textContent = info.count === 0 ? `Elige al menos ${COMBO_MIN} fragancias` : `Te falta${falta === 1 ? "" : "n"} ${falta} más para armar tu combo`;
      confirmBtn.disabled = true;
      if (dockAmount) dockAmount.textContent = info.count > 0 ? formatPrice(info.subtotal) : "";
    }
  }
  /* Dock compacto <-> bottom sheet (solo tiene efecto visual en movil,
     ver CSS -- en desktop .combo-dock-trigger esta oculto). */
  function comboSetSheetExpanded(expanded) {
    const summaryEl = $("comboSummary");
    const trigger = $("comboDockTrigger");
    if (!summaryEl || !trigger) return;
    summaryEl.classList.toggle("expanded", expanded);
    trigger.setAttribute("aria-expanded", String(expanded));
  }
  function comboToggleSheet() {
    const summaryEl = $("comboSummary");
    comboSetSheetExpanded(!(summaryEl && summaryEl.classList.contains("expanded")));
  }
  window.comboToggleSheet = comboToggleSheet;
  function initComboBuilder() {
    comboSize = "3";
    comboSelectedIds = [];
    comboSearchQuery = "";
    const searchEl = $("comboSearchInput");
    if (searchEl) searchEl.value = "";
    document.querySelectorAll(".combo-size-btn").forEach((btn) => {
      const active = btn.dataset.size === "3";
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    renderComboList();
    renderComboSummary();
  }
  /* El combo usa el mismo final de compra que el resto del sitio. */
  function confirmCombo() {
    const info = getComboDiscountInfo();
    if (!info.isValid) {
      showToast(`⚠️ Elige al menos ${COMBO_MIN} fragancias para tu combo`);
      return;
    }
    const includedProducts = comboSelectedIds.map((pid) => {
      const prod = getProductById(pid);
      return prod ? { id: prod.id, name: prod.name, brand: prod.brand, size: comboSize + "ml" } : null;
    }).filter(Boolean);
    cart.push({
      productId: "combo-" + Date.now(), type: "pack", isPack: true,
      name: `Combo curado · ${info.count} fragancias`, brand: "FRAGRANCE OBSESSION",
      image: "fondo_promos.webp", size: comboSize + "ml", price: info.total, qty: 1,
      subtotal: info.subtotal, discount: info.discountAmount, discountPct: info.discountPct,
      discountLabel: info.ruleLabel, includedProducts,
    });
    saveCart();
    updateCartUI();
    track("combo_confirmed", { value: info.total, items: info.count, discount_pct: info.discountPct });
    comboSetSheetExpanded(false);
    navigateTo("checkout");
  }
  window.confirmCombo = confirmCombo;

  /* ══════════════════════════════════════════════════════════════
     NAVIGATION
  ══════════════════════════════════════════════════════════════ */
  function navigateTo(page) {
    if (!VALID_PAGES.has(page)) return;
    // La navegación es el único punto común de los links del sitio. Cierra el
    // drawer antes de cambiar la vista para que backdrop, scroll y ARIA no
    // queden desincronizados con el panel visual.
    closeNav({ restoreFocus: false, restoreScroll: false });
    currentPage = page;
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    const target = $("page-" + page);
    if (target) target.classList.add("active");
    document.querySelectorAll(".nav a").forEach((a) => a.classList.remove("active"));
    const navLink = document.querySelector(`.nav a[data-page="${page}"]`);
    if (navLink) navLink.classList.add("active");
    renderStickyCartVisibility();
    if (page === "catalogo") {
      activeFilters = { category: null, gender: null };
      searchTerm = "";
      quickFilter = "todos";
      const searchEl = $("catalogSearch");
      if (searchEl) searchEl.value = "";
      updateCatalogFilterButtons();
      renderCatalog();
    }
    if (page === "promos") {
      initComboBuilder();
    }
    if (page === "checkout") renderCheckoutPage();
    if (page === "home") renderFeatured();
    track("page_view", { page_title: "FRAGRANCE OBSESSION · " + page, page_path: "/" + (page === "home" ? "" : page) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  window.navigateTo = navigateTo;

  /* Condición real de un frasco completo (sellado/tester/parcial): dato
     de negocio en productos.js (product.sealedStatus + contentPercent),
     NUNCA inventado aquí. "sellado" no lleva chip propio -- es el estado
     por defecto esperado, ya cubierto por "Caja Sellada". Un tester o un
     parcial NO pueden presentarse como si fueran un sellado nuevo (pedido
     explícito del cliente): esta etiqueta se reutiliza en card, modal y
     mensaje de WhatsApp para que la condición nunca se pierda en el flujo. */
  function sealedConditionLabel(product) {
    if (!product || product.sealedStatus === "sellado" || !product.sealedStatus) return "";
    if (product.sealedStatus === "tester") return "Tester";
    if (product.sealedStatus === "parcial") {
      return product.contentPercent ? `Parcial · ${product.contentPercent}% de contenido` : "Parcial";
    }
    return "";
  }

  /* Precio promocional de un frasco completo (1 sola talla): envoltorio
     de window.calcularPrecioPromo (descuentos.js) para que la card/modal
     nunca calculen el % a mano. Sin regularPrice en productos.js -> null,
     no se muestra nada (nunca se fabrica un "antes" para aparentar %). */
  function productPromoInfo(product) {
    if (!product || !product.fullSizes) return null;
    const sizes = Object.keys(product.fullSizes);
    if (sizes.length !== 1) return null; // solo aplica a talla unica (frasco completo)
    const price = product.fullSizes[sizes[0]];
    return window.calcularPrecioPromo ? window.calcularPrecioPromo(product.regularPrice, price) : null;
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER — PRODUCT CARD
  ══════════════════════════════════════════════════════════════ */
  function createProductCard(product) {
    const decantSizes = Object.keys(product.decantSizes || {});
    const fullSizes = Object.keys(product.fullSizes || {});
    const hasDecants = !product.tester && decantSizes.length > 0;
    const hasFull = fullSizes.length > 0;
    const condition = sealedConditionLabel(product);
    // Presentación: condición real (Tester / Parcial) si aplica; si no,
    // "Caja Sellada" para cualquier frasco completo sin decants.
    const presentation =
      condition ? condition
      : product.tester ? "Tester"
      : !hasDecants ? "Caja Sellada"
      : "";
    const minPrice = hasDecants
      ? Math.min(...Object.values(product.decantSizes))
      : hasFull ? Math.min(...Object.values(product.fullSizes)) : null;
    const BADGE_TOOLTIPS = {
      new: "Producto recién agregado",
      top: "Más vendido",
      tester: "Versión de prueba",
      nicho: "Fragancia nicho",
      deluxe: "Colección Deluxe de alta gama",
    };
    // Los perfumes Deluxe muestran siempre su badge dorado "Deluxe".
    const effectiveBadge = product.category === "deluxe" ? "deluxe" : product.badge;
    const effectiveBadgeText = product.category === "deluxe" ? "Deluxe" : product.badgeText;
    const badgeTip = effectiveBadge ? BADGE_TOOLTIPS[effectiveBadge] : "";
    // Badge principal; si hay bestseller, el badge regular se desplaza a la derecha
    const bestseller = product.bestseller === true;
    const badgeClass = bestseller ? `${esc(effectiveBadge)} product-badge--right` : esc(effectiveBadge);
    const badgeHTML = effectiveBadge
      ? `<span class="product-badge ${badgeClass}"${badgeTip ? ` data-tooltip="${esc(badgeTip)}"` : ""}>${esc(effectiveBadgeText)}</span>`
      : "";
    const bestsellerHTML = bestseller
      ? `<span class="product-badge bestseller" data-tooltip="El favorito de nuestros clientes">${esc(product.bestsellerLabel || "Más Vendido")}</span>`
      : "";
    // Precio: promo real (regularPrice de productos.js) o fake discount visual
    const promo = productPromoInfo(product);
    const fake = !promo && minPrice ? getFakeDiscount(minPrice) : null;
    const priceText = promo
      ? `<span class="price-regular">${esc(formatPrice(promo.regularPrice))}</span><span class="price-final">${esc(formatPrice(promo.price))}</span><span class="price-pct">${promo.pct}% menos</span>`
      : fake ? fake.html
      : minPrice ? `Desde ${formatPrice(minPrice)}` : "Consultar";
    const catLabel =
      product.category === "nicho" ? "Nicho"
      : product.category === "arabe" ? "Árabe"
      : product.category === "deluxe" ? "Deluxe"
      : "Diseñador";
    const stockHTML = product.tester ? "" : `<span class="stock-chip">${stockLabel(product.id)}</span>`;
    // Chip de presentación (solo para sellados/testers: los decants no necesitan etiqueta)
    const presentationHTML = presentation
      ? `<span class="presentation-chip">${esc(presentation)}</span>`
      : "";
    const soon = isComingSoon(product.id);
    return `
      <div class="product-card reveal-item" data-product-id="${product.id}">
        <div class="img-wrapper">
          ${badgeHTML}
          ${soon ? `<span class="product-badge soon">Próximamente</span>` : ""}
          ${bestsellerHTML}
          ${presentationHTML}
          <img src="${esc(product.cardImage || cardImg(product))}" alt="${esc(product.name)} - ${esc(product.brand)}" loading="lazy" decoding="async" onload="this.classList.add('img-loaded'); this.closest('.img-wrapper').classList.add('skeleton-done');" onerror="if(this.src!=='${PLACEHOLDER_IMG}'){this.src='${PLACEHOLDER_IMG}';}else{this.style.display='none'; this.closest('.img-wrapper').classList.add('skeleton-done');}" />
        </div>
        <div class="product-info">
          <div class="product-category">${catLabel} · ${esc(product.gender)}</div>
          <div class="product-name">${esc(product.name)}</div>
          <div class="product-brand">${esc(product.brand)}</div>
          <div class="product-price-row">
            <span class="product-price">${priceText}</span>
            ${stockHTML}
          </div>
          <button class="btn-add${soon ? " btn-soon" : ""}" data-add-id="${product.id}"${soon ? " disabled" : ""}>${soon ? "Próximamente" : hasDecants ? "Ver y Comprar" : "Comprar Sellado"}</button>
        </div>
      </div>`;
  }
  // Stock simulado, determinista por id (no cambia al recargar).
  function stockLabel(id) {
    const opts = ["Quedan 2", "Quedan 3", "Quedan 5", "Quedan 8", "Últimas unidades"];
    return opts[id % opts.length];
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER — FEATURED
  ══════════════════════════════════════════════════════════════ */
  function renderFeatured() {
    const grid = $("featuredGrid");
    if (!grid) return;
    /* Grid 2×5: 10 destacados, priorizando "Más Vendido" sobre
       "Tendencia en TikTok" (estable: el resto conserva el orden). */
    const rank = (p) =>
      p.bestsellerLabel === "Más Vendido" ? 0 : p.bestsellerLabel ? 1 : 2;
    const featured = products
      .filter((p) => p.featured)
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 10);
    grid.innerHTML = featured.map(createProductCard).join("");
    observeRevealElements();
    window.FraganceAnimations?.refresh?.();
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER — CATALOG
  ══════════════════════════════════════════════════════════════ */
  function renderCatalog(isLoadMore = false) {
    const grid = $("catalogGrid");
    if (!grid) return;

    // Solo reinicia el contador si NO es carga incremental
    if (!isLoadMore) {
      catalogVisibleCount = 24;
    }

    // Cancela renders pendientes para evitar que pinten resultados viejos
    clearTimeout(window.__catalogRenderTimer);

    const query = searchTerm.trim().toLowerCase();
    const hasQuick = query !== "" || quickFilter !== "todos";
    // "todos" (píldora por defecto) equivale a "sin categoría": se muestran todas
    const cat = activeFilters.category === "todos" ? null : activeFilters.category;

    let filtered = products.filter(isProduct);

    if (activeFilters.category === "tester") {
      filtered = filtered.filter((p) => p.tester === true);
    } else if (activeFilters.category === "completos") {
      filtered = filtered.filter((p) => p.sealed === true);
    } else {
      filtered = filtered.filter((p) => !p.tester && !p.sealed);
      if (cat) {
        filtered = filtered.filter((p) => p.category === cat);
      }
    }
    if (activeFilters.gender) {
      filtered = filtered.filter((p) => p.gender === activeFilters.gender);
    }
    if (quickFilter !== "todos") {
      filtered = filtered.filter(QUICK_FILTERS[quickFilter] || (() => true));
    }
    if (query) {
      filtered = filtered.filter((p) =>
        `${p.name} ${p.brand} ${p.notes || ""} ${p.category}`.toLowerCase().includes(query),
      );
    }

    // Aplica conteo progresivo: solo muestra los primeros N productos
    // para evitar crash en Safari móvil por exceso de nodos DOM
    catalogVisibleCount = Math.min(Math.max((catalogVisibleCount || 24), 12), filtered.length);
    const visible = filtered.slice(0, catalogVisibleCount);

    // Transición fade suave al actualizar resultados en tiempo real
    grid.classList.add("switching");
    clearTimeout(window.__catalogRenderTimer);
    window.__catalogRenderTimer = setTimeout(() => {
      const countEl = $("catalogResultsCount");
      if (countEl) {
        const label = query ? ` para “${searchTerm.trim()}”` : "";
        const total = `${filtered.length} fragancia${filtered.length === 1 ? "" : "s"}`;
        countEl.textContent = `${total}${label}`;
        countEl.style.display = "block";
      }
      if (filtered.length) {
        if (FO.GROUP_BY_BRAND !== false) {
          // Agrupación por marca: en carga incremental no se soporta bien, hacer render completo
          if (!isLoadMore) {
            const groups = [];
            const byBrand = new Map();
            filtered.forEach((p) => {
              const b = (p.brand || "Otros").trim();
              if (!byBrand.has(b)) {
                byBrand.set(b, []);
                groups.push(b);
              }
              byBrand.get(b).push(p);
            });
            grid.innerHTML = groups
              .map(
                (b) =>
                  `<section class="brand-group" aria-label="Marca ${esc(b)}">` +
                  `<h3 class="brand-heading">${esc(b)}</h3>` +
                  `<div class="brand-grid">${byBrand.get(b).map(createProductCard).join("")}</div>` +
                  `</section>`,
              )
              .join("");
          }
        } else {
          if (isLoadMore) {
            // Añadir solo las nuevas tarjetas (incremental)
            const newCards = visible.slice(catalogVisibleCount - 24, catalogVisibleCount);
            if (newCards.length > 0) {
              grid.insertAdjacentHTML("beforeend", newCards.map(createProductCard).join(""));
            }
          } else {
            // Render inicial completo
            grid.innerHTML = visible.map(createProductCard).join("");
          }
        }
        // Botón "Cargar más" si hay productos adicionales ocultos
        // Eliminar botón existente si existe
        const existingBtn = document.getElementById("loadMoreCatalog");
        if (existingBtn) existingBtn.remove();
        if (filtered.length > catalogVisibleCount) {
          grid.insertAdjacentHTML(
            "afterend",
            `<button id="loadMoreCatalog" class="btn-load-more">Mostrar más</button>`,
          );
        }
      } else {
        grid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20.5 20.5L16.2 16.2"/></svg></div>
            <h3 class="empty-state-title">No encontramos productos</h3>
            <p class="empty-state-text">Prueba con otra búsqueda o cambia de filtro.</p>
          </div>`;
      }
      grid.classList.remove("switching");
      observeRevealElements();
      window.FraganceAnimations?.refresh?.();
    }, 160);
  }

   /* ══════════════════════════════════════════════════════════════
     RENDER — PROMOS (packs dinámicos: 2-5: 5% · 6+: 10% · marca: 10%)
  ══════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════
     PACK BUILDER — event handlers
  ══════════════════════════════════════════════════════════════ */
  /* Selector de tamano del combo (3/5/10ml, global para todo el combo) */
  document.querySelectorAll(".combo-size-btn").forEach((btn) => {
    btn.addEventListener("click", function () { comboSetSize(this.dataset.size); });
  });

  /* Busqueda */
  const comboSearchInputEl = $("comboSearchInput");
  if (comboSearchInputEl) {
    let comboSearchTimeout;
    comboSearchInputEl.addEventListener("input", function () {
      clearTimeout(comboSearchTimeout);
      const val = this.value;
      comboSearchTimeout = setTimeout(() => {
        comboSearchQuery = val.trim();
        renderComboList();
      }, 200);
    });
  }

  /* Lista de productos: checkboxes nativos (label+input), delegado al
     contenedor estable -- accesible por teclado/click sin markup extra. */
  const comboListEl = $("comboList");
  if (comboListEl) {
    comboListEl.addEventListener("change", function (e) {
      const input = e.target.closest('input[type="checkbox"][data-product-id]');
      if (!input) return;
      const id = parseInt(input.dataset.productId, 10);
      if (id) comboToggleProduct(id);
    });
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER — CHECKOUT
  ══════════════════════════════════════════════════════════════ */
  function renderCheckoutPage() {
    const emptyMsg = $("checkout-empty-cart");
    const formWrapper = $("checkout-form-wrapper");
    const summaryItems = $("checkoutSummaryItems");
    const totalEl = $("checkoutTotal");

    if (!emptyMsg || !formWrapper) return;

    if (cart.length === 0) {
      emptyMsg.style.display = "block";
      formWrapper.style.display = "none";
      return;
    }

    emptyMsg.style.display = "none";
    formWrapper.style.display = "block";

    if (summaryItems) {
      summaryItems.innerHTML = cart
        .map((item) => {
          const isMultiPack = item.isPack && item.includedProducts && item.includedProducts.length > 0 && !item.gift;
          const hasGift = item.isPack && item.gift;
          let infoHtml = "";

          if (isMultiPack) {
            const miniImgs = item.includedProducts
              .map(
                (p) =>
                  `<img src="${esc(p.image)}" alt="${esc(p.name)}"
                  style="width:32px;height:32px;border-radius:6px;object-fit:cover;margin-right:4px;"
                  loading="lazy" decoding="async" onerror="this.src='${PLACEHOLDER_IMG}'" />`,
              )
              .join("");
            infoHtml = `
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
              <div style="display:flex;">${miniImgs}</div>
              <div>
                <div style="font-weight:600;font-size:.85rem;">${esc(item.name)}</div>
                <div style="font-size:.75rem;color:var(--text-secondary);">${item.includedProducts.length} × ${esc(sizeLabel(item.size))}</div>
              </div>
            </div>`;
          } else if (hasGift) {
            infoHtml = `
            <div style="display:flex;align-items:center;gap:.5rem;">
              <div style="position:relative;">
                <img src="${esc(item.image)}" alt="${esc(item.name)}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;" loading="lazy" decoding="async" />
                <img src="${esc(item.gift.image)}" alt="${esc(item.gift.name)}"
                     style="position:absolute;bottom:-4px;right:-4px;width:20px;height:20px;border-radius:50%;border:2px solid white;object-fit:cover;" loading="lazy" decoding="async" />
              </div>
              <div>
                <div style="font-weight:600;font-size:.85rem;">${esc(item.name)}</div>
                <div style="font-size:.75rem;color:var(--text-secondary);">${esc(sizeLabel(item.size))} (incluye ${esc(item.gift.name)})</div>
              </div>
            </div>`;
          } else {
            const typeLabel = item.type === "full" ? "Caja Sellada" : "Decant";
            infoHtml = `
            <div style="display:flex;align-items:center;gap:.5rem;">
              <img src="${esc(item.image)}" alt="${esc(item.name)}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;" loading="lazy" decoding="async" />
              <div>
                <div style="font-weight:600;font-size:.85rem;">${esc(item.name)}</div>
                <div style="font-size:.75rem;color:var(--text-secondary);">${typeLabel} ${esc(sizeLabel(item.size))} × ${item.qty}</div>
              </div>
            </div>`;
          }

          return `
          <div class="checkout-summary-item" style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--border-light);">
            ${infoHtml}
            <span style="font-weight:700;color:var(--gold-deep);white-space:nowrap;margin-left:1rem;">${formatPrice(item.price * item.qty)}</span>
          </div>`;
        })
        .join("");
    }

    if (totalEl) {
      totalEl.textContent = formatPrice(getCartTotal());
      renderBreakdown("checkoutBreakdown");
    }
  }

  /* ══════════════════════════════════════════════════════════════
     FILTERS — CATALOG
  ══════════════════════════════════════════════════════════════ */
  function updateCatalogFilterButtons() {
    const cat = activeFilters.category || "todos";
    document.querySelectorAll("#filtersCategory .filter-btn").forEach((btn) => {
      const active = cat === btn.dataset.filter;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    const genderVal = activeFilters.gender || null;
    document.querySelectorAll("#filtersGender .filter-btn").forEach((btn) => {
      const active = genderVal === btn.dataset.filter;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("#filtersOffcanvas [data-oc-gender]").forEach((btn) => {
      const active = genderVal === btn.dataset.ocGender;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    const searchEl = $("catalogSearch");
    if (searchEl) {
      const clearBtn = $("searchClear");
      if (clearBtn) clearBtn.style.display = searchEl.value ? "inline-flex" : "none";
    }
  }

  const filtersCat = $("filtersCategory");
  if (filtersCat) {
    filtersCat.addEventListener("click", function (e) {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      activeFilters.category = btn.dataset.filter;
      activeFilters.gender = null;
      updateCatalogFilterButtons();
      renderCatalog();
    });
  }

  const filtersGender = $("filtersGender");
  if (filtersGender) {
    filtersGender.addEventListener("click", function (e) {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      const val = btn.dataset.filter;
      activeFilters.gender = activeFilters.gender === val ? null : val;
      updateCatalogFilterButtons();
      renderCatalog();
    });
  }

  /* Panel offcanvas de filtros (móvil): abrir, aplicar y cerrar */
  const btnFiltersMobile = $("btnFiltersMobile");
  const filtersOffcanvas = $("filtersOffcanvas");
  const filtersBackdrop = $("filtersBackdrop");
  /* Reubicar a <body> igual que el nav drawer (ver openNav): al vivir
     dentro de #page-catalogo, un ancestro con transform/filter (la
     animacion de transicion entre paginas, .page.active) crea un nuevo
     containing block para este position:fixed -- deja de posicionarse
     contra el viewport y pasa a contar como overflow real del documento
     mientras esa animacion esta en curso (bug real de overflow
     horizontal, mismo motivo por el que el drawer ya se saco de ahi). */
  if (filtersOffcanvas && filtersOffcanvas.parentElement !== document.body) document.body.appendChild(filtersOffcanvas);
  if (filtersBackdrop && filtersBackdrop.parentElement !== document.body) document.body.appendChild(filtersBackdrop);
  function openFiltersPanel() {
    if (!filtersOffcanvas) return;
    filtersOffcanvas.classList.add("open");
    filtersBackdrop.classList.add("show");
    document.body.classList.add("no-scroll");
    if (btnFiltersMobile) btnFiltersMobile.setAttribute("aria-expanded", "true");
  }
  function closeFiltersPanel() {
    if (!filtersOffcanvas) return;
    filtersOffcanvas.classList.remove("open");
    filtersBackdrop.classList.remove("show");
    document.body.classList.remove("no-scroll");
    if (btnFiltersMobile) btnFiltersMobile.setAttribute("aria-expanded", "false");
  }
  if (btnFiltersMobile) btnFiltersMobile.addEventListener("click", openFiltersPanel);
  const filtersCloseBtn = $("filtersCloseBtn");
  if (filtersCloseBtn) filtersCloseBtn.addEventListener("click", closeFiltersPanel);
  const filtersApplyBtn = $("filtersApplyBtn");
  if (filtersApplyBtn) filtersApplyBtn.addEventListener("click", closeFiltersPanel);
  if (filtersBackdrop) filtersBackdrop.addEventListener("click", closeFiltersPanel);
  if (filtersOffcanvas) {
    filtersOffcanvas.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      activeFilters.category = btn.dataset.cat;
      activeFilters.gender = null;
      updateCatalogFilterButtons();
      renderCatalog();
    });
    filtersOffcanvas.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-oc-gender]");
      if (!btn) return;
      const val = btn.dataset.ocGender;
      activeFilters.gender = activeFilters.gender === val ? null : val;
      updateCatalogFilterButtons();
      renderCatalog();
    });
  }

  // Desktop filter pills (cat-pill--cat) click handler
  const catalogGenderGroup = $("catalogGenderGroup");
  if (catalogGenderGroup) {
    catalogGenderGroup.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      activeFilters.category = btn.dataset.cat;
      activeFilters.gender = null;
      updateCatalogFilterButtons();
      renderCatalog();
    });
  }

  /* Búsqueda en tiempo real (debounce 200ms) */
  const searchEl = $("catalogSearch");
  if (searchEl) {
    searchEl.addEventListener("input", function () {
      clearTimeout(window.__searchTimer);
      searchTerm = this.value;
      updateCatalogFilterButtons();
      window.__searchTimer = setTimeout(renderCatalog, 200);
    });
    searchEl.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        this.value = "";
        searchTerm = "";
        updateCatalogFilterButtons();
        renderCatalog();
        this.blur();
      }
    });
    const clearBtn = $("searchClear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        searchEl.value = "";
        searchTerm = "";
        updateCatalogFilterButtons();
        renderCatalog();
        searchEl.focus();
      });
    }
  }

  /* (Los chips de filtro rápido se eliminaron en el rediseño:
     la barra de píldoras de #filtersCategory los reemplaza.) */

  /* ══════════════════════════════════════════════════════════════
     FILTERS — PROMOS
  ══════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════
     GLOBAL CLICK DELEGATION (cards, add buttons)
  ══════════════════════════════════════════════════════════════ */
  document.addEventListener("click", function (e) {
    /* Product card body (not a button) — opens product modal */
    const card = e.target.closest(".product-card");
    if (card && !e.target.closest("button")) {
      const id = parseInt(card.dataset.productId, 10);
      if (id) openModal(id);
      return;
    }

    /* "Ver y Comprar" button on product card */
    const addBtn = e.target.closest(".btn-add[data-add-id]");
    if (addBtn) {
      e.stopPropagation();
      const id = parseInt(addBtn.dataset.addId, 10);
      if (id) openModal(id);
      return;
    }
  });

  /* ══════════════════════════════════════════════════════════════
     WHATSAPP CHECKOUT
  ══════════════════════════════════════════════════════════════ */
  /* Método de pago seleccionado en checkout: "whatsapp" o "card" */
  let selectedPayMethod = "whatsapp";

  function buildOrderMessage() {
    const nombre = $("chNombre")?.value.trim() ?? "";
    const apellido = $("chApellido")?.value.trim() ?? "";
    const telefono = $("chTelefono")?.value.trim() ?? "";
    const dni = $("chDNI")?.value.trim() ?? "";
    const direccion = $("chDireccion")?.value.trim() ?? "";
    const distrito = $("chDistrito")?.value.trim() ?? "";
    const referencia = $("chReferencia")?.value.trim() ?? "";

    let mensaje = `🛍️ *NUEVO PEDIDO – FRAGRANCE OBSESSION* 🛍️\n\n`;
    // Cabecera según el método de pago elegido
    if (selectedPayMethod === "card") {
      mensaje += `💳 *PAGO CON TARJETA (Mercado Pago)*\n`;
      mensaje += `➡️ Envíame el link de pago para completar mi compra\n\n`;
    } else {
      mensaje += `📲 *PAGO POR YAPE / PLIN*\n\n`;
    }
    mensaje += `👤 *Cliente:* ${nombre} ${apellido}\n`;
    mensaje += `📞 *Teléfono:* ${telefono}\n`;
    if (dni) mensaje += `🪪 *DNI:* ${dni}\n`;
    mensaje += `📍 *Dirección:* ${direccion}\n🏙️ *Distrito:* ${distrito}\n`;
    if (referencia) mensaje += `📝 *Referencia:* ${referencia}\n`;
    mensaje += `\n📦 *PRODUCTOS:*\n`;

    cart.forEach((item) => {
      const szTxt = isPremiumSize(item.size)
        ? sizeLabel(item.size)
        : (item.type === "full" ? "Frasco" : item.type === "decant" ? "Decant" : "Pack") + " " + sizeLabel(item.size);
      mensaje += `\n  ✦ ${item.name} (${szTxt})\n`;
      if (item.isPack && item.includedProducts && item.includedProducts.length > 0) {
        const lista = item.includedProducts.map((p) => `      • ${p.name}`).join("\n");
        mensaje += `${lista}\n`;
        if (item.gift) {
          mensaje += `      🎁 *Regalo:* ${item.gift.name} (${item.gift.size})\n`;
        }
      } else if (item.gift) {
        mensaje += `      🎁 *Regalo:* ${item.gift.name}\n`;
      }
      mensaje += `  Cantidad: ${item.qty} | Precio: ${formatPrice(item.price * item.qty)}\n`;
    });

    const d = calcularDescuentos(cart);
    if (d.descuentoTotal > 0) {
      mensaje += `\n🏷️ *DESCUENTOS APLICADOS:*\n`;
      if (d.detalleCantidad) {
        mensaje += `  ✦ ${d.detalleCantidad.pct}% por ${d.detalleCantidad.cant} decants: −${formatPrice(d.detalleCantidad.monto)}\n`;
      }
      d.detalleMarcas.forEach((m) => {
        mensaje += `  ✦ ${m.pct}% en ${m.marca} (${m.cant} ítems): −${formatPrice(m.monto)}\n`;
      });
    }
    mensaje += `\n🚚 *Envío:* ${d.aplicaEnvioGratis ? "GRATIS" : "A coordinar (Lima Metropolitana)"}\n`;
    if (d.vialGratisAgregado) {
      mensaje += `🎁 *Vial de regalo incluido (S/ 0.00)*\n`;
    }
    mensaje += `\n💰 *TOTAL: ${formatPrice(d.subtotalFinal)}*\n`;
    mensaje += `✅ ¡Gracias por tu pedido! Quedo atento para coordinar el envío. 🙌`;
    return mensaje;
  }

  // Punto único de confirmación: arma el mensaje según el método elegido
  // y lo envía al WhatsApp del vendedor.
  function confirmarCompra() {
    const nombre = $("chNombre")?.value.trim() ?? "";
    const apellido = $("chApellido")?.value.trim() ?? "";
    const telefono = $("chTelefono")?.value.trim() ?? "";
    const direccion = $("chDireccion")?.value.trim() ?? "";
    const distrito = $("chDistrito")?.value.trim() ?? "";

    if (!nombre || !apellido || !telefono || !direccion || !distrito) {
      showToast("⚠️ Completa todos los campos obligatorios");
      return;
    }
    if (!/^9\d{8}$/.test(telefono)) {
      showToast("⚠️ Ingresa un teléfono válido (9 dígitos, ej. 999999999)");
      return;
    }
    if (cart.length === 0) {
      showToast("⚠️ El carrito está vacío");
      return;
    }

    // Segunda defensa (la primera es al cargar la página): si un producto
    // pasó a "Próximamente" o cambió de precio MIENTRAS la pestaña seguía
    // abierta (sin recarga de por medio), no debe poder confirmarse el
    // pedido con ese ítem. Misma fuente de verdad que al cargar el carrito.
    const sanitized = sanitizeCartAvailability(cart);
    if (sanitized.removed > 0) {
      cart = sanitized.items;
      saveCart();
      updateCartUI();
      showToast(
        sanitized.removed === 1
          ? "⚠️ Un producto de tu pedido ya no está disponible y fue retirado. Revisa tu carrito."
          : `⚠️ ${sanitized.removed} productos de tu pedido ya no están disponibles y fueron retirados. Revisa tu carrito.`,
      );
      return;
    }

    const mensaje = buildOrderMessage();
    const dni = $("chDNI")?.value.trim() ?? "";
    const referencia = $("chReferencia")?.value.trim() ?? "";
    const guardarPedido = () => {
      saveOrderRecord({ nombre, apellido, telefono, dni, direccion, distrito, referencia });
      track("purchase", {
        transaction_id: "T-" + Date.now(),
        currency: "PEN",
        value: getCartTotal(),
        items: cart.map((it) => ({ item_id: it.productId, item_name: it.name, price: it.price, quantity: it.qty })),
      });
    };

    // Método Tarjeta: abre SOLO Mercado Pago (una ventana). Si no hay link
    // real configurado, no se abre nada: se informa al cliente y se corta.
    if (selectedPayMethod === "card") {
      if (!MERCADOPAGO_LINK) {
        showToast("⚠️ Método de pago no disponible");
        return;
      }
      const link = MERCADOPAGO_LINK + (MERCADOPAGO_LINK.includes("?") ? "&" : "?") + "description=" + encodeURIComponent("Pedido FRAGRANCE OBSESSION");
      guardarPedido();
      showToast("🔒 Redirigiendo a pasarela segura...");
      const winMp = window.open(link, "_blank");
      if (!winMp) location.href = link; // popup bloqueado → navegación directa
      else setTimeout(() => { if (currentPage === "checkout") location.href = "gracias.html"; }, 1600);
      return;
    }

    // Método WhatsApp: abre SOLO WhatsApp (una ventana), nunca dos.
    guardarPedido();
    notifyOrderSent();
    showToast("📲 Redirigiendo a WhatsApp...");
    const urlWa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    const winWa = window.open(urlWa, "_blank");
    if (!winWa) location.href = urlWa; // popup bloqueado → navegación directa
    else setTimeout(() => { if (currentPage === "checkout") location.href = "gracias.html"; }, 1600);
  }
  window.confirmarCompra = confirmarCompra;
  // Retrocompatibilidad
  window.confirmarWhatsApp = confirmarCompra;

  // Selector visual del método de pago (Yape/Plin por WhatsApp vs Tarjeta)
  function setupPayMethods() {
    const grid = $("payMethods");
    if (!grid) return;

    // Si no hay link real de Mercado Pago configurado, la opción por tarjeta
    // se deshabilita visualmente (sin eliminar el HTML) y se fuerza WhatsApp.
    const cardBtn = grid.querySelector('[data-pay="card"]');
    if (cardBtn && !MERCADOPAGO_LINK) {
      cardBtn.classList.add("is-disabled");
      cardBtn.setAttribute("aria-disabled", "true");
      if (selectedPayMethod === "card") {
        selectedPayMethod = "whatsapp";
        cardBtn.setAttribute("aria-checked", "false");
        const waBtn = grid.querySelector('[data-pay="whatsapp"]');
        if (waBtn) {
          waBtn.classList.add("active");
          waBtn.setAttribute("aria-checked", "true");
        }
        const confirmBtn = $("payConfirmBtn");
        if (confirmBtn) {
          confirmBtn.innerHTML = `<i class="fab fa-whatsapp" aria-hidden="true"></i><span>Confirmar Pedido</span>`;
        }
        const mpNote = $("mpNote");
        if (mpNote) mpNote.style.display = "none";
      }
    }

    grid.addEventListener("click", function (e) {
      const btn = e.target.closest(".pay-method");
      if (!btn) return;
      if (btn.classList.contains("is-disabled")) return;
      selectedPayMethod = btn.dataset.pay;
      grid.querySelectorAll(".pay-method").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("active", active);
        b.setAttribute("aria-checked", String(active));
      });
      const confirmBtn = $("payConfirmBtn");
      if (confirmBtn) {
        confirmBtn.innerHTML = selectedPayMethod === "card"
          ? `<i class="fa-solid fa-credit-card" aria-hidden="true"></i><span>Pagar con Tarjeta</span>`
          : `<i class="fab fa-whatsapp" aria-hidden="true"></i><span>Confirmar Pedido</span>`;
      }
      const mpNote = $("mpNote");
      if (mpNote) mpNote.style.display = selectedPayMethod === "card" ? "flex" : "none";
    });
  }
  setupPayMethods();

  // Guarda el pedido en localStorage (paco_pedidos) para el panel admin.
  function saveOrderRecord(datos) {
    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const fecha = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const productos = cart.map((item) => ({
        nombre: item.name,
        cantidad: item.qty,
        precio: item.price,
        size: item.size || "",
      }));
      const pedido = {
        id: "pedido-" + stamp,
        fecha,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono,
        dni: datos.dni,
        direccion: datos.direccion,
        distrito: datos.distrito,
        referencia: datos.referencia,
        productos,
        total: getCartTotal(),
        estado: "Pendiente",
      };
      let arr = [];
      try { arr = JSON.parse(localStorage.getItem("fo_pedidos")) || JSON.parse(localStorage.getItem("paco_pedidos")) || []; } catch (e) { arr = []; }
      if (!Array.isArray(arr)) arr = [];
      arr.unshift(pedido);
      localStorage.setItem("fo_pedidos", JSON.stringify(arr));
    } catch (e) { /* almacenamiento no disponible */ }
  }

  // Notificación del navegador tras enviar el pedido. Pide permiso en la
  // primera compra exitosa; en las siguientes muestra la notificación si está concedido.
  function notifyOrderSent() {
    if (!("Notification" in window)) return;
    const show = () => {
      try {
        new Notification("FRAGRANCE OBSESSION", {
          body: "✅ Pedido enviado a WhatsApp. Te contactaremos pronto.",
          icon: "logo.webp",
          badge: "logo.webp",
        });
      } catch (e) { /* algunos navegadores requieren SW para notificar */ }
    };
    if (Notification.permission === "granted") {
      show();
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => { if (p === "granted") show(); });
    }
  }

  /* ══════════════════════════════════════════════════════════════
     SCROLL REVEAL
  ══════════════════════════════════════════════════════════════ */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
  );

  function observeRevealElements() {
    document.querySelectorAll(".reveal-item:not(.visible)").forEach((el) => {
      revealObserver.observe(el);
    });
    hydrateLoadedImages();
    hydrateLoadedImagesDelayed();
  }
  // Red de seguridad para skeletons: marca como cargadas las imágenes que ya
  // estaban completas en caché antes de adjuntar el handler onload inline.
  function hydrateLoadedImages() {
    document.querySelectorAll(".img-wrapper img:not(.img-loaded), .promo-img:not(.img-loaded), .pill-bg img:not(.img-loaded)").forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add("img-loaded");
        const wrap = img.closest(".img-wrapper");
        if (wrap) wrap.classList.add("skeleton-done");
      }
    });
  }
  // Segunda pasada: imágenes que se completaron entre el primer check y ahora.
  // Resuelve el race condition con loading="lazy" + caché del navegador.
  function hydrateLoadedImagesDelayed() {
    requestAnimationFrame(() => {
      document.querySelectorAll(".img-wrapper img:not(.img-loaded), .promo-img:not(.img-loaded), .pill-bg img:not(.img-loaded)").forEach((img) => {
        if (img.complete && img.naturalWidth > 0) {
          img.classList.add("img-loaded");
          const wrap = img.closest(".img-wrapper");
          if (wrap) wrap.classList.add("skeleton-done");
        }
      });
    });
  }

  /* ── Fix definitivo scroll de rueda en modales (ciclo 2026) ──
     Intercepta wheel en fase capture: la rueda sobre el modal NUNCA
     llega al fondo. Hace el scroll manual sobre el contenedor interno
     scrolleable (.modal-body / .pack-product-grid / .info-modal__content)
     o sobre el propio .modal (desktop) cuando desborda. */
  document.addEventListener(
    "wheel",
    function (e) {
      if (!document.body.classList.contains("modal-open")) return;
      const modal = e.target.closest ? e.target.closest(".modal") : null;
      if (!modal) return;
      if (e.cancelable) e.preventDefault();
      const under = e.target.closest ? e.target.closest(".modal-body, .pack-product-grid, .info-modal__content") : null;
      let scroller = null;
      if (under && under.scrollHeight > under.clientHeight + 1) scroller = under;
      else if (modal.scrollHeight > modal.clientHeight + 1) scroller = modal;
      if (!scroller) return;
      const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * scroller.clientHeight : e.deltaY;
      scroller.scrollTop += step;
    },
    { passive: false, capture: true }
  );

  /* ══════════════════════════════════════════════════════════════
     GLOBAL EXPOSE (for HTML onclick attributes)
  ══════════════════════════════════════════════════════════════ */
  window.closeCart = closeCart;
  window.closeModal = closeModal;
  window.closeInfoModal = closeInfoModal;
  window.goToCheckout = goToCheckout;
  window.openModal = openModal;
  // Hook de pruebas (QA/E2E): no altera la lógica de la app.
  window.__FO_TEST = {
    addToCart: addToCart,
    clearCart: function () { cart = []; saveCart(); updateCartUI(); },
    sanitizeCartAvailability: sanitizeCartAvailability,
  };

  /* ══════════════════════════════════════════════════════════════
     EVENT LISTENERS — UI
  ══════════════════════════════════════════════════════════════ */
  const btnCart = $("btnCart");
  if (btnCart) btnCart.addEventListener("click", openCart);

  const cartOverlay = $("cartOverlay");
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);

  const cartClose = document.querySelector(".cart-close");
  if (cartClose) cartClose.addEventListener("click", closeCart);

  /* ══════════════════════════════════════════════════════════════
     MENÚ MÓVIL — drawer lateral (antes: dropdown simple sin backdrop,
     sin focus trap, sin scroll lock). Mismo patrón que openCart/openModal:
     modal-open + overflow:hidden + focusModal/restoreFocus/trapTabFocus.
  ══════════════════════════════════════════════════════════════ */
  const hamburger = $("hamburger");
  const navEl = $("nav");
  const navMount = $("navMount");
  const navBackdrop = $("navBackdrop");
  const navClose = $("navClose");

  // `backdrop-filter` vuelve al header un containing block para descendientes
  // fixed en algunos navegadores móviles. El drawer debe vivir junto al
  // backdrop, directamente bajo body, mientras se usa como overlay.
  const navMediaQuery = window.matchMedia("(max-width: 900px)");
  function placeNavForViewport() {
    if (!navEl || !navMount) return;
    if (navMediaQuery.matches) {
      if (navEl.parentElement !== document.body) document.body.appendChild(navEl);
      return;
    }
    closeNav();
    if (navEl.parentElement === document.body) navMount.after(navEl);
  }
  placeNavForViewport();
  if (navMediaQuery.addEventListener) navMediaQuery.addEventListener("change", placeNavForViewport);
  else navMediaQuery.addListener(placeNavForViewport);

  function openNav() {
    if (!navEl) return;
    navEl.classList.add("mounted");
    if (navBackdrop) navBackdrop.classList.add("active");
    if (hamburger) hamburger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");
    if (window.__modalScrollY === undefined) window.__modalScrollY = window.scrollY;
    requestAnimationFrame(() => {
      if (hamburger && hamburger.getAttribute("aria-expanded") !== "true") return;
      navEl.classList.add("open");
      focusModal(navEl, hamburger);
    });
  }
  function closeNav({ restoreFocus: shouldRestoreFocus = true, restoreScroll = true } = {}) {
    if (!navEl) return;
    // No usar solo .open como guardia: navigateTo() era capaz de retirar esa
    // clase mientras el backdrop y el scroll lock seguían activos.
    const wasOpen = navEl.classList.contains("open")
      || (navBackdrop && navBackdrop.classList.contains("active"))
      || (hamburger && hamburger.getAttribute("aria-expanded") === "true");
    if (!wasOpen) return;
    navEl.classList.remove("open");
    if (navBackdrop) navBackdrop.classList.remove("active");
    if (hamburger) hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");
    if (restoreScroll && window.__modalScrollY !== undefined) {
      window.scrollTo(0, window.__modalScrollY);
    }
    window.__modalScrollY = undefined;
    if (shouldRestoreFocus) restoreFocus();
    window.setTimeout(() => {
      if (!navEl.classList.contains("open")) navEl.classList.remove("mounted");
    }, 350);
  }
  if (hamburger) {
    hamburger.addEventListener("click", () => {
      if (hamburger.getAttribute("aria-expanded") === "true") closeNav(); else openNav();
    });
  }
  if (navClose) navClose.addEventListener("click", closeNav);
  if (navBackdrop) navBackdrop.addEventListener("click", closeNav);
  if (navEl) {
    navEl.addEventListener("keydown", (e) => trapTabFocus(navEl, e));
    // Los links de navegación ya llaman a navigateTo() vía onclick; solo
    // falta cerrar el drawer al elegir uno (en desktop .nav no es drawer,
    // closeNav() es un no-op porque nunca tuvo la clase "open").
    navEl.querySelectorAll(".nav-links a").forEach((a) => a.addEventListener("click", closeNav));
  }
  window.closeNav = closeNav;

  window.addEventListener("scroll", () => {
    const header = $("header");
    if (header) header.classList.toggle("scrolled", window.scrollY > 50);
    const btt = $("backToTop");
    if (btt) btt.classList.toggle("visible", window.scrollY > 500);
  }, { passive: true });

  /* ══════════════════════════════════════════════════════════════
     BOTÓN "VOLVER ARRIBA"
  ══════════════════════════════════════════════════════════════ */
  function setupBackToTop() {
    const btt = $("backToTop");
    if (!btt) return;
    btt.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    // estado inicial correcto (p. ej. si se recarga con scroll)
    btt.classList.toggle("visible", window.scrollY > 500);
  }

  /* ══════════════════════════════════════════════════════════════
     TOGGLE DE TEMA (claro / oscuro) — persistente en localStorage
  ══════════════════════════════════════════════════════════════ */
  function updateThemeColor() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#1A120B" : "#FBF7F0");
  }
  function setupThemeToggle() {
    const btn = $("themeToggle");
    const lightOpt = $("navThemeLight");
    const darkOpt = $("navThemeDark");
    if (!btn && !lightOpt && !darkOpt) return;
    let usedOnce = false;

    // El tema es una sola fuente de verdad (document.documentElement
    // data-theme); el icono de desktop y el segmented control del drawer
    // móvil son dos vistas del mismo estado, no dos controles separados.
    function syncUI() {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      if (btn) {
        btn.setAttribute("aria-pressed", String(dark));
        btn.setAttribute("data-tooltip", dark ? "Modo claro" : "Modo oscuro");
      }
      if (lightOpt) lightOpt.setAttribute("aria-checked", String(!dark));
      if (darkOpt) darkOpt.setAttribute("aria-checked", String(dark));
      updateThemeColor();
    }
    function setTheme(next) {
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("fo_theme", next); } catch (e) { /* storage no disponible */ }
      if (btn) {
        btn.classList.remove("rotating");
        void btn.offsetWidth;
        btn.classList.add("rotating");
        if (!usedOnce) {
          usedOnce = true;
          btn.classList.add("pulse");
          setTimeout(() => btn.classList.remove("pulse"), 650);
        }
      }
      syncUI();
    }
    syncUI();

    if (btn) {
      btn.addEventListener("click", () => {
        const dark = document.documentElement.getAttribute("data-theme") === "dark";
        setTheme(dark ? "light" : "dark");
      });
    }
    if (lightOpt) lightOpt.addEventListener("click", () => setTheme("light"));
    if (darkOpt) darkOpt.addEventListener("click", () => setTheme("dark"));
  }

  /* ══════════════════════════════════════════════════════════════
     PARALLAX SUTIL DEL HERO (solo desktop, respeta reduced-motion)
  ══════════════════════════════════════════════════════════════ */
  function setupHeroParallax() {
    const video = document.querySelector(".hero-video");
    if (!video) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let ticking = false;
    function update() {
      ticking = false;
      if (!desktop.matches || reduce.matches) {
        video.style.removeProperty("--hero-parallax");
        return;
      }
      const y = Math.min(window.scrollY * 0.1, 45); // cap 45px (gap-free con scale)
      video.style.setProperty("--hero-parallax", -y + "px");
    }
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    update();
  }

  /* ══════════════════════════════════════════════════════════════
     RUTEO POR HASH (deep-links: #catalogo, #promos)
  ══════════════════════════════════════════════════════════════ */
  function applyHashRoute() {
    const hash = (window.location.hash || "").replace("#", "");
    if (VALID_PAGES.has(hash)) navigateTo(hash);
  }

  /* ══════════════════════════════════════════════════════════════
     VALIDACIÓN EN TIEMPO REAL — CHECKOUT
     (capa visual aditiva; NO altera confirmarWhatsApp)
  ══════════════════════════════════════════════════════════════ */
  function setupCheckoutValidation() {
    const rules = {
      chNombre: (v) => v.trim().length >= 3,
      chApellido: (v) => v.trim().length >= 3,
      chTelefono: (v) => /^9\d{8}$/.test(v.trim()),
      chDNI: (v) => !v.trim() || /^\d{8}$/.test(v.trim()) || /^[A-Za-z0-9]{9,12}$/.test(v.trim()),
      chDireccion: (v) => v.trim().length >= 3,
      chDistrito: (v) => v.trim().length >= 3,
    };
    const ids = Object.keys(rules);
    const fields = ids.map((id) => $(id)).filter(Boolean);
    if (fields.length === 0) return;
    const confirmBtn = document.querySelector(".btn-whatsapp");

    function validateField(input, showState) {
      const valid = rules[input.id](input.value);
      const group = input.closest(".form-group");
      if (group && showState) {
        group.classList.toggle("field-valid", valid);
        group.classList.toggle("field-invalid", !valid);
      }
      return valid;
    }
    function allValid() {
      return ids.every((id) => {
        const el = $(id);
        return el && rules[id](el.value);
      });
    }
    function refreshButton() {
      if (!confirmBtn) return;
      const ok = allValid();
      confirmBtn.classList.toggle("is-disabled", !ok);
      confirmBtn.setAttribute("aria-disabled", String(!ok));
    }

    fields.forEach((input) => {
      // Asegura contenedor de ícono de estado
      const group = input.closest(".form-group");
      if (group && !group.querySelector(".field-status")) {
        const span = document.createElement("span");
        span.className = "field-status";
        span.setAttribute("aria-hidden", "true");
        group.appendChild(span);
      }
      input.addEventListener("input", () => {
        // mientras escribe: solo marca verde si ya es válido (evita rojo prematuro)
        const valid = rules[input.id](input.value);
        const g = input.closest(".form-group");
        if (g) {
          if (valid) {
            g.classList.add("field-valid");
            g.classList.remove("field-invalid");
          } else {
            g.classList.remove("field-valid");
          }
        }
        refreshButton();
      });
      input.addEventListener("blur", () => {
        if (input.value.trim() !== "") validateField(input, true);
        refreshButton();
      });
    });
    refreshButton();
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeCart();
      closeFiltersPanel();
      closeNav();
    }
  });

  /* ══════════════════════════════════════════════════════════════
     EFECTOS 3D / MICROINTERACCIONES
  ══════════════════════════════════════════════════════════════ */
  /* Recomendador inteligente: clasifica por las notas reales del perfume */
  const NOTE_KEYWORDS = {
    fresco: ["limón", "limon", "bergamota", "menta", "acuátic", "acuatic", "marin", "pomelo", "mandarina", "cítric", "citric", "neroli", "verde", "hoja"],
    dulce: ["vainilla", "caramelo", "miel", "pralin", "chocolate", "toffee", "coco", "dátil", "datil", "azúcar", "frutas", "fruto", "cereza", "mango"],
    amaderado: ["cedro", "sándalo", "sandalo", "oud", "pachulí", "pachuli", "cuero", "canela", "pimienta", "tabaco", "ámbar", "ambar", "incienso", "vetiver", "haba tonka"],
    floral: ["rosa", "jazmín", "jazmin", "lavanda", "iris", "violeta", "azahar", "flor", "tuberosa", "ylang"],
  };
  function classifyFamilies(p) {
    const notes = ((p.notes || "") + " " + (p.description || "")).toLowerCase();
    const fams = new Set();
    for (const fam in NOTE_KEYWORDS) {
      if (NOTE_KEYWORDS[fam].some((k) => notes.includes(k))) fams.add(fam);
    }
    return fams;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /* Cuestionario interactivo de 4 pasos */
  const QUIZ_STEPS = [
    { key: "genero", q: "¿Para quién es?", opts: [{ v: "masculino", l: "Hombre" }, { v: "femenino", l: "Mujer" }, { v: "unisex", l: "Unisex" }] },
    { key: "ocasion", q: "¿Para qué ocasión?", opts: [{ v: "diario", l: "Uso diario" }, { v: "trabajo", l: "Trabajo / Oficina" }, { v: "noche", l: "Noche / Fiestas" }, { v: "cita", l: "Citas románticas" }] },
    { key: "tipo", q: "¿Qué tipo de fragancia prefieres?", opts: [{ v: "fresco", l: "Fresca / Cítrica" }, { v: "dulce", l: "Dulce / Golosa" }, { v: "amaderado", l: "Amaderada / Especiada" }, { v: "floral", l: "Floral" }] },
    { key: "intensidad", q: "¿Qué intensidad buscas?", opts: [{ v: "ligera", l: "Ligera / Discreta" }, { v: "moderada", l: "Moderada / Versátil" }, { v: "intensa", l: "Intensa / Duradera" }] },
  ];
  const OCA_FAM = { diario: ["fresco", "floral"], trabajo: ["fresco", "amaderado"], noche: ["amaderado", "dulce"], cita: ["dulce", "floral", "amaderado"] };
  const INT_FAM = { ligera: ["fresco", "floral"], moderada: ["fresco", "floral", "dulce", "amaderado"], intensa: ["amaderado", "dulce"] };
  let quizIndex = 0;
  const quizAnswers = {};

  function renderQuizProgress() {
    const p = $("quizProgress");
    if (!p) return;
    const done = quizAnswers.__done;
    p.innerHTML = QUIZ_STEPS.map((_, i) =>
      `<span class="quiz-dot${(done || i <= quizIndex) ? " filled" : ""}${(!done && i === quizIndex) ? " current" : ""}"></span>`,
    ).join("");
  }
  function renderQuizStep() {
    const stepEl = $("quizStep");
    const grid = $("recoGrid");
    const restart = $("quizRestart");
    if (!stepEl) return;
    quizAnswers.__done = false;
    if (grid) grid.innerHTML = "";
    if (restart) restart.style.display = "none";
    renderQuizProgress();
    const step = QUIZ_STEPS[quizIndex];
    stepEl.classList.remove("quiz-in"); void stepEl.offsetWidth; stepEl.classList.add("quiz-in");
    stepEl.innerHTML =
      `<h3 class="quiz-q">${esc(step.q)}</h3>` +
      `<div class="quiz-opts">` +
      step.opts.map((o) => `<button class="quiz-opt" data-v="${esc(o.v)}" type="button">${esc(o.l)}</button>`).join("") +
      `</div>`;
  }
  function answerQuiz(v) {
    const step = QUIZ_STEPS[quizIndex];
    quizAnswers[step.key] = v;
    const btn = $("quizStep").querySelector('.quiz-opt[data-v="' + v + '"]');
    if (btn) btn.classList.add("selected");
    setTimeout(() => {
      if (quizIndex < QUIZ_STEPS.length - 1) { quizIndex++; renderQuizStep(); }
      else showQuizResults();
    }, 340);
  }
  function scoreProduct(p, a) {
    const fams = classifyFamilies(p);
    let s = 0;
    if (a.tipo && fams.has(a.tipo)) s += 2;
    if (a.ocasion && (OCA_FAM[a.ocasion] || []).some((f) => fams.has(f))) s += 1;
    if (a.intensidad && (INT_FAM[a.intensidad] || []).some((f) => fams.has(f))) s += 1;
    if (p.featured) s += 1;
    return s;
  }
  function showQuizResults() {
    quizAnswers.__done = true;
    renderQuizProgress();
    const stepEl = $("quizStep");
    const grid = $("recoGrid");
    const restart = $("quizRestart");
    const a = quizAnswers;
    const genderMap = { masculino: ["masculino", "unisex"], femenino: ["femenino", "unisex"], unisex: ["unisex"] };
    const allow = genderMap[a.genero] || ["masculino", "femenino", "unisex"];
    let pool = products.filter((p) => !p.tester && Object.keys(p.decantSizes || {}).length && allow.includes(p.gender));
    if (pool.length < 6) pool = products.filter((p) => !p.tester && Object.keys(p.decantSizes || {}).length);
    const ranked = shuffle(pool).map((p) => ({ p, s: scoreProduct(p, a) })).sort((x, y) => y.s - x.s);
    const items = ranked.slice(0, 6).map((r) => r.p);
    if (stepEl) stepEl.innerHTML = `<h3 class="quiz-q quiz-result-title">Tus fragancias ideales</h3>`;
    grid.classList.remove("reco-fade-in"); void grid.offsetWidth;
    grid.innerHTML = items.map((p, i) => {
      const sizes = Object.values(p.decantSizes || {});
      const min = sizes.length ? Math.min(...sizes) : null;
      const price = min ? `Desde ${formatPrice(min)}` : "Consultar";
      return `
        <div class="reco-card" data-product-id="${p.id}" role="button" tabindex="0" aria-label="Ver ${esc(p.name)}" style="animation-delay:${(i * 0.05).toFixed(2)}s">
          <div class="reco-img"><img src="${esc(p.cardImage)}" alt="${esc(p.name)}" loading="lazy" decoding="async" onerror="if(this.src!=='${PLACEHOLDER_IMG}'){this.src='${PLACEHOLDER_IMG}';}else{this.style.display='none';}" /></div>
          <div class="reco-info">
            <div class="reco-name">${esc(p.name)}</div>
            <div class="reco-brand">${esc(p.brand)}</div>
            <div class="reco-price">${price}</div>
          </div>
        </div>`;
    }).join("");
    grid.classList.add("reco-fade-in");
    if (restart) restart.style.display = "block";
  }
  function setupRecommender() {
    const stepEl = $("quizStep");
    if (!stepEl) return;
    stepEl.addEventListener("click", (e) => {
      const b = e.target.closest(".quiz-opt");
      if (b) answerQuiz(b.dataset.v);
    });
    const grid = $("recoGrid");
    const open = (el) => { const id = parseInt(el.dataset.productId, 10); if (id) openModal(id); };
    grid.addEventListener("click", (e) => { const c = e.target.closest(".reco-card"); if (c) open(c); });
    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const c = e.target.closest(".reco-card"); if (c) { e.preventDefault(); open(c); }
    });
    const rb = $("quizRestartBtn");
    if (rb) rb.addEventListener("click", () => { quizIndex = 0; Object.keys(quizAnswers).forEach((k) => delete quizAnswers[k]); renderQuizStep(); });
    renderQuizStep();
  }

  /* Carrusel de reseñas (flechas) */
  function setupReviewsCarousel() {
    const track = $("reviewsTrack");
    const prev = $("revPrev");
    const next = $("revNext");
    if (!track || !prev || !next) return;
    const step = () => {
      const card = track.querySelector(".review-card");
      return card ? card.getBoundingClientRect().width + 21 : 320;
    };
    function updateArrows() {
      const maxScroll = track.scrollWidth - track.clientWidth - 2;
      prev.hidden = track.scrollLeft <= 2;
      next.hidden = track.scrollLeft >= maxScroll;
    }
    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    track.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    updateArrows();
  }

  /* Deep-link de producto: ?producto=ID abre el modal */
  function applyProductRoute(skipHistory) {
    const id = new URLSearchParams(location.search).get("producto");
    if (id) {
      const pid = parseInt(id, 10);
      if (getProductById(pid)) openModal(pid, skipHistory !== false);
    }
  }

  /* Recordatorio de carrito abandonado (una vez por sesión) */
  function showCartReminder() {
    const t = $("toast");
    if (!t || cart.length === 0) return;
    const count = getCartCount();
    t.className = "toast toast-info toast-cart";
    t.innerHTML =
      `<span class="toast-emoji" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 8.5h13l1.2 12a1.8 1.8 0 0 1-1.8 2H6.1a1.8 1.8 0 0 1-1.8-2l1.2-12z"/><path d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5"/></svg></span>` +
      `<span class="toast-msg">Tienes ${count} producto${count > 1 ? "s" : ""} en tu carrito. ¿Finalizar tu pedido?</span>` +
      `<button class="toast-action" type="button">Ir al carrito</button>`;
    void t.offsetWidth;
    t.classList.add("show");
    const btn = t.querySelector(".toast-action");
    if (btn) btn.addEventListener("click", () => { t.classList.remove("show"); openCart(); });
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove("show"), 6500);
  }
  function maybeRemindCart() {
    try {
      if (cart.length > 0 && !sessionStorage.getItem("fo_cart_reminded")) {
        sessionStorage.setItem("fo_cart_reminded", "1");
        setTimeout(showCartReminder, 1600);
      }
    } catch (e) { /* sessionStorage no disponible */ }
  }

  /* En móvil no se descarga el video del hero: solo se muestra el poster */
  function setupHeroMobile() {
    const video = document.querySelector(".hero-video");
    if (!video) return;
    if (window.matchMedia("(max-width: 768px)").matches) {
      try {
        video.pause();
        video.removeAttribute("autoplay");
        // quita las fuentes para evitar la descarga del .mp4 en móvil
        video.querySelectorAll("source").forEach((s) => s.remove());
        video.removeAttribute("src");
        video.load();
      } catch (e) { /* noop */ }
    }
  }

  /* Botón flotante de WhatsApp (fade-in tras 1.5s) */
  /* Enlaces de redes desde config.js: elementos marcados con data-wa-link */
  function applyConfigLinks() {
    const wa = "https://wa.me/" + WHATSAPP_NUMBER;
    document.querySelectorAll("[data-wa-link]").forEach((a) => {
      if (a.hasAttribute("data-wa-text")) {
        a.href = wa + "?text=" + encodeURIComponent(a.dataset.waText);
      } else {
        a.href = wa;
      }
    });
  }

  /* Reseñas desde config.js (Social Proof) */
  function renderReviews() {
    const track = $("reviewsTrack");
    const reviews = Array.isArray(FO.REVIEWS) ? FO.REVIEWS : [];
    if (!track || !reviews.length) return;
    track.innerHTML = reviews
      .map((r) => {
        const n = Math.max(0, Math.min(5, parseInt(r.stars, 10) || 5));
        const initials = (r.name || "FO").replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
        return `<article class="review-card">
          <div class="review-stars" aria-label="${n} de 5 estrellas">${"★".repeat(n)}${"☆".repeat(5 - n)}</div>
          <p class="review-text">“${r.text}”</p>
          <div class="review-author">
            <span class="review-avatar" aria-hidden="true">${initials || "FO"}</span>
            <span class="review-meta"><strong>${r.name}</strong>${r.product ? `<span class="review-bought">${r.product}</span>` : ""}</span>
          </div>
        </article>`;
      })
      .join("");
  }

  /* Insignias de confianza (carrito y checkout) desde config.js */
  function renderTrustBadges() {
    const badges = Array.isArray(FO.TRUST_BADGES) ? FO.TRUST_BADGES : [];
    if (!badges.length) return;
    const html = badges
      .map((b) => `<span class="trust-badge"><i class="fa-solid ${b.icon || "fa-shield-halved"}" aria-hidden="true"></i>${b.label}</span>`)
      .join("");
    const checkout = $("trustBadgesCheckout");
    if (checkout) checkout.innerHTML = html;
    const cart = $("trustBadgesCart");
    if (cart) cart.innerHTML = html;
  }

  /* Contenido de los modales informativos del footer */
  const INFO_PAGES = {
    faq: {
      title: "Preguntas Frecuentes",
      html: `<h3>¿Cómo se extraen los decants?</h3>
        <p>Utilizamos <strong>extracción con jeringa</strong> desde el frasco original (no spray), lo que garantiza la pureza del perfume y evita la evaporación.</p>
        <h3>¿Cuánto dura un decant?</h3>
        <p>Depende del uso: un decant de 5 ml rinde aproximadamente 50-60 aplicaciones. Guarda tu vial en un lugar fresco y oscuro para conservarlo mejor.</p>
        <h3>¿Qué hago si mi perfume llega dañado?</h3>
        <p>Escríbenos por WhatsApp con fotos del paquete y lo reponemos sin costo. Queremos que tu experiencia sea impecable.</p>
        <h3>¿Puedo cambiar mi pedido después de confirmarlo?</h3>
        <p>Puedes modificarlo mientras no haya sido despachado (generalmente dentro de las primeras horas de confirmado).</p>`,
    },
    envios: {
      title: "Envíos y Despacho",
      html: `<h3>¿A dónde envían?</h3>
        <p>Realizamos <strong>envíos a todo el Perú</strong> con despacho en 1-2 días hábiles (Lima Metropolitana) y 2-4 días hábiles para provincia, según la cobertura del courier.</p>
        <h3>¿Cuánto cuesta el envío?</h3>
        <p>El costo se coordina por WhatsApp según tu distrito. <strong>Los pedidos desde S/ 199 tienen envío gratis.</strong></p>
        <h3>¿Cómo se empaquetan los pedidos?</h3>
        <p>Cada vial va sellado y protegido en empaque seguro, con tracking disponible para envíos a provincia.</p>`,
    },
    devoluciones: {
      title: "Devoluciones y Reembolsos",
      html: `<h3>Política de devolución</h3>
        <p>Si tu pedido llega dañado, incorrecto o con faltantes, contáctanos por WhatsApp dentro de las <strong>48 horas</strong> de recibido y lo resolveremos de inmediato: reemplazo o reembolso.</p>
        <h3>¿Puedo devolver un perfume abierto?</h3>
        <p>Por razones de higiene, los productos abiertos o usados no tienen cambio. Asegúrate de elegir bien: ¡para eso existen los decants de 2 ml!</p>
        <h3>¿Cuándo recibo mi reembolso?</h3>
        <p>Los reembolsos se procesan en un máximo de 7 días hábiles por el mismo medio de pago.</p>`,
    },
    terminos: {
      title: "Términos y Condiciones",
      html: `<h3>Uso del sitio</h3>
        <p>Al realizar un pedido confirmas que la información proporcionada es correcta y que aceptas la coordinación del pago y envío por WhatsApp.</p>
        <h3>Precios y disponibilidad</h3>
        <p>Los precios están en soles (S/) e incluyen IGV. Las promociones de descuento se aplican automáticamente en el carrito según las reglas publicadas.</p>
        <h3>Propiedad intelectual</h3>
        <p>Las marcas de perfumes mencionadas pertenecen a sus respectivos dueños. Vendemos decants (muestras) de fragancias originales.</p>`,
    },
    nosotros: {
      title: "Nosotros",
      html: `<p><strong>FRAGRANCE OBSESSION</strong> nació con una idea simple: que puedas disfrutar de las mejores fragancias del mundo sin tener que comprar un frasco completo.</p>
        <p>Seleccionamos cuidadosamente perfumes árabes, de diseñador y nicho, y los ofrecemos en decants premium con <strong>extracción con jeringa</strong> desde el frasco original.</p>
        <p>Más de 1,000 clientes en todo el Perú ya confían en nosotros. Somos una tienda peruana, con despacho en Lima Metropolitana y envíos a todo el país.</p>`,
    },
    beneficios: {
      title: "Beneficios por cantidad",
      html: `<p>Los descuentos se aplican automáticamente sobre decants elegibles de <strong>1 a 10 ml</strong>. Puedes combinar fragancias nicho y de diseñador.</p>
        <p><strong>2–5 decants:</strong> 5% · <strong>6–9:</strong> 10% · <strong>10 o más:</strong> 15%.</p>
        <p>Las presentaciones de 20 y 30 ml no participan en este beneficio. Los pedidos desde S/ 199 incluyen envío gratis y un vial de regalo.</p>`,
    },
  };

  /* Abre un modal informativo del footer (faq, envios, devoluciones, terminos, nosotros) */
  function openInfoModal(key) {
    const page = INFO_PAGES[key] || INFO_PAGES.faq;
    const overlay = $("infoModalOverlay");
    if (!overlay) return;
    const title = $("infoModalTitle");
    const body = $("infoModalBody");
    if (title) title.textContent = page.title;
    if (body) body.innerHTML = page.html;
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");
    if (window.__modalScrollY === undefined) window.__modalScrollY = window.scrollY;
    const modal = $("infoModal");
    if (modal) { lastFocusedEl = document.activeElement; modal.focus(); }
  }
  function closeInfoModal() {
    const overlay = $("infoModalOverlay");
    if (!overlay) return;
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");
    if (window.__modalScrollY !== undefined) {
      window.scrollTo(0, window.__modalScrollY);
      window.__modalScrollY = undefined;
    }
    restoreFocus();
  }

  /* Links del footer (modales informativos) */
  function setupFooterInfoLinks() {
    const wrap = $("footerInfoLinks");
    const links = FO.FOOTER_LINKS || {};
    if (!wrap) return;
    wrap.innerHTML = Object.keys(links)
      .map((label) => `<a role="button" tabindex="0" data-info-modal="${links[label]}">${label}</a>`)
      .join("");
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-info-modal]");
      if (trigger) openInfoModal(trigger.dataset.infoModal);
    });
    const overlay = $("infoModalOverlay");
    if (overlay) {
      overlay.addEventListener("click", (e) => { if (e.target === overlay) closeInfoModal(); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("active")) closeInfoModal();
      });
    }
  }

  function setupWhatsAppFab() {
    const fab = $("waFab");
    if (!fab) return;
    setTimeout(() => fab.classList.add("visible"), 1500);
  }

  /* Avisos de conexión (online / offline) */
  function setupConnectivityToasts() {
    window.addEventListener("offline", () =>
      showToast("📡 Sin conexión. Los productos ya visitados siguen disponibles.", "info"));
    window.addEventListener("online", () =>
      showToast("✅ Conexión restablecida.", "success"));
  }

  // Ripple dorado desde el punto de clic
  function setupRipple() {
    const SEL = ".btn, .btn-add, .btn-add-large, .btn-checkout, .btn-whatsapp, .btn-empty-action, .btn-outline-dark";
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(SEL);
      if (!btn) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const ink = document.createElement("span");
      ink.className = "ripple-ink";
      ink.style.width = ink.style.height = size + "px";
      ink.style.left = e.clientX - r.left - size / 2 + "px";
      ink.style.top = e.clientY - r.top - size / 2 + "px";
      btn.appendChild(ink);
      setTimeout(() => ink.remove(), 600);
    });
  }

  // Datos estructurados ItemList de los destacados (SEO)
  function injectItemList() {
    const featured = products.filter((p) => p.featured).slice(0, 12);
    if (!featured.length) return;
    const data = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Fragancias Destacadas · FRAGRANCE OBSESSION",
      itemListElement: featured.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        item: { "@type": "Product", name: p.name, brand: p.brand, image: p.cardImage },
      })),
    };
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  // Registro del Service Worker (PWA)
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
    window.addEventListener("load", () => {
      // Ruta y alcance relativos: funcionan tanto en subcarpeta (GitHub Pages)
      // como en localhost.
      navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch((e) => { if (IS_DEV) console.warn("SW:", e); });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     TIKTOK — galería estática (cero iframes, cero scripts de terceros).
     Cada tarjeta es un enlace directo al video en TikTok (target=_blank):
     miniatura local + botón de play decorativo. Cero requests a
     tiktok.com en ningún momento (ni al cargar, ni al hacer scroll, ni
     al hacer clic — el navegador navega a TikTok, no hay red desde nuestra
     página). Se abandonaron el modal con iframe directo y, antes, el
     facade+embed.js oficial: ambos dependían de que TikTok renderizara
     dentro de nuestra página, y en producción (Safari/iPhone real) el
     cliente reportó que el video no se reproducía y la página se sentía
     lenta — un iframe/embed de terceros es peso y una dependencia
     externa inestable que una tienda no necesita. Los videos se
     definen en config.js → TIKTOK_VIDEOS / TIKTOK_PROFILE_URL.
  ══════════════════════════════════════════════════════════════ */
  const TIKTOK_ICON_PATH =
    "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z";

  function renderTikTokGallery() {
    const grid = document.getElementById("tiktokGrid");
    if (!grid || !FO.TIKTOK_VIDEOS) return;
    grid.innerHTML = FO.TIKTOK_VIDEOS.map((v) => `
      <a class="tiktok-card" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer" aria-label="Ver video en TikTok: ${esc(v.title)}">
        <img class="tiktok-card__img" src="${esc(v.thumbnail)}" alt="" loading="lazy" decoding="async" />
        <span class="tiktok-card__scrim" aria-hidden="true"></span>
        <span class="tiktok-card__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg></span>
        <span class="tiktok-card__meta">
          <strong class="tiktok-card__title">${esc(v.title)}</strong>
          <span class="tiktok-card__cta"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="${TIKTOK_ICON_PATH}"/></svg>Ver en TikTok</span>
        </span>
      </a>`).join("");
  }

  /* ══════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════ */

  function init() {
    snapshotMeta();
    setupHeroMobile();
    renderFeatured();
    updateCartUI();
    if (removedFromCartCount > 0) {
      showToast(
        removedFromCartCount === 1
          ? "⚠️ Quitamos 1 producto de tu carrito: ya no está disponible."
          : `⚠️ Quitamos ${removedFromCartCount} productos de tu carrito: ya no están disponibles.`,
      );
    }
    setupBackToTop();
    setupCheckoutValidation();
    setupHeroParallax();
    setupThemeToggle();
    setupRipple();
    setupRecommender();
    renderReviews();
    setupReviewsCarousel();
    renderTrustBadges();
    setupFooterInfoLinks();
    setupConnectivityToasts();
    applyConfigLinks();
    setupWhatsAppFab();
    maybeRemindCart();
    injectItemList();
    registerSW();
    navigateTo("home");
    applyHashRoute();
    window.addEventListener("hashchange", applyHashRoute);
    // Deep-link de producto al cargar + navegación con back/forward
    applyProductRoute(false);
    window.addEventListener("popstate", () => {
      const id = new URLSearchParams(location.search).get("producto");
      if (id && getProductById(parseInt(id, 10))) {
        openModal(parseInt(id, 10), true);
      } else if ($("modalOverlay").classList.contains("active")) {
        closeModal(true);
      }
    });
    // Dismiss loading screen
    var ls = document.getElementById("loadingScreen");
    if (ls) {
      setTimeout(function() { ls.classList.add("hidden"); }, 800);
      setTimeout(function() { ls.remove(); }, 1500);
    }

    // Trust cards reveal (they're static, not rendered dynamically)
    setTimeout(() => observeRevealElements(), 100);
    // Safety net: re-hydrate images after short delays to catch race conditions
    // with loading="lazy" + browser cache. Also fires on window load for slow connections.
    setTimeout(hydrateLoadedImages, 300);
    setTimeout(hydrateLoadedImages, 800);
    window.addEventListener("load", () => {
      hydrateLoadedImages();
      setTimeout(hydrateLoadedImages, 200);
    });
    renderTikTokGallery();
    setupFAQ();

    // Load More catálogo (delegado para contenido dinámico)
    document.addEventListener("click", e => {
      if (e.target.id === "loadMoreCatalog") {
        catalogVisibleCount += 24;
        if (catalogVisibleCount > products.length) catalogVisibleCount = products.length;
        renderCatalog(true); // carga incremental
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     FAQ ACCORDION
  ══════════════════════════════════════════════════════════════ */
  function setupFAQ() {
    var faqList = $("faqList");
    if (!faqList) return;
    faqList.addEventListener("click", function(e) {
      var trigger = e.target.closest(".faq-trigger");
      if (!trigger) return;
      var item = trigger.closest(".faq-item");
      var isOpen = item.classList.contains("open");
      // Close all others
      faqList.querySelectorAll(".faq-item.open").forEach(function(el) {
        el.classList.remove("open");
        el.querySelector(".faq-trigger").setAttribute("aria-expanded", "false");
      });
      // Toggle current
      if (!isOpen) {
        item.classList.add("open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  }

  init();
})();
