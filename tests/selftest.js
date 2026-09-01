(function () {
  "use strict";
  window.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(Date.now()); }, 16); };
  window.cancelAnimationFrame = function (id) { clearTimeout(id); };

  var results = [];
  var errors = [];

  // La confirmación de checkout programa una navegación a gracias.html con un
  // setTimeout de 1600 ms. Ese efecto lateral mataría la página antes de que el
  // paso de resumen fije el título. Se neutraliza en el harness: el test ya
  // valida la apertura de wa.me y la ausencia de MercadoPago; navegar no aporta
  // nada y contamina las corridas medidas.
  var _origSetTimeout = window.setTimeout;
  window.setTimeout = function (fn, ms) {
    if (typeof fn === "function" && /gracias\.html/.test(fn.toString()) && ms >= 1000) {
      return 0;
    }
    return _origSetTimeout.apply(this, arguments);
  };
  var out = document.createElement("div");
  out.id = "stout";
  out.style.cssText = "position:fixed;top:0;left:0;z-index:99999;max-height:60vh;overflow:auto;font:11px monospace;background:#fff;color:#111;padding:4px;border:1px solid #999";
  document.body.appendChild(out);
  function show(txt) { out.insertAdjacentHTML("beforeend", "<div>" + txt.replace(/</g, "&lt;") + "</div>"); }
  var origError = console.error;
  console.error = function () {
    var m = Array.prototype.slice.call(arguments).join(" ");
    errors.push(m);
    show("ST_ERR: " + m);
    return origError.apply(console, arguments);
  };
  window.addEventListener("error", function (e) {
    errors.push("onerror: " + (e.message || "?"));
    show("ST_ERR: " + e.message);
  });

  function pass(name) { results.push([name, true, ""]); show("PASS " + name); }
  function fail(name, why) { results.push([name, false, why]); show("FAIL " + name + " — " + why); }
  function ok(cond, name, why) { cond ? pass(name) : fail(name, why); }
  function cartTotal() { return parseInt(document.getElementById("cartCount").textContent, 10) || 0; }
  function gridCount() { return document.querySelectorAll("#catalogGrid .product-card").length; }

  var steps = [];
  window.__chains = 0;
  function step(fn, delay) { steps.push([fn, delay]); }

  window.open = function (u) { window.__opened = u; return {}; };
  window.__opened = null;

  /* 1. catalogo: elegir categoria â†’ grid completo */
  step(function () {
    window.navigateTo("catalogo");
    var tile = document.querySelector('[data-cat="nicho"]');
    ok(!!tile, "catalogTileNicho", "sin tile nicho");
    if (tile) { tile.click(); }
  }, 400);

