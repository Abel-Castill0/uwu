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
  const promos = window.FO_PROMOS || window.PACO_PROMOS || [];
  /* ══════════════════════════════════════════════════════════════
     CONSTANTES
  ══════════════════════════════════════════════════════════════ */
  const PLACEHOLDER_IMG = "img/perfumes/placeholder.webp";
  /* Imagen por defecto elegante: monograma dorado sobre marrón profundo.
     Se genera en SVG (data URI) cuando el perfume no tiene foto propia. */
  function cardImg(p) {
    const label = ((p && (p.name || p.brand)) || "Fragrance Obsession").replace(/[^\w\s-]/g, "");
    const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "FO";
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#2C2015"/><stop offset="0.55" stop-color="#1A120B"/><stop offset="1" stop-color="#140E08"/>' +
      '</linearGradient></defs>' +
      '<rect width="600" height="600" fill="url(#g)"/>' +
      '<rect x="24" y="24" width="552" height="552" fill="none" stroke="#C99B5F" stroke-opacity="0.3" stroke-width="3"/>' +
      '<text x="300" y="298" text-anchor="middle" dominant-baseline="central" font-family="Georgia, \'Times New Roman\', serif" font-size="170" fill="#E8CE9C" fill-opacity="0.9">' + initials + '</text>' +
      '<text x="300" y="500" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-size="24" letter-spacing="6" fill="#B88A4E" fill-opacity="0.6">FRAGRANCE OBSESSION</text>' +
      '</svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  /* Imagen específica por tamaño de decant (vial "5ml" / "10 ml").
     Si no hay variante para ese tamaño, cae a la imagen base del producto. */
  function sizeImage(p, size) {
    return (p && p.sizeImages && p.sizeImages[size]) || (p && p.cardImage) || "";
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
    let premiumAdded = false;
    Object.keys(sizes).forEach((s) => {
      const basePrice = sizes[s];
      const up = getPremiumUplift(basePrice);
      if (up > 0 && !sizes[s + "_premium"]) {
        sizes[s + "_premium"] = basePrice + up;
        premiumAdded = true;
      }
    });
    /* Decisión del cliente: se ofrecen AMBAS variantes (ej. 5ml y
       5ml premium). La base ya no se oculta; los datos base siguen
       intactos para precios y carrito (getDecantPrice). */
    void premiumAdded;
    return sizes;
  }
  function getDecantPrice(product, size) {
    const sizes = product.decantSizes || {};
    const base = sizes[baseSizeOf(size)];
    if (typeof base !== "number") return null;
    return isPremiumSize(size) ? base + getPremiumUplift(baseSizeOf(size)) : base;
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

  /* Optimización de imágenes:
     Pon esto en `true` SOLO después de ejecutar `node tools/optimize-images.js`,
     que genera las versiones de 400px en img/perfumes_optimized/.
     Mientras esté en `false`, se usa el original de siempre (sin romper nada). */
  const IMG_OPTIMIZED = true;
  const OPTIMIZED_DIR = "img/perfumes_optimized/";
  const IMG_SIZES = "(max-width: 640px) 160px, (max-width: 1024px) 200px, 260px";

  // Devuelve los atributos srcset/sizes para una imagen de producto.
  // Si IMG_OPTIMIZED está desactivado, devuelve cadena vacía (solo se usa src).
  function imgSrcsetAttrs(src) {
    if (!IMG_OPTIMIZED || !src) return "";
    const file = src.split("/").pop();
    const small = OPTIMIZED_DIR + file.replace(/\.(png|jpe?g)$/i, ".webp");
    return ` srcset="${esc(small)} 400w, ${esc(src)} 2048w" sizes="${IMG_SIZES}"`;
  }

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
  let activePromoFilter = null;
  let activePromoGender = null;
  let activePromoSize = null;
  let activePromoSort = "relevance";
  let cardPackSizes = {};
  let currentModalProduct = null;
  let currentModalView = "full";
  let currentModalSize = null;
  let currentPage = "home";
  let catalogVisibleCount = 24;
  let currentPackPromo = null;
  let selectedPackProducts = [];
  let currentPackIsGroup = false;
  let currentPackGroupSize = null;
  let currentPackGroupQty = null;
  let packGroupPrice = 0;
  /* currentSearchTerm eliminado — búsqueda removida */

  try {
    const saved = localStorage.getItem("fo_cart_v4") || localStorage.getItem("paco_cart_v4");
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    cart = [];
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
  function formatPrice(p) {
    return "S/ " + p.toFixed(2);
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
    const price = isPremiumSize(size) ? basePrice + getPremiumUplift(baseSize) : basePrice;
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
          imageHtml = `<img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" decoding="async" onerror="this.style.display='none'" />`;
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
            <img src="${esc(p.cardImage || p.decantImage || cardImg(p))}" alt="${esc(p.name)}" loading="lazy" decoding="async" onerror="this.style.display='none'" />
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
    const onCheckout = currentPage === "checkout";
    const scrolled = window.scrollY > 260;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const show = onMobile && hasItems && !onCheckout && scrolled;
    bar.classList.toggle("visible", show);
    if (reduce) bar.classList.toggle("visible", onMobile && hasItems && !onCheckout);
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
    $("cartOverlay").classList.add("active");
    $("cartSidebar").classList.add("active");
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");
    if (window.__modalScrollY === undefined) window.__modalScrollY = window.scrollY;
    updateCartUI();
  }
  function closeCart() {
    $("cartOverlay").classList.remove("active");
    $("cartSidebar").classList.remove("active");
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");
    if (window.__modalScrollY !== undefined) {
      window.scrollTo(0, window.__modalScrollY);
      window.__modalScrollY = undefined;
    }
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
      Object.keys(product.fullSizes)[0] || Object.keys(product.decantSizes)[0];
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
    const modalImg = $("modalImage").querySelector("img");
    modalImg.src =
      (isFull ? product.fullImage : sizeImage(product, currentModalSize)) ||
      cardImg(product);
    modalImg.alt = product.name;
    $("modalName").textContent = product.name;
    $("modalBrand").textContent = product.brand;
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
    $("modalPrice").innerHTML = price
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
    const msg = typeof FO.WHATSAPP_COTIZAR_MSG === "function"
      ? FO.WHATSAPP_COTIZAR_MSG(product.name, product.brand)
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
  function focusModal(container) {
    if (!container) return;
    lastFocusedEl = document.activeElement;
    requestAnimationFrame(() => { try { container.focus(); } catch (e) { /* noop */ } });
  }
  function restoreFocus() {
    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      try { lastFocusedEl.focus(); } catch (e) { /* noop */ }
    }
    lastFocusedEl = null;
  }

  /* ══════════════════════════════════════════════════════════════
     MODAL — PACK
  ══════════════════════════════════════════════════════════════ */
  function openPackModal(promoId, presetSize) {
    const promo = promos.find((p) => p.id === promoId);
    if (!promo) return;
    currentPackPromo = promo;
    currentPackIsGroup = (promo.type === "group");
    selectedPackProducts = [];
    currentPackGroupSize = null;
    currentPackGroupQty = promo.quantity || null;
    packGroupPrice = 0;
    $("packModalTitle").textContent = promo.name;
    $("packModalDesc").textContent = promo.desc;
    const sizeSelector = $("packGroupSizeSelector");
    const productGrid = $("packProductGrid");
    const counterEl = $("packCounter");
    const confirmBtn = $("packConfirmBtn");
    const priceDisplay = $("packGroupPrice");
    if (currentPackIsGroup) {
      sizeSelector.style.display = "block";
      productGrid.style.display = "grid";
      counterEl.style.display = "block";
      confirmBtn.style.display = "flex";
      priceDisplay.textContent = "";
      currentPackPromo.size = undefined;
      currentPackPromo.price = undefined;
      renderPackSizeOptions();
      productGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:1.5rem;">Selecciona un tamaño para ver los perfumes disponibles</p>';
      counterEl.style.display = "none";
      confirmBtn.style.display = "none";
      if (presetSize && promo.options.some((o) => o.size === Number(presetSize))) {
        selectPackSize(Number(presetSize));
      }
    } else {
      sizeSelector.style.display = "none";
      productGrid.style.display = "grid";
      counterEl.style.display = "block";
      confirmBtn.style.display = "flex";
      renderPackGrid();
      updatePackCounter();
    }
    $("packModalOverlay").classList.add("active");
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");
    if (window.__modalScrollY === undefined) window.__modalScrollY = window.scrollY;
    focusModal($("packModal"));
  }
  function closePackModal() {
    $("packModalOverlay").classList.remove("active");
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");
    if (window.__modalScrollY !== undefined) {
      window.scrollTo(0, window.__modalScrollY);
      window.__modalScrollY = undefined;
    }
    currentPackPromo = null;
    currentPackIsGroup = false;
    currentPackGroupSize = null;
    currentPackGroupQty = null;
    selectedPackProducts = [];
    $("packGroupSizeSelector").style.display = "none";
    $("packGroupPrice").textContent = "";
    restoreFocus();
  }
  function getEligibleProducts(promo) {
    let eligible = products.filter((p) => !p.tester);
    if (promo.allowedCategories) {
      eligible = eligible.filter((p) =>
        promo.allowedCategories.includes(p.category),
      );
    }
    const genderRules = promo.eligibleGenders || promo.allowedGenders;
    if (genderRules) {
      eligible = eligible.filter((p) => genderRules.includes(p.gender));
    }
    if (promo.allowedBrands) {
      eligible = eligible.filter((p) =>
        promo.allowedBrands.includes(p.brand),
      );
    }
    if (IS_DEV) {
      console.log(
        `[promo] "${promo.name}" → ${eligible.length} perfumes`,
        { allowedCategories: promo.allowedCategories, allowedGenders: promo.allowedGenders, allowedBrands: promo.allowedBrands },
      );
    }
    return eligible;
  }
  function renderPackGrid() {
    const promo = currentPackPromo;
    if (!promo) return;
    const eligible = getEligibleProducts(promo);
    const grid = $("packProductGrid");
    if (eligible.length === 0) {
      grid.innerHTML =
        '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">No hay perfumes disponibles para esta promoción.</p>';
      return;
    }
    grid.innerHTML = eligible
      .map((prod) => {
        const isSelected = selectedPackProducts.includes(prod.id);
        const imgSrc = prod.cardImage || cardImg(prod);
        return `
        <div class="pack-product-item ${isSelected ? "selected" : ""}"
             data-product-id="${prod.id}" role="button" tabindex="0" aria-pressed="${isSelected}">
          <img src="${esc(imgSrc)}" alt="${esc(prod.name)}" loading="lazy" decoding="async"
               onerror="this.src='${PLACEHOLDER_IMG}';" />
          <span class="pack-product-name">${esc(prod.name)}</span>
          <span class="pack-product-brand">${esc(prod.brand)}</span>
        </div>`;
      })
      .join("");
  }
  function togglePackProduct(productId) {
    const promo = currentPackPromo;
    if (!promo) return;
    const index = selectedPackProducts.indexOf(productId);
    if (index > -1) {
      selectedPackProducts.splice(index, 1);
    } else {
      if (selectedPackProducts.length >= promo.quantity) {
        showToast(`⚠️ Solo puedes elegir ${promo.quantity} perfumes`);
        return;
      }
      selectedPackProducts.push(productId);
    }
    renderPackGrid();
    updatePackCounter();
  }
  window.togglePackProduct = togglePackProduct;
  function updatePackCounter() {
    const promo = currentPackPromo;
    const counter = $("packCounter");
    if (promo && counter) {
      const qty = promo.quantity;
      counter.textContent = `Seleccionados: ${selectedPackProducts.length} de ${qty}`;
      counter.classList.toggle("complete", selectedPackProducts.length === qty);
    }
  }
  function renderPackSizeOptions() {
    if (!currentPackIsGroup || !currentPackPromo) return;
    const sizes = currentPackPromo.options.map((opt) => opt.size);
    const container = $("packSizeGrid");
    container.innerHTML = sizes
      .map(
        (size) =>
          `<button class="size-option${size === currentPackGroupSize ? " selected" : ""}" data-size="${esc(size)}">${esc(size)}</button>`,
      )
      .join("");
    $("packGroupPrice").textContent = "";
  }
  function selectPackSize(size) {
    const sizeNum = Number(size);
    currentPackGroupSize = sizeNum;
    currentPackGroupQty = currentPackPromo.quantity;
    packGroupPrice = 0;
    document.querySelectorAll("#packSizeGrid .size-option").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.size === size);
    });
    const option = currentPackPromo.options.find((o) => o.size === sizeNum);
    const priceEl = $("packGroupPrice");
    if (option) {
      packGroupPrice = option.price;
      priceEl.textContent = `Precio: ${formatPrice(packGroupPrice)}`;
      priceEl.classList.remove("price-anim");
      void priceEl.offsetWidth;
      priceEl.classList.add("price-anim");
    } else {
      priceEl.textContent = "";
    }
    const productGrid = $("packProductGrid");
    const counterEl = $("packCounter");
    const confirmBtn = $("packConfirmBtn");
    productGrid.style.display = "grid";
    counterEl.style.display = "block";
    confirmBtn.style.display = "flex";
    currentPackPromo.size = currentPackGroupSize;
    currentPackPromo.price = packGroupPrice;
    selectedPackProducts = [];
    renderPackGrid();
    updatePackCounter();
  }
  $("packSizeGrid").addEventListener("click", function (e) {
    const btn = e.target.closest(".size-option");
    if (!btn) return;
    selectPackSize(btn.dataset.size);
  });
  // Selección de perfumes en el pack (click + teclado)
  $("packProductGrid").addEventListener("click", function (e) {
    const item = e.target.closest(".pack-product-item");
    if (!item) return;
    const id = parseInt(item.dataset.productId, 10);
    if (id) togglePackProduct(id);
  });
  $("packProductGrid").addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    const item = e.target.closest(".pack-product-item");
    if (!item) return;
    e.preventDefault();
    const id = parseInt(item.dataset.productId, 10);
    if (id) togglePackProduct(id);
  });

  function confirmPack() {
    const promo = currentPackPromo;
    if (!promo) return;
    const qty = promo.quantity;
    const sz = currentPackIsGroup ? currentPackGroupSize : promo.size;
    const prc = currentPackIsGroup ? packGroupPrice : promo.price;
    if (selectedPackProducts.length < qty) {
      showToast(`⚠️ Selecciona exactamente ${qty} perfume(s)`);
      return;
    }
    const mainProduct = getProductById(selectedPackProducts[0]);
    const mainImage = mainProduct ? mainProduct.cardImage : "";
    const includedProducts = selectedPackProducts
      .map((pid) => {
        const prod = getProductById(pid);
        return prod ? { id: pid, name: prod.name, image: prod.cardImage } : null;
      })
      .filter(Boolean);
    const packItem = {
      productId: "pack-" + promo.id + "-" + Date.now(),
      type: "pack",
      name: promo.name,
      brand: "Pack Personalizado",
      image: mainImage,
      size: `${qty} × ${sz}`,
      price: prc,
      qty: 1,
      isPack: true,
      includedProductIds: [...selectedPackProducts],
      includedProducts: includedProducts,
    };
    if (promo.gift) {
      const giftProduct = getProductById(160);
      packItem.gift = {
        name: promo.giftName || (giftProduct ? giftProduct.name : "Regalo"),
        image: promo.giftImage || (giftProduct ? giftProduct.cardImage : ""),
        size: sz,
        price: 0,
      };
    }
    const packBtn = $("packConfirmBtn");
    if (mainImage && packBtn) flyToCart(mainImage, packBtn);
    cart.push(packItem);
    saveCart();
    updateCartUI();
    const mensaje = promo.gift
      ? `🎁 ¡Pack añadido al carrito! (incluye ${packItem.gift.name} de regalo)`
      : "✅ ¡Pack añadido al carrito!";
    showToast(mensaje);
    pulseCartCount();
    if (packBtn) packBtn.classList.add("added");
    setTimeout(() => {
      if (packBtn) packBtn.classList.remove("added");
      closePackModal();
      openCart();
    }, 550);
  }
  window.confirmPack = confirmPack;
  $("packModalOverlay").addEventListener("click", function (e) {
    if (e.target === this) closePackModal();
  });

  /* ══════════════════════════════════════════════════════════════
     NAVIGATION
  ══════════════════════════════════════════════════════════════ */
  function navigateTo(page) {
    if (!["home", "catalogo", "promos", "checkout", "cart", "modal", "packmodal", "faq", "envios", "devoluciones", "terminos", "nosotros"].includes(page)) return;
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
      activePromoFilter = null;
      activePromoGender = null;
      activePromoSize = null;
      activePromoSort = "relevance";
      cardPackSizes = {};
      updatePromoFilterButtons();
      renderPromos();
    }
    if (page === "checkout") renderCheckoutPage();
    if (page === "home") renderFeatured();
    track("page_view", { page_title: "FRAGRANCE OBSESSION · " + page, page_path: "/" + (page === "home" ? "" : page) });
    const nav = $("nav");
    nav.classList.remove("open");
    const hb = $("hamburger");
    if (hb) hb.setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  window.navigateTo = navigateTo;

  /* ══════════════════════════════════════════════════════════════
     RENDER — PRODUCT CARD
  ══════════════════════════════════════════════════════════════ */
  function createProductCard(product) {
    const decantSizes = Object.keys(product.decantSizes || {});
    const fullSizes = Object.keys(product.fullSizes || {});
    const hasDecants = !product.tester && decantSizes.length > 0;
    const hasFull = fullSizes.length > 0;
    // Presentación: "Sellado" (botella completa) o "Tester"; si hay decants, la card muestra el precio desde el decant
    const presentation =
      product.tester ? "Tester"
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
    const priceText = minPrice ? `Desde ${formatPrice(minPrice)}` : "Consultar";
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
          <img src="${esc(product.cardImage || cardImg(product))}"${imgSrcsetAttrs(product.cardImage)} alt="${esc(product.name)} - ${esc(product.brand)}" loading="lazy" decoding="async" onload="this.classList.add('img-loaded'); this.closest('.img-wrapper').classList.add('skeleton-done');" onerror="this.style.display='none'; this.closest('.img-wrapper').classList.add('skeleton-done');" />
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
    } else {
      filtered = filtered.filter((p) => !p.tester);
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
     RENDER — PROMOS
  ══════════════════════════════════════════════════════════════ */
  function renderPromos() {
    const grid = $("promoGrid");
    const countEl = $("packsCount");
    if (!grid) return;

    const toolbarRow = $("packsToolbarRow");
    const categoryChosen = Boolean(activePromoFilter);
    if (toolbarRow) toolbarRow.style.display = categoryChosen ? "flex" : "none";

    let filtered;
    if (!categoryChosen) {
      filtered = promos;
      if (countEl) countEl.textContent = `${promos.length} packs`;
    } else {
      filtered = promos.filter((p) => p.category === activePromoFilter);
      if (activePromoFilter === "arabe" && activePromoGender) {
        filtered = filtered.filter((p) => {
          if (!p.allowedGenders) return true;
          return p.allowedGenders.includes(activePromoGender);
        });
      }

      if (activePromoSize) {
        filtered = filtered.filter((p) =>
          Array.isArray(p.options) && p.options.some((o) => o.size === activePromoSize),
        );
      }

      if (activePromoSort === "price-asc") {
        filtered = [...filtered].sort(
          (a, b) => Math.min(...(a.options || []).map((o) => o.price)) - Math.min(...(b.options || []).map((o) => o.price)),
        );
      } else if (activePromoSort === "price-desc") {
        filtered = [...filtered].sort(
          (a, b) => Math.min(...(b.options || []).map((o) => o.price)) - Math.min(...(a.options || []).map((o) => o.price)),
        );
      } else if (activePromoSort === "qty-desc") {
        filtered = [...filtered].sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      }

      if (countEl) {
        countEl.textContent = `Mostrando ${filtered.length} de ${promos.length} packs`;
      }
    }

    if (activePromoFilter === "arabe" && activePromoGender) {
      filtered = filtered.filter((p) => {
        if (!p.allowedGenders) return true;
        return p.allowedGenders.includes(activePromoGender);
      });
    }

    if (activePromoSize) {
      filtered = filtered.filter((p) =>
        Array.isArray(p.options) && p.options.some((o) => o.size === activePromoSize),
      );
    }

    if (activePromoSort === "price-asc") {
      filtered = [...filtered].sort(
        (a, b) => Math.min(...(a.options || []).map((o) => o.price)) - Math.min(...(b.options || []).map((o) => o.price)),
      );
    } else if (activePromoSort === "price-desc") {
      filtered = [...filtered].sort(
        (a, b) => Math.min(...(b.options || []).map((o) => o.price)) - Math.min(...(a.options || []).map((o) => o.price)),
      );
    } else if (activePromoSort === "qty-desc") {
      filtered = [...filtered].sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
    }

    if (countEl) {
      countEl.textContent = `Mostrando ${filtered.length} de ${promos.length} packs`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7.5" width="17" height="13" rx="2"/><path d="M12 7.5V20.5M3.5 12.5h17M12 7.5c-2.8 0-4.6-1-4.6-2.7S9.2 2 12 2s4.6 1 4.6 2.8-1.8 2.7-4.6 2.7z"/></svg></div>
          <h3 class="empty-state-title">Sin packs aquí</h3>
          <p class="empty-state-text">No hay packs que coincidan con los filtros. Prueba otra combinación.</p>
        </div>`;
      return;
    }

    grid.innerHTML = filtered
      .map((promo) => {
        let priceHtml = "";
        const imageUrl = promo.image || cardImg(promo);

        // Precio según tamaño seleccionado en la card (si hay) o "Desde el menor"
        const cardSize = cardPackSizes[promo.id] || null;
        const sizeOption = cardSize
          ? (promo.options || []).find((o) => o.size === Number(cardSize))
          : null;

        if (promo.type === "group" && Array.isArray(promo.options) && promo.options.length) {
          const allPrices = promo.options.map((opt) => opt.price);
          const minPrice = Math.min(...allPrices);
          const maxPrice = Math.max(...allPrices);
          priceHtml = sizeOption
            ? formatPrice(sizeOption.price)
            : (minPrice === maxPrice ? formatPrice(minPrice) : `Desde ${formatPrice(minPrice)}`);
        } else if (promo.price) {
          priceHtml = formatPrice(promo.price);
        } else {
          priceHtml = "Consultar";
        }

        // Texto informativo
        const infoLine = promo.type === "group"
          ? `${promo.quantity} perfumes · Elige tamaño`
          : `${promo.quantity} perfume(s) · ${promo.size}`;

        // Badge (flota sobre la banda de imagen)
        const badgeHtml = promo.badge
          ? `<span class="promo-badge">${esc(promo.badge)}</span>`
          : "";

        // Granularidad → "por decant" cuando hay tamaño seleccionado
        const perDecantHtml = sizeOption && promo.quantity
          ? `<span class="promo-per-decant">≈ ${formatPrice(sizeOption.price / promo.quantity)} c/u</span>`
          : "";

        // Mini-selector de tamaño inline (arquitectura nueva: decide el precio sin abrir el modal)
        const sizeChipsHtml = (promo.options || []).length > 1
          ? `<div class="promo-size-picker" role="group" aria-label="Elegir tamaño de ${esc(promo.name)}">
               ${promo.options.map((o) => `
                 <button class="promo-size-chip${o.size === Number(cardSize) ? " active" : ""}" data-promo-size="${esc(o.size)}" aria-pressed="${o.size === Number(cardSize)}">
                   ${esc(o.size)}
                 </button>`).join("")}
             </div>`
          : "";

        const promoIcon = promo.icon || getCategoryIcon(promo.category);
        const countLabel = promo.quantity
          ? `${promo.quantity} decants`
          : "Pack";
        const imgHtml = imageUrl
          ? `<img src="${esc(imageUrl)}"${imgSrcsetAttrs(imageUrl)} alt="${esc(promo.name)}" class="promo-img" loading="lazy" decoding="async" onload="this.classList.add('img-loaded')" onerror="this.remove()" />`
          : "";

        return `
          <div class="promo-card reveal-item" data-promo-id="${esc(promo.id)}">
            <div class="promo-media" data-cat="${esc(promo.category)}">
              <div class="promo-media-fallback" aria-hidden="true">
                <span class="promo-media-icon">${promoIcon}</span>
                <span class="promo-media-count">${esc(countLabel)}</span>
              </div>
              ${imgHtml}
              ${badgeHtml}
            </div>
            <div class="promo-body">
              <h3>${esc(promo.name)}</h3>
              <p class="promo-desc">${esc(promo.desc)}</p>
              <p class="promo-meta"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5h17v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10z"/><path d="M3.5 8.5l2.2-4h12.6l2.2 4M9.5 12.5h5"/></svg> ${infoLine}</p>
              ${sizeChipsHtml}
              <div class="promo-price">${priceHtml}${perDecantHtml}</div>
              <button class="btn-add" data-promo-id="${esc(promo.id)}" aria-label="Seleccionar perfumes para ${esc(promo.name)}">
                Seleccionar Perfumes
              </button>
            </div>
          </div>`;
      })
      .join("");

    observeRevealElements();
    window.FraganceAnimations?.refresh?.();
  }

  function applyCardPackSize(promoId, size) {
    if (size) {
      cardPackSizes[promoId] = size;
    } else {
      delete cardPackSizes[promoId];
    }
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
  function updatePromoFilterButtons() {
    document.querySelectorAll("#promoFilters .filter-btn").forEach((btn) => {
      const active = btn.dataset.promoFilter === activePromoFilter;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    const genderGroup = $("promoGenderGroup");
    if (genderGroup) {
      if (activePromoFilter === "arabe") {
        genderGroup.style.display = "flex";
      } else {
        genderGroup.style.display = "none";
        activePromoGender = null;
      }
    }

    document.querySelectorAll("#promoGenderFilters .filter-btn").forEach((btn) => {
      const active = btn.dataset.promoGender === activePromoGender;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  const promoFilters = $("promoFilters");
  if (promoFilters) {
    promoFilters.addEventListener("click", function (e) {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      activePromoFilter = btn.dataset.promoFilter;
      activePromoGender = null;
      btn.classList.remove("chip-pop");
      void btn.offsetWidth;
      btn.classList.add("chip-pop");
      updatePromoFilterButtons();
      renderPromos();
    });
  }

  const promoGenderFilters = $("promoGenderFilters");
  if (promoGenderFilters) {
    promoGenderFilters.addEventListener("click", function (e) {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      const val = btn.dataset.promoGender;
      activePromoGender = activePromoGender === val ? null : val;
      updatePromoFilterButtons();
      renderPromos();
    });
  }

  /* ══════════════════════════════════════════════════════════════
     FILTERS — PACKS (tamaño + orden + selector inline en cards)
  ══════════════════════════════════════════════════════════════ */
  function updatePackSizeFilterButtons() {
    document.querySelectorAll("#packsSizeFilters .pack-size-chip").forEach((btn) => {
      const active = btn.dataset.packSize === activePromoSize;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  const packsSizeFilters = $("packsSizeFilters");
  if (packsSizeFilters) {
    packsSizeFilters.addEventListener("click", function (e) {
      const btn = e.target.closest(".pack-size-chip");
      if (!btn) return;
      const val = btn.dataset.packSize || null;
      activePromoSize = activePromoSize === val ? null : val;
      updatePackSizeFilterButtons();
      renderPromos();
    });
  }

  // Dropdown "Ordenar" de packs (custom, accesible: listbox/options)
  const sortWrap = $("packsSortWrapper");
  if (sortWrap) {
    const sortBtn = $("packsSortButton");
    const sortMenu = $("packsSortMenu");
    const sortValue = $("packsSortValue");
    const SORT_LABELS = {
      relevance: "Relevancia",
      "price-asc": "Precio: menor a mayor",
      "price-desc": "Precio: mayor a menor",
      "qty-desc": "Más perfumes primero",
    };
    const setSortVisual = (val) => {
      activePromoSort = val || "relevance";
      const opts = sortMenu.querySelectorAll(".packs-sort__option");
      opts.forEach((o) => {
        const on = o.dataset.value === activePromoSort;
        o.classList.toggle("active", on);
        o.setAttribute("aria-selected", String(on));
      });
      if (sortValue) sortValue.textContent = SORT_LABELS[activePromoSort] || activePromoSort;
    };
    const applySort = (val) => {
      setSortVisual(val);
      renderPromos();
    };
    const closeSortMenu = () => {
      sortMenu.classList.remove("open");
      sortBtn.setAttribute("aria-expanded", "false");
    };
    const openSortMenu = () => {
      sortMenu.classList.add("open");
      sortBtn.setAttribute("aria-expanded", "true");
    };
    sortBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      sortMenu.classList.contains("open") ? closeSortMenu() : openSortMenu();
    });
    sortMenu.addEventListener("click", function (e) {
      const opt = e.target.closest(".packs-sort__option");
      if (!opt) return;
      applySort(opt.dataset.value);
      closeSortMenu();
    });
    // Navegación por teclado: flechas mueven la selección, Enter confirma, Esc cierra
    const sortOptions = Array.from(sortMenu.querySelectorAll(".packs-sort__option"));
    sortMenu.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter" && e.key !== "Escape") return;
      e.preventDefault();
      const idx = sortOptions.indexOf(document.activeElement);
      if (e.key === "ArrowDown") {
        const next = sortOptions[(idx + 1) % sortOptions.length];
        next.focus();
        setSortVisual(next.dataset.value);
      } else if (e.key === "ArrowUp") {
        const prev = sortOptions[(idx - 1 + sortOptions.length) % sortOptions.length];
        prev.focus();
        setSortVisual(prev.dataset.value);
      } else if (e.key === "Enter") {
        applySort(document.activeElement.dataset.value);
        closeSortMenu();
      } else {
        closeSortMenu();
        sortBtn.focus();
      }
    });
    sortMenu.addEventListener("focusout", function (e) {
      if (!sortMenu.contains(e.relatedTarget) && !sortWrap.contains(e.relatedTarget)) closeSortMenu();
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest("#packsSortWrapper")) closeSortMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSortMenu();
    });
  }

  // Selector inline de tamaño: cambia el precio de la card sin abrir el modal
  // y preselecciona ese tamaño al abrirlo.
  document.addEventListener("click", function (e) {
    const chip = e.target.closest(".promo-size-chip");
    if (!chip) return;
    e.stopPropagation();
    const card = chip.closest(".promo-card");
    if (!card) return;
    const promoId = card.dataset.promoId;
    const size = chip.dataset.promoSize;
    const chosenSize = cardPackSizes[promoId] === size ? null : size;
    applyCardPackSize(promoId, chosenSize);
    card.querySelectorAll(".promo-size-chip").forEach((c) => {
      const active = c.dataset.promoSize === chosenSize;
      c.classList.toggle("active", active);
      c.setAttribute("aria-pressed", String(active));
    });
    const promo = promos.find((p) => p.id === promoId);
    if (!promo) return;
    const opt = chosenSize ? (promo.options || []).find((o) => o.size === chosenSize) : null;
    const priceEl = card.querySelector(".promo-price");
    const prices = (promo.options || []).map((o) => o.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (priceEl) {
      priceEl.childNodes[0].textContent = opt
        ? formatPrice(opt.price)
        : (min === max ? formatPrice(min) : `Desde ${formatPrice(min)}`);
    }
    let perDecantEl = card.querySelector(".promo-per-decant");
    const perDecantText = opt && promo.quantity
      ? `≈ ${formatPrice(opt.price / promo.quantity)} c/u`
      : "";
    if (perDecantText) {
      if (!perDecantEl) {
        perDecantEl = document.createElement("span");
        perDecantEl.className = "promo-per-decant";
        priceEl.appendChild(perDecantEl);
      }
      perDecantEl.textContent = perDecantText;
    } else if (perDecantEl) {
      perDecantEl.remove();
    }
  });

  /* búsqueda eliminada — catálogo filtra solo por categoría y género */

  /* ══════════════════════════════════════════════════════════════
     GLOBAL CLICK DELEGATION (cards, add buttons, promo buttons)
  ══════════════════════════════════════════════════════════════ */
  document.addEventListener("click", function (e) {
    // Product card body (not a button)
    const card = e.target.closest(".product-card");
    if (card && !e.target.closest("button")) {
      const id = parseInt(card.dataset.productId, 10);
      if (id) openModal(id);
      return;
    }

    // "Ver y Comprar" button on product card
    const addBtn = e.target.closest(".btn-add[data-add-id]");
    if (addBtn) {
      e.stopPropagation();
      const id = parseInt(addBtn.dataset.addId, 10);
      if (id) openModal(id);
      return;
    }

    // "Seleccionar Perfumes" button on promo card
    const promoBtn = e.target.closest(".btn-add[data-promo-id]");
    if (promoBtn) {
      e.stopPropagation();
      openPackModal(promoBtn.dataset.promoId, cardPackSizes[promoBtn.dataset.promoId] || null);
      return;
    }

    // Toda la promo-card es clicable (chips y botones la excluyen)
    const promoCard = e.target.closest(".promo-card");
    if (promoCard && !e.target.closest("button")) {
      const pid = promoCard.dataset.promoId;
      if (pid) {
        openPackModal(pid, cardPackSizes[pid] || null);
        return;
      }
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
    if (cart.length === 0) {
      showToast("⚠️ El carrito está vacío");
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
      else setTimeout(() => { location.href = "gracias.html"; }, 1600);
      return;
    }

    // Método WhatsApp: abre SOLO WhatsApp (una ventana), nunca dos.
    guardarPedido();
    notifyOrderSent();
    showToast("📲 Redirigiendo a WhatsApp...");
    const urlWa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    const winWa = window.open(urlWa, "_blank");
    if (!winWa) location.href = urlWa; // popup bloqueado → navegación directa
    else setTimeout(() => { location.href = "gracias.html"; }, 1600);
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
  window.closePackModal = closePackModal;
  window.closeInfoModal = closeInfoModal;
  window.goToCheckout = goToCheckout;
  window.openModal = openModal;
  // Hook de pruebas (QA/E2E): no altera la lógica de la app.
  window.__FO_TEST = {
    addToCart: addToCart,
    clearCart: function () { cart = []; saveCart(); updateCartUI(); },
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

  const hamburger = $("hamburger");
  if (hamburger) {
    hamburger.addEventListener("click", () => {
      const nav = $("nav");
      const expanded = hamburger.getAttribute("aria-expanded") === "true";
      nav.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", String(!expanded));
    });
  }

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
    if (!btn) return;
    const icon = btn.querySelector(".theme-icon");
    let usedOnce = false;

    function syncUI() {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      btn.setAttribute("aria-pressed", String(dark));
      // El tooltip indica la acción que realizará el botón
      btn.setAttribute("data-tooltip", dark ? "Modo claro" : "Modo oscuro");
      updateThemeColor();
    }
    syncUI();

    btn.addEventListener("click", () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      const next = dark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("fo_theme", next); } catch (e) { /* storage no disponible */ }
      // Animación de rotación del ícono
      btn.classList.remove("rotating");
      void btn.offsetWidth;
      btn.classList.add("rotating");
      // Pulso sutil la primera vez que se usa
      if (!usedOnce) {
        usedOnce = true;
        btn.classList.add("pulse");
        setTimeout(() => btn.classList.remove("pulse"), 650);
      }
      syncUI();
    });
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
    const valid = ["home", "catalogo", "promos"];
    if (valid.includes(hash)) navigateTo(hash);
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
      closePackModal();
      closeFiltersPanel();
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
          <div class="reco-img"><img src="${esc(p.cardImage)}" alt="${esc(p.name)}" loading="lazy" decoding="async" onerror="this.style.display='none'" /></div>
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
  /* Enlaces de redes desde config.js: elementos marcados con data-ig-link / data-wa-link */
  function applyConfigLinks() {
    const ig = FO.INSTAGRAM_URL || "https://instagram.com/fraganceobsession.pe";
    const wa = "https://wa.me/" + WHATSAPP_NUMBER;
    document.querySelectorAll("[data-ig-link]").forEach((a) => {
      a.href = ig;
      if (a.dataset.igPendingTitle) { a.title = a.dataset.igPendingTitle; a.setAttribute("aria-label", a.dataset.igPendingTitle); }
    });
    document.querySelectorAll("[data-wa-link]").forEach((a) => {
      if (a.hasAttribute("data-wa-text")) {
        a.href = wa + "?text=" + encodeURIComponent(a.dataset.waText);
      } else {
        a.href = wa;
      }
    });
  }

  /* Marquee de promociones: cinta deslizante continua bajo el topbar.
     Contenido duplicado para un loop perfecto. Con prefers-reduced-motion
     se muestra estático (una sola pasada, sin animación). */
  function renderMarquee() {
    const track = $("marqueeTrack");
    const benefits = Array.isArray(FO.TOPBAR_BENEFITS) ? FO.TOPBAR_BENEFITS : [];
    if (!track || !benefits.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const item = (b) => `<span class="marquee-item">${b}</span>`;
    const sep = `<span class="marquee-sep" aria-hidden="true">·</span>`;
    const once = benefits.map(item).join(sep);
    track.innerHTML = reduce.matches
      ? once
      : once + sep + once + sep;
    if (!reduce.matches) {
      const duration = Math.max(22, benefits.length * 4);
      track.style.animationDuration = duration + "s";
    }
  }

  /* Rotador de la topbar: un beneficio a la vez (fade cada 4s).
     Con prefers-reduced-motion solo se muestra el primero, sin animación. */
  function setupTopbarRotator() {
    const rot = $("topbarRotator");
    const txt = $("topbarRotatorText");
    const benefits = Array.isArray(FO.TOPBAR_BENEFITS) ? FO.TOPBAR_BENEFITS : [];
    if (!rot || !txt || benefits.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    setInterval(() => {
      i = (i + 1) % benefits.length;
      txt.textContent = benefits[i];
      rot.classList.remove("topbar-rotator--fade");
      void rot.offsetWidth;
      rot.classList.add("topbar-rotator--fade");
    }, 4000);
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
    if (modal) modal.focus();
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

  /* Botón flotante de Instagram (fade-in tras 2s) */
  function setupInstagramFab() {
    const fab = $("igFab");
    if (!fab) return;
    setTimeout(() => fab.classList.add("visible"), 2000);
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
     TIKTOK — embed oficial (blockquote + embed.js) con lazy load
     y fallback elegante.
     Por qué blockquote+embed.js y no <iframe src="tiktok.com/embed/v2/...">:
     TikTok rechaza en silencio (sin error de red, sin 404, página en
     blanco) el hotlink directo del iframe cuando no reconoce el
     origen/referrer. El embed oficial es el único método soportado
     de forma fiable cross-browser.
  ══════════════════════════════════════════════════════════════ */

  /* ══════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════ */
function renderTikTokStatic() {
  const grid = document.getElementById('tiktokStaticGrid');
  if (!grid || !FO.TIKTOK_VIDEOS) return;
  const videos = FO.TIKTOK_VIDEOS;
  grid.innerHTML = videos.map((v, i) => {
    return `<a class='tiktok-static-card' href='${v.url}' target='_blank' rel='noopener noreferrer' aria-label='Ver video en TikTok: ${v.title}'>
      <div class='tiktok-static-thumb'>
        <img src='${v.thumbnail}' alt='${v.title}' loading='lazy' decoding='async' />
        <span class='tiktok-static-play'>▶</span>
      </div>
      <div class='tiktok-static-body'>
        <strong>${v.title}</strong>
        <span>Ver en TikTok</span>
      </div>
    </a>`;
  }).join('');
}

  function init() {
    snapshotMeta();
    setupHeroMobile();
    renderFeatured();
    updateCartUI();
    setupBackToTop();
    setupCheckoutValidation();
    setupHeroParallax();
    setupThemeToggle();
    setupRipple();
    setupRecommender();
    renderReviews();
    setupReviewsCarousel();
    renderTrustBadges();
    renderMarquee();
    setupTopbarRotator();
    setupFooterInfoLinks();
    setupConnectivityToasts();
    applyConfigLinks();
    setupWhatsAppFab();
    setupInstagramFab();
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

    // Trust cards reveal (they're static, not rendered dynamically)
    setTimeout(() => observeRevealElements(), 100);
    renderTikTokStatic();

    // Load More catálogo (delegado para contenido dinámico)
    document.addEventListener("click", e => {
      if (e.target.id === "loadMoreCatalog") {
        catalogVisibleCount += 24;
        if (catalogVisibleCount > products.length) catalogVisibleCount = products.length;
        renderCatalog(true); // carga incremental
      }
    });
  }

  init();
})();