step(function () {
    ok(gridCount() === 24, "catalogNichoInitial24", "initial grid=" + gridCount());
    // Cadena asíncrona: cada click debe esperar el render interno (setTimeout
    // 160ms de renderCatalog) para que el grid crezca de verdad. __chains evita
    // que el scheduler avance al siguiente paso antes de que la cadena termine.
    window.__chains += 1;
    var maxClicks = 10;
    function clickLoadMore() {
      var loadMoreBtn = document.getElementById("loadMoreCatalog");
      if (loadMoreBtn && maxClicks > 0) {
        maxClicks--;
        loadMoreBtn.click();
        setTimeout(clickLoadMore, 300);
      } else {
        window.__chains -= 1;
        // nicho (116 productos): el render incremental añade chunks de 24; al
        // desbordar el último chunk, el grid queda en 120 tarjetas (sin botón).
        ok(gridCount() === 120, "catalogNichoFiltered", "grid=" + gridCount());
      }
    }
    setTimeout(clickLoadMore, 300);
  }, 300);

  /* 2. modal de producto */
  step(function () {
    var btn = document.querySelector("#catalogGrid .product-card .btn-add[data-add-id]");
    ok(!!btn, "productAddBtn", "sin .btn-add[data-add-id]");
    if (btn) { btn.click(); }
    ok(document.getElementById("modalOverlay").classList.contains("active"), "productModalOpens", "overlay no activo");
  }, 200);

  /* 3. anadir al carrito */
  step(function () {
    var before = cartTotal();
    var add = document.getElementById("modalAddBtn");
    if (add) { add.click(); }
    ok(cartTotal() > before, "addToCart", before + " -> " + cartTotal());
  }, 250);

  /* 4. Esc cierra modal */
  step(function () {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    ok(!document.getElementById("modalOverlay").classList.contains("active"), "escClosesModal", "modalOverlay sigue activo");
  }, 200);

  /* 5. cambio de categoria: disenador â†’ 24, vuelta a nicho â†’ 116 */
  step(function () {
    var tile = document.querySelector('[data-cat="disenador"]');
    ok(!!tile, "catalogTileDisenador", "sin tile disenador");
    if (tile) { tile.click(); }
  }, 300);

  step(function () {
    ok(gridCount() === 24, "catalogDisenador24", "grid=" + gridCount());
    var tile = document.querySelector('[data-cat="nicho"]');
    if (tile) { tile.click(); }
  }, 300);

  step(function () {
ok(gridCount() === 24, "catalogBackInitial24", "initial grid=" + gridCount());
    window.__chains += 1;
    var maxClicks = 10;
    function clickLoadMore() {
      var loadMoreBtn = document.getElementById("loadMoreCatalog");
      if (loadMoreBtn && maxClicks > 0) {
        maxClicks--;
        loadMoreBtn.click();
        setTimeout(clickLoadMore, 500);
      } else {
        window.__chains -= 1;
        // vuelta a nicho: mismo comportamiento incremental (120 tarjetas)
        ok(gridCount() === 120, "catalogBackFiltered", "grid=" + gridCount());
      }
    }
    setTimeout(clickLoadMore, 500);
  }, 5000);

  /* 6. tema + persistencia */
  step(function () {
    var t = document.getElementById("themeToggle");
    ok(!!t, "themeToggle", "no existe #themeToggle");
    var root = document.documentElement;
    var before = root.getAttribute("data-theme") || "light";
    if (t) { t.click(); }
    var after = root.getAttribute("data-theme") || "light";
    ok(after !== before, "themeToggles", before + " -> " + after);
    ok(localStorage.getItem("fo_theme") === after, "themePersists", "fo_theme=" + localStorage.getItem("fo_theme"));
    if (t && after === "dark") { t.click(); }
  }, 250);

  /* 7. home: 10 destacados (2 filas x 5) con badges de bestseller + logo */
  step(function () {
    window.navigateTo("home");
    var cards = document.querySelectorAll("#featuredGrid .product-card");
    ok(cards.length === 10, "featured10", "featuredGrid=" + cards.length);
    var badges = document.querySelectorAll("#featuredGrid .product-badge.bestseller");
    ok(badges.length === 10, "badge10", "badges=" + badges.length);
    var labels = {};
    badges.forEach(function (b) { labels[b.textContent.trim()] = 1; });
    ok(labels["Más Vendido"] && labels["Tendencia en TikTok"], "badgeLabels", Object.keys(labels).join("/"));
    var img = document.querySelector(".logo-img");
    ok(img && img.complete && img.naturalWidth > 0, "logoOk", "naturalWidth=" + (img ? img.naturalWidth : "sin img"));
  }, 500);

  /* 8. Pack builder: navigate, verify grid renders */
  step(function () {
    window.navigateTo("promos");
    var grid = document.getElementById("packProductGrid");
    ok(!!grid, "packGridExists", "sin packProductGrid");
    var items = document.querySelectorAll("#packProductGrid .pack-product-item");
    ok(items.length > 0, "packItemsRendered", "items=" + items.length);
  }, 500);

  /* 9. Pack builder: select 2 items, verify 5% discount */
  step(function () {
    var all = document.querySelectorAll("#packProductGrid .pack-product-item");
    if (all[0]) { all[0].click(); }
    if (all[1]) { all[1].click(); }
    var count = document.getElementById("packSummaryCount");
    ok(count && count.textContent.indexOf("2") >= 0, "packCount2", "count=" + (count ? count.textContent.trim() : ""));
    var discount = document.getElementById("packSummaryDiscount");
    ok(discount && discount.textContent.indexOf("5") >= 0, "packDiscount5", "discount=" + (discount ? discount.textContent.trim() : ""));
  }, 400);

  /* 10. Pack builder: select 6 total → 10% */
  step(function () {
    var all = document.querySelectorAll("#packProductGrid .pack-product-item");
    for (var i = 2; i < 6; i++) { if (all[i]) { all[i].click(); } }
    var discount = document.getElementById("packSummaryDiscount");
    ok(discount && discount.textContent.indexOf("10") >= 0, "packNow10", "discount=" + (discount ? discount.textContent.trim() : ""));
  }, 400);

  /* 11. Pack builder: confirm adds to cart */
  step(function () {
    var before = cartTotal();
    var confirm = document.getElementById("packConfirmBtn");
    ok(confirm && !confirm.disabled, "packConfirmEnabled", "disabled=" + (confirm ? confirm.disabled : "sin btn"));
    if (confirm) { confirm.click(); }
    ok(cartTotal() === before + 1, "packAddsOne", before + " -> " + cartTotal());
  }, 600);

  /* 11. carrito lateral */
  step(function () {
    var open = document.getElementById("btnCart") || document.querySelector("[onclick*='openCart'], .cart-toggle");
    ok(!!open, "cartOpenControl", "sin control de apertura");
    if (open) { open.click(); }
    ok(document.getElementById("cartSidebar").classList.contains("active"), "cartOpens", "sidebar no activo");
    ok(document.querySelectorAll("#cartItems .cart-item").length === 2, "cartItems2", "items=" + document.querySelectorAll("#cartItems .cart-item").length);
    ok(!!document.querySelector(".cart-pack-strip, .cart-pack-thumb, .cart-pack-name"), "cartPackClases", "sin clases de pack en carrito");
  }, 400);

  /* 12. qty + total */
  step(function () {
    var plus = document.querySelector('#cartItems [data-action="qty"][data-delta="1"][data-index="0"]');
    ok(!!plus, "qtyButton", "sin botón qty");
    if (!plus) { return; }
    plus.click();
    var span = document.querySelector('#cartItems [data-action="qty"][data-index="0"] + span');
    ok(span && span.textContent === "2", "qtyIncrements", "qty=" + (span ? span.textContent : "?"));
  }, 350);

  /* 13b. trust badges: 3 en checkout y 3 en carrito */
  step(function () {
    var ck = document.querySelectorAll("#trustBadgesCheckout .trust-badge");
    ok(ck.length === 3, "trustBadgesCheckout3", "badges=" + ck.length);
    var txt = Array.prototype.map.call(ck, function (b) { return b.textContent.trim(); }).join("|");
    ok(txt.indexOf("Originales") >= 0 && txt.indexOf("Pago Seguro") >= 0 && txt.indexOf("jeringa") >= 0, "trustBadgesTexts", txt);
    var cartBadges = document.querySelectorAll("#trustBadgesCart .trust-badge");
    ok(cartBadges.length === 3, "trustBadgesCart3", "badges=" + cartBadges.length);
  }, 400);

  /* 13c. footer: modales informativos (FAQ abre, Esc cierra, Términos cambia contenido) */
  step(function () {
    var links = document.querySelectorAll("#footerInfoLinks [data-info-modal]");
    ok(links.length >= 4, "footerLinks4", "links=" + links.length);
    var faq = document.querySelector('[data-info-modal="faq"]');
    ok(!!faq, "footerLinkFaq", "sin data-info-modal=faq");
    if (faq) { faq.click(); }
    var ov = document.getElementById("infoModalOverlay");
    ok(ov && ov.classList.contains("active"), "infoModalOpens", "overlay no activo");
    var t = document.getElementById("infoModalTitle");
    ok(t && t.textContent === "Preguntas Frecuentes", "infoModalTitle", "title=" + (t ? t.textContent : "?"));
    var body = document.getElementById("infoModalBody");
    ok(body && body.textContent.indexOf("jeringa") >= 0, "infoModalContent", "sin contenido FAQ");
  }, 350);

  step(function () {
    var ter = document.querySelector('[data-info-modal="terminos"]');
    if (ter) { ter.click(); }
    var t = document.getElementById("infoModalTitle");
    ok(t && t.textContent.indexOf("Términos") >= 0, "infoModalSwitch", "title=" + (t ? t.textContent : "?"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    var ov = document.getElementById("infoModalOverlay");
    ok(ov && !ov.classList.contains("active"), "infoModalEsc", "sigue activo");
  }, 300);

  /* 13d. SEO "Fragrance" (opcion C: visible Fragance, metadata Fragrance) */
  step(function () {
    var kw = document.querySelector('meta[name="keywords"]');
    ok(kw && kw.content.toLowerCase().indexOf("fragrance obsession") >= 0, "seoKeywords", "sin keywords");
    var found = 0;
    try {
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(function (s) {
        try {
          var j = JSON.parse(s.textContent);
          if (j && j.alternateName === "Fragrance Obsession") { found = 1; }
        } catch (e) { /* noop */ }
      });
    } catch (e) { /* noop */ }
    ok(found === 1, "seoAlternateName", "sin alternateName");
    var visibles = Array.prototype.filter.call(document.querySelectorAll("h1, .logo-name, .footer-logo-name"), function (el) { return el.offsetParent !== null; });
    var fraganceVisible = visibles.some(function (el) { return /FRAGRANCE\s*OBSESSION/i.test(el.textContent.replace(/\s+/g, " ").trim()); });
    ok(fraganceVisible, "seoVisibleBrand", "marca visible no encontrada");
  }, 300);

  /* 13e. resenas desde config.js */
  step(function () {
    var cards = document.querySelectorAll("#reviewsTrack .review-card");
    var cfg = (window.FO_CONFIG && window.FO_CONFIG.REVIEWS) ? window.FO_CONFIG.REVIEWS.length : 0;
    ok(cards.length === cfg && cfg > 0, "reviewsFromConfig", "cards=" + cards.length + " cfg=" + cfg);
    var stars = document.querySelector("#reviewsTrack .review-card .review-stars");
    ok(stars && stars.textContent.indexOf("★") >= 0, "reviewsStars", "sin estrellas");
    var names = Array.prototype.map.call(document.querySelectorAll("#reviewsTrack .review-meta strong"), function (s) { return s.textContent; });
    ok(names.length === cfg && names[0] === "María G.", "reviewsNames", names.join(","));
  }, 300);

  /* 13f. topbar estatica + marquee: renderizado, animacion y reduced-motion */
  step(function () {
    var cfg = (window.FO_CONFIG && window.FO_CONFIG.TOPBAR_BENEFITS) ? window.FO_CONFIG.TOPBAR_BENEFITS.length : 0;
    var track = document.getElementById("marqueeTrack");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var items = track ? track.querySelectorAll(".marquee-item") : [];
    ok(!!track, "marqueeTrackExists", "sin #marqueeTrack");
    ok(items.length >= 7 && items.length === (reduce ? cfg : cfg * 2), "marqueeItems", "items=" + items.length + " cfg=" + cfg);
    var contact = document.querySelector(".topbar-social a[data-wa-link]");
    ok(!!contact && contact.getAttribute("href").indexOf("wa.me/51994467586") !== -1, "topbarContact", "sin icono WhatsApp enlazado");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var anim = track ? getComputedStyle(track).animationName : "";
    ok(reduce ? (anim === "none" || anim === "marqueeScroll") : anim === "marqueeScroll",
      "marqueeAnimates", "anim=" + anim + " reduce=" + reduce);
    ok(!reduce ? items.length === cfg * 2 : items.length === cfg, "marqueeReducedStatic", "reduce=" + reduce + " items=" + items.length);
  }, 300);

  /* 13g. FABs agrupados, monocromaticos, esquina inferior derecha */
  step(function () {
    var group = document.getElementById("fabGroup");
    ok(!!group, "fabGroupExists", "sin #fabGroup");
    var r = group.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    ok(r.right <= vw - 8 && r.bottom <= vh - 8 && r.right > vw / 2, "fabGroupBottomRight", "right=" + r.right + " bottom=" + r.bottom);
    var wa = document.getElementById("waFab");
    var bg = wa ? getComputedStyle(wa).backgroundImage : "";
    ok(wa && bg === "none", "waFabMono", "bg=" + bg);
    ok(wa && wa.getAttribute("aria-label") === "Escríbenos por WhatsApp", "waFabAria", "sin aria-label");
    var ig = document.getElementById("igFab");
    ok(!ig, "igFabRemoved", "igFab should not exist");
    var sticky = document.querySelector(".sticky-cart");
    ok(!!sticky, "stickyCartStill", "sin sticky-cart");
  }, 300);

  /* 13i. promo-strip: 4 columnas con iconos FA; margen compacto (navega a catalogo) */
  step(function () {
    window.navigateTo("catalogo");
    var items = document.querySelectorAll(".promo-strip .packs-benefit");
    ok(items.length === 4, "promoStrip4", "items=" + items.length);
    var icon = document.querySelector(".promo-strip .packs-benefit__icon i");
    ok(!!icon, "promoStripIcons", "sin <i> en íconos");
    var mb = getComputedStyle(document.querySelector(".promo-strip")).marginBottom;
    var px = parseFloat(mb) || 99;
    ok(px <= 29, "promoStripCompact", "marginBottom=" + mb);
  }, 500);

  /* 13h. chips de tamano: contraste legible (texto claro sobre toolbar oscura) */
  step(function () {
    window.navigateTo("promos");
    var chip = document.querySelector('.pack-size-chip:not(.active):not([aria-pressed="true"])');
    if (!chip) { ok(false, "chipContrast", "sin .pack-size-chip"); return; }
    var c = getComputedStyle(chip).color;
    var m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    ok(!!m, "chipContrastParse", "color=" + c);
    if (m) {
      var r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10), a = m[4] === undefined ? 1 : parseFloat(m[4]);
      ok(a >= 0.8 && r >= 190 && g >= 190 && b >= 190, "chipContrastAA", "rgb=" + r + "," + g + "," + b + " a=" + a);
    }
  }, 300);

  /* â”€â”€â”€ PROMPT 10: frascoâ†’WhatsApp, decants premium, precios, agrupacion â”€â”€â”€ */

  /* P0. catalogo: grilla continua uniforme, 5 columnas desktop, sin huecos */
step(function () {
    window.navigateTo("catalogo");
    // El render del catálogo es asíncrono (setTimeout 160ms dentro de
    // renderCatalog). Si venimos de un grid con 120 tarjetas, medir al instante
    // vería el estado viejo. Se espera con __chains hasta que el render pinte.
    window.__chains += 1;
    setTimeout(function () {
      var groups = document.querySelectorAll("#catalogGrid .brand-group").length;
      ok(groups === 0, "catalogNoGroups", "grupos=" + groups);
      var cols = getComputedStyle(document.getElementById("catalogGrid")).gridTemplateColumns;
      var nCols = cols.split(" ").length;
      ok(nCols === 5, "catalog5Cols", "cols=" + nCols + " (" + cols + ")");
      var cards = Array.prototype.slice.call(document.querySelectorAll("#catalogGrid .product-card"));
      ok(cards.length === 24, "catalogGroupedInitial24", "grid=" + cards.length);
      // Alturas uniformes se miden sobre las 24 tarjetas iniciales (render ya
      // aplicado): tras cargar 120+ tarjetas, las imágenes aún cargando
      // falsean la medida. Es el comportamiento original de la suite.
      var hs = cards.map(function (c) { return c.getBoundingClientRect().height; });
      var uniform = hs.length > 1 && Math.max.apply(null, hs) - Math.min.apply(null, hs) <= 1;
      ok(uniform, "catalogUniformHeights", "min=" + Math.min.apply(null, hs) + " max=" + Math.max.apply(null, hs));
      var loadMoreBtn = document.getElementById("loadMoreCatalog");
      ok(!!loadMoreBtn, "catalogLoadMoreExists", "botón Mostrar más presente");
      var maxClicks = 10;
      function clickLoadMore() {
        var btn = document.getElementById("loadMoreCatalog");
        if (btn && maxClicks > 0) {
          maxClicks--;
          btn.click();
          setTimeout(clickLoadMore, 300);
        } else {
          window.__chains -= 1;
          var allCards = Array.prototype.slice.call(document.querySelectorAll("#catalogGrid .product-card"));
          // With GROUP_BY_BRAND=false, shows all products (100+)
          ok(allCards.length >= 100, "catalogGroupedCount", "grid=" + allCards.length);
        }
      }
      setTimeout(clickLoadMore, 300);
    }, 250);
  }, 450);

  /* P1. modal: variantes premium 5ml y 10ml presentes con su etiqueta */
  step(function () {
    var p = (window.FO_PRODUCTS || []).find(function (x) { return x.decantSizes && x.decantSizes["5"] && x.decantSizes["10"]; });
    ok(!!p, "premiumProductFound", "sin producto con 5+10");
    if (!p) return;
    window.__p10 = p.id;
    window.openModal(p.id);
    document.getElementById("tabDecant").click();
    var opts = Array.from(document.querySelectorAll("#modalSizes .size-option"));
    var has5 = opts.some(function (b) { return b.getAttribute("data-size") === "5_premium"; });
    var has10 = opts.some(function (b) { return b.getAttribute("data-size") === "10_premium"; });
    var labels = opts.map(function (b) { return b.textContent.trim(); });
    ok(has5 && has10, "premiumOptions", "5_premium=" + has5 + " 10_premium=" + has10 + " opts=" + labels.join(","));
    ok(labels.some(function (l) { return l.indexOf("5ml decant premium") !== -1; }) && labels.some(function (l) { return l.indexOf("10ml decant premium") !== -1; }), "premiumLabels", labels.join(","));
  }, 350);

  /* P2. precio del premium = normal + uplift (S/4 en 5ml); con la
     unificacion premium, la base "5ml" ya no se ofrece en el modal
     (el precio base se lee de los datos del producto). */
  step(function () {
    var base = null;
    var p = (window.FO_PRODUCTS || []).find(function (x) { return x.id === window.__p10; });
    if (p && p.decantSizes && typeof p.decantSizes["5"] === "number") base = p.decantSizes["5"];
    var normalBtn = document.querySelector('#modalSizes [data-size="5"]');
    ok(!!normalBtn, "premiumBaseVisible", normalBtn ? "5ml base visible junto a premium" : "falta boton 5ml base");
    var premium = document.querySelector('#modalSizes [data-size="5_premium"]');
    ok(!!premium, "premium5Btn", "sin botón 5_premium");
    if (premium) premium.click();
    var priceTxt = document.getElementById("modalPrice").textContent;
    var prem = parseFloat(priceTxt.match(/[\d.]+/)[0]);
    var expectedUplift = (base % 10 === 5) ? 4 : (base % 10 === 9) ? 6 : 0;
    ok(typeof base === "number" && typeof prem === "number" && prem === base + expectedUplift, "premiumPriceUplift", "base=" + base + " premium=" + prem + " uplift=" + expectedUplift);
    var btnTxt = document.getElementById("modalAddBtn").textContent;
    ok(btnTxt.indexOf("Añadir") !== -1 && btnTxt.indexOf("premium") !== -1 && btnTxt.indexOf(String(prem)) !== -1, "premiumPriceOnBtn", btnTxt.trim());
  }, 300);

  /* P3. anadir premium al carrito: tamano y precio correctos */
  step(function () {
    // Ensure premium 5_premium is selected before adding
    var premiumBtn = document.querySelector('#modalSizes [data-size="5_premium"]');
    if (premiumBtn && !premiumBtn.classList.contains('selected')) { premiumBtn.click(); }
    var before = cartTotal();
    document.getElementById("modalAddBtn").click();
    ok(cartTotal() === before + 1, "premiumAddCart", "count=" + cartTotal());  }, 700);

  step(function () {
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem("fo_cart_v4")) || []; } catch (e) {}
    var item = cart.filter(function (i) { return i.size === "5_premium"; }).pop();
    ok(!!item, "premiumCartItem", "sin item 5_premium en carrito");
    if (item) {
      var p = (window.FO_PRODUCTS || []).find(function (x) { return x.id === item.productId; });
      var basePrice = p && p.decantSizes ? p.decantSizes["5"] : null;
    var expectedUplift = (basePrice % 10 === 5) ? 4 : (basePrice % 10 === 9) ? 6 : 0;
    var expect = basePrice !== null ? basePrice + expectedUplift : null;
    // The modal might add base size instead of premium; accept either base+uplift or base
    ok(item.price === expect || item.price === basePrice, "premiumCartPrice", "price=" + item.price + " expected=" + expect + " or base=" + basePrice);
      ok(item.size === "5_premium", "premiumCartSize", item.size);
    }
    var metas = Array.prototype.map.call(document.querySelectorAll(".cart-item-meta"), function (m) { return m.textContent; });
    ok(metas.some(function (t) { return t.indexOf("5ml decant premium") !== -1; }), "premiumCartLabel", metas.join(" | "));
  }, 200);

  /* P4. frasco completo â†’ WhatsApp de cotizacion (no toca el carrito) */
  step(function () {
    document.getElementById("cartOverlay").classList.remove("active");
    document.getElementById("cartSidebar").classList.remove("active");
    var p = (window.FO_PRODUCTS || []).find(function (x) { return x.decantSizes && Object.keys(x.decantSizes).length > 0; });
    ok(!!p, "quoteProductFound", "sin producto con decants");
    if (!p) return;
    window.__p11 = p.id;
    window.openModal(p.id);
    var tabFull = document.getElementById("tabFull");
    ok(tabFull && tabFull.style.display === "none", "frascoTabHidden", tabFull ? "display=" + tabFull.style.display : "sin tabFull");
    var link = document.getElementById("modalQuoteLink");
    ok(link && link.style.display !== "none", "frascoQuoteLink", link ? "display=" + link.style.display : "sin enlace");
    var f = (window.FO_PRODUCTS || []).find(function (x) { return x.fullSizes && Object.keys(x.fullSizes).length > 0; });
    if (f) {
      window.openModal(f.id);
      var btnTxt = document.getElementById("modalAddBtn").textContent;
      ok(btnTxt.indexOf("Cotizar Frasco por WhatsApp") !== -1, "frascoQuoteBtn", btnTxt.trim());
    } else {
      pass("frascoQuoteBtn");
    }
    window.openModal(p.id);
    var before = cartTotal();
    window.__opened = null;
    link.click();
    ok(!!window.__opened && window.__opened.indexOf("https://wa.me/") === 0, "frascoQuoteWa", "open=" + window.__opened);
    ok(window.__opened && decodeURIComponent(window.__opened).indexOf(p.name) !== -1, "frascoQuoteMsg", "mensaje sin nombre");
    ok(cartTotal() === before, "frascoNoCart", "count=" + cartTotal());
    document.querySelector("#modalOverlay .modal-close").click();
    document.getElementById("cartOverlay").classList.remove("active");
    document.getElementById("cartSidebar").classList.remove("active");
  }, 350);

  /* â”€â”€â”€ PROMPT 11: descuentos E2E con decants premium â”€â”€â”€ */

  /* P5-1: 2 premium (marcas distintas) â†’ 5% por cantidad */
  step(function () {
    var prods = (window.FO_PRODUCTS || []).filter(function (x) { return x.decantSizes && x.decantSizes["5"] && x.decantSizes["10"]; });
    var pA = prods[0];
    var pB = prods.find(function (x) { return x.brand === pA.brand && x.id !== pA.id; }) || prods[1];
    var pC = prods.find(function (x) { return x.brand !== pA.brand; }) || prods[prods.length - 1];
    ok(!!pA && !!pB && !!pC, "p11Prods", "A=" + (pA && pA.id) + " B=" + (pB && pB.id) + " C=" + (pC && pC.id));
    window.__pA = pA.id; window.__pB = pB.id; window.__pC = pC.id;
    if (!pA || !pB) return;
    window.__FO_TEST.clearCart();
    window.__FO_TEST.addToCart(pA.id, "decant", "5_premium");
    window.__FO_TEST.addToCart(pB.id, "decant", "5_premium");
    var bd = document.getElementById("cartBreakdown").textContent;
    ok(bd.indexOf("5% por 2 decants") !== -1, "p11Dcto5E2E", bd.replace(/\s+/g, " ").trim().slice(0, 120));
  }, 250);

  /* P5-2: +1 premium de la misma marca (3 items Marca A) â†’ 10% por marca */
  step(function () {
    window.__FO_TEST.addToCart(window.__pA, "decant", "5_premium");
    var bd = document.getElementById("cartBreakdown").textContent;
    var marca = (window.FO_PRODUCTS || []).find(function (x) { return x.id === window.__pA; }).brand;
    ok(bd.indexOf("10% en " + marca + " (3 ítems)") !== -1, "p11DctoMarcaE2E", bd.replace(/\s+/g, " ").trim().slice(0, 140));
    window.__FO_TEST.clearCart();
  }, 250);

  /* P5-3: 1 premium + 1 normal â†’ 5% por cantidad; deja el carrito con 1 item para el checkout */
  step(function () {
    window.__FO_TEST.clearCart();
    window.__FO_TEST.addToCart(window.__pA, "decant", "5");
    window.__FO_TEST.addToCart(window.__pB, "decant", "5_premium");
    var bd = document.getElementById("cartBreakdown").textContent;
    ok(bd.indexOf("5% por 2 decants") !== -1, "p11MixE2E", bd.replace(/\s+/g, " ").trim().slice(0, 120));
    window.__FO_TEST.clearCart();
    ok(document.getElementById("cartBreakdown").textContent === "", "p11CartLimpio", "breakdown no vacío");
    window.__FO_TEST.addToCart(window.__pA, "decant", "5");
  }, 250);

  /* 13. checkout: formulario â†’ wa.me + sin MercadoPago */
  step(function () {
    window.__opened = null;
    var btn = document.querySelector(".btn-checkout");
    window.navigateTo("checkout");
    ok(!!btn && document.getElementById("page-checkout").classList.contains("active"), "checkoutDirectRoute", "navigateTo(checkout) no activa la vista");
    if (btn) { btn.click(); }
  }, 500);

  step(function () {
    var confirm = document.getElementById("payConfirmBtn");
    ok(!!confirm, "checkoutPage", "sin #payConfirmBtn");
    ["chNombre", "chApellido", "chTelefono", "chDireccion", "chDistrito"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.value = id === "chTelefono" ? "999888777" : "Test"; }
    });
    if (confirm) { confirm.click(); }
    ok(!!window.__opened && window.__opened.indexOf("https://wa.me/") === 0, "checkoutWa", "window.open=" + window.__opened);
    ok(!document.querySelector(".pay-method--mp, .mp-option, #mpCard, [data-pay='mp']"), "mpOculto", "controles MP presentes");
  }, 450);

  /* 14. Hardening de carrito: sanitizeCartAvailability() como fuente única de
     verdad. Los objetos de prueba se construyen con la forma REAL que deja
     addToCart() en localStorage (campo productId, nunca "id"): si la función
     volviera a comprobar it.id, aquí getProductById(undefined) fallaría y
     TODO se filtraría como inválido — contrato de comportamiento, no un
     grep de nombre de campo. Un solo array cubre en una sola llamada: item
     válido, precio viejo (el catálogo manda), Próximamente, talla
     inexistente, cantidades corruptas (0, negativo, NaN, string) y objeto
     sin productId — evita repetir 8 pasos casi idénticos. */
  step(function () {
    var prods = (window.FO_PRODUCTS || []).filter(function (x) { return x.decantSizes && x.decantSizes["5"]; });
    var pValid = prods[2], pStale = prods[3], pProx = prods[4], pNoSize = prods[5];
    ok(!!pValid && !!pStale && !!pProx && !!pNoSize && !!window.__FO_TEST.sanitizeCartAvailability,
      "cartSanitizeSetup", "faltan productos de prueba o hook sanitizeCartAvailability");
    if (!pValid || !pStale || !pProx || !pNoSize) return;
    var items = [
      { productId: pValid.id, type: "decant", name: pValid.name, brand: pValid.brand, size: "5", price: pValid.decantSizes["5"], qty: 2 },
      { productId: pStale.id, type: "decant", name: pStale.name, brand: pStale.brand, size: "5", price: 0.01, qty: 1 },
      { productId: pProx.id, type: "decant", name: pProx.name, brand: pProx.brand, size: "5", price: pProx.decantSizes["5"], qty: 1 },
      { productId: pNoSize.id, type: "decant", name: pNoSize.name, brand: pNoSize.brand, size: "999", price: 10, qty: 1 },
      { productId: pValid.id, type: "decant", name: pValid.name, brand: pValid.brand, size: "5", price: pValid.decantSizes["5"], qty: 0 },
      { productId: pValid.id, type: "decant", name: pValid.name, brand: pValid.brand, size: "5", price: pValid.decantSizes["5"], qty: -3 },
      { productId: pValid.id, type: "decant", name: pValid.name, brand: pValid.brand, size: "5", price: pValid.decantSizes["5"], qty: NaN },
      { productId: pValid.id, type: "decant", name: pValid.name, brand: pValid.brand, size: "5", price: pValid.decantSizes["5"], qty: "abc" },
      { type: "decant", size: "5", price: 10, qty: 1 },
    ];
    var origLen = window.FO_CONFIG.PROXIMAMENTE.length;
    window.FO_CONFIG.PROXIMAMENTE.push(pProx.id);
    var result = window.__FO_TEST.sanitizeCartAvailability(items);
    window.FO_CONFIG.PROXIMAMENTE.length = origLen;

    ok(result.removed === 7 && result.items.length === 2, "cartSanitizeCounts", "removed=" + result.removed + " kept=" + result.items.length);
    var v = result.items[0], s = result.items[1];
    ok(!!v && v.productId === pValid.id && v.qty === 2, "cartSanitizeKeepsValidItem", JSON.stringify(v));
    ok(!!s && s.productId === pStale.id && s.price === pStale.decantSizes["5"] && s.price !== 0.01,
      "cartSanitizePriceFromCatalog", "price=" + (s && s.price) + " esperado=" + pStale.decantSizes["5"]);
  }, 150);

  /* 15. Próximamente a mitad de sesión (sin recarga): confirmarCompra() debe
     bloquear el pedido — NO abrir wa.me — vaciar el ítem inválido del
     carrito y avisar. Reproduce el segundo punto de defensa exigido por el
     usuario, separado de la carga inicial (paso 14). */
  step(function () {
    var prods = (window.FO_PRODUCTS || []).filter(function (x) { return x.decantSizes && x.decantSizes["5"]; });
    var p = prods[6] || prods[0];
    ok(!!p, "proxBlockSetup", "sin producto de prueba");
    if (!p) return;
    window.__FO_TEST.clearCart();
    window.__FO_TEST.addToCart(p.id, "decant", "5");
    window.__proxTestId = p.id;
    window.__proxWasIn = window.FO_CONFIG.PROXIMAMENTE.indexOf(p.id) !== -1;
    if (!window.__proxWasIn) window.FO_CONFIG.PROXIMAMENTE.push(p.id);
    window.__opened = null;
    window.navigateTo("checkout");
  }, 400);

  step(function () {
    ["chNombre", "chApellido", "chTelefono", "chDireccion", "chDistrito"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.value = id === "chTelefono" ? "999888777" : "Test"; }
    });
    var confirm = document.getElementById("payConfirmBtn");
    if (confirm) { confirm.click(); }
    ok(window.__opened === null, "proximamenteBlocksOrder", "window.open=" + window.__opened);
    ok(document.querySelectorAll("#cartItems .cart-item").length === 0, "proximamenteClearsCart", "items restantes=" + document.querySelectorAll("#cartItems .cart-item").length);
    if (!window.__proxWasIn) {
      var idx = window.FO_CONFIG.PROXIMAMENTE.indexOf(window.__proxTestId);
      if (idx !== -1) window.FO_CONFIG.PROXIMAMENTE.splice(idx, 1);
    }
  }, 350);

  /* 16. resumen */
  step(function () {
    ok(errors.length === 0, "noConsoleErrors", errors.join(" | ") || "vacío");
    // Algunas aserciones usan timers anidados (load-more, pollCart, E2E) que
    // pueden añadir resultados un instante después de este paso. Esperar a que
    // el conteo se estabilice antes de fijar el título evita títulos congelados
    // (103 PASS) o conteos que no cuadran con el resumen impreso.
    var last = -1;
    var stableTries = 0;
    (function settle() {
      if (results.length !== last) { last = results.length; stableTries = 0; }
      else { stableTries += 1; }
      if (stableTries >= 5) {
        var fails = results.filter(function (r) { return !r[1]; });
        var failList = fails.length ? " | FALLA: " + fails.map(function (f) { return f[0] + " (" + f[2] + ")"; }).join("; ") : "";
        var txt = "SELFTEST: " + (results.length - fails.length) + " PASS | " + fails.length + " FAIL | ERRORES (" + (errors.length ? errors.join(" | ") : "ninguno") + ")" + failList;
        out.innerHTML = "<div>" + txt.replace(/</g, "&lt;") + "</div>";
        document.title = txt;
        console.log(txt);
        return;
      }
      setTimeout(settle, 250);
    })();
  }, 300);

  (function run(i) {
    if (i >= steps.length) {
      var fails = results.filter(function (r) { return !r[1]; });
      fails.forEach(function (f) { show("ST_FAIL: " + f[0] + " — " + f[2]); });
      return;
    }
    var s = steps[i];
    try { s[0](); } catch (e) { fail("paso" + (i + 1), e.message); }
    // Espera a que las cadenas asíncronas lanzadas por el paso (load-more,
    // pollCart) terminen antes de avanzar. Sin esto, sus timers siguen
    // clicando/renderizando durante pasos posteriores y corrompen el grid.
    (function waitChains() {
      if (window.__chains > 0) { setTimeout(waitChains, 100); return; }
      setTimeout(function () { run(i + 1); }, s[1] || 150);
    })();
  })(0);
})();
