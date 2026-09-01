/* animations.js — Fragrance Obsession v3
   Expone window.FraganceAnimations = { refresh, destroy }
   para que script.js llame refresh() después de cada render.
   Vanilla JS, sin build step.
   Stack: GSAP 3 + ScrollTrigger únicamente (reveals de sección y
   contadores). Los hovers/microinteracciones viven en CSS puro
   (transiciones), no dependen de JS ni de ninguna librería extra.
*/
(function () {
  "use strict";

  /* ─── Estado interno ──────────────────────────────────────── */
  var _observers = [];   /* MutationObservers activos */

  var EASE_OUT = "power3.out";
  var EASE_SPRING = "back.out(1.2)";

  /* ─── Reducción de movimiento ─────────────────────────────── */
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 768px)").matches;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function hasGsap() { return typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined"; }

  /* ══════════════════════════════════════════════════════════
     1. HERO — Entrada cinematográfica (letra a letra para
        título, fade mascaráro para contenido de hero)
  ══════════════════════════════════════════════════════════ */
  function initHeroEntrance() {
    if (!hasGsap() || prefersReduced) return;
    var heroContent = document.querySelector(".hero-content");
    if (!heroContent) return;

    gsap.set(heroContent, { autoAlpha: 1 });

    /* Badge de hero */
    var badge = heroContent.querySelector(".hero-badge");
    if (badge) {
      gsap.from(badge, {
        y: 14, opacity: 0, scale: .92, duration: .65, ease: "back.out(2)",
        scrollTrigger: { trigger: ".hero", start: "top 90%", toggleActions: "play none none none" }
      });
    }

    /* Title — cada línea con máscara de clip + stagger */
    var title = heroContent.querySelector("h1");
    if (title) {
      var lines = title.innerHTML.split("<br>");
      title.innerHTML = lines.map(function(line){
        return '<span class="hero-line"><span class="hero-line-inner">' + line + '</span></span>';
      }).join("");
      gsap.from(".hero-line-inner", {
        yPercent: 100, duration: 1, ease: "power4.out",
        stagger: .12,
        scrollTrigger: { trigger: ".hero", start: "top 88%", toggleActions: "play none none none" }
      });
    }

    /* Subtitle, CTAs, stats — cascade */
    var cascade = [".hero-content p", ".hero-cta-group", ".hero-stats"];
    gsap.from(cascade, {
      y: 22, opacity: 0, duration: .75, ease: EASE_OUT,
      stagger: .08,
      scrollTrigger: { trigger: ".hero", start: "top 80%", toggleActions: "play none none none" }
    });

    /* Scroll indicator pulse */
    var line = document.querySelector(".hero-scroll-line");
    if (line) {
      gsap.to(line, {
        scaleY: 1, duration: 1.6, repeat: -1, yoyo: true, ease: "sine.inOut",
        transformOrigin: "top"
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     2. SCROLL REVEALS — Secciones estáticas
  ══════════════════════════════════════════════════════════ */
  function initScrollReveals() {
    if (!hasGsap() || prefersReduced) return;
    gsap.registerPlugin(ScrollTrigger);

    var dur = isMobile ? 0.5 : 0.85;
    var stag = isMobile ? 0.04 : 0.12;

    /* Section headers */
    gsap.utils.toArray(".section-header").forEach(function (el) {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" },
        y: isMobile ? 20 : 40, opacity: 0, duration: dur, ease: EASE_OUT,
      });
    });

    /* Trust cards */
    var trust = gsap.utils.toArray(".trust-card");
    if (trust.length) {
      gsap.from(trust, {
        scrollTrigger: { trigger: ".trust-grid", start: "top 84%", toggleActions: "play none none none" },
        y: isMobile ? 24 : 50, opacity: 0, scale: 0.98,
        duration: isMobile ? 0.45 : 0.7, stagger: stag, ease: EASE_OUT, clearProps: "transform",
      });
    }

    /* Review cards */
    var reviews = gsap.utils.toArray(".review-card");
    if (reviews.length) {
      gsap.from(reviews, {
        scrollTrigger: { trigger: ".reviews-carousel", start: "top 84%", toggleActions: "play none none none" },
        y: isMobile ? 16 : 35, opacity: 0, duration: isMobile ? 0.4 : 0.6, stagger: stag, ease: EASE_OUT, clearProps: "transform",
      });
    }

    /* Stats bar */
    var statsInner = document.querySelector(".stats-inner");
    if (statsInner) {
      gsap.from(statsInner, {
        scrollTrigger: { trigger: ".stats-bar", start: "top 92%", toggleActions: "play none none none" },
        y: isMobile ? 12 : 24, opacity: 0, duration: isMobile ? 0.45 : 0.7, ease: EASE_OUT,
      });
    }

    /* TikTok cards */
    var tiktok = gsap.utils.toArray(".tiktok-card");
    if (tiktok.length) {
      gsap.from(tiktok, {
        scrollTrigger: { trigger: ".tiktok-grid", start: "top 85%", toggleActions: "play none none none" },
        y: isMobile ? 18 : 38, opacity: 0, scale: 0.98,
        duration: isMobile ? 0.4 : 0.6, stagger: stag, ease: EASE_OUT, clearProps: "transform",
      });
    }

    /* FAQ items */
    var faqItems = gsap.utils.toArray(".faq-item");
    if (faqItems.length) {
      gsap.from(faqItems, {
        scrollTrigger: { trigger: ".section-faq", start: "top 85%", toggleActions: "play none none none" },
        y: isMobile ? 12 : 24, opacity: 0, duration: isMobile ? 0.35 : 0.5, stagger: stag, ease: EASE_OUT, clearProps: "transform,opacity",
      });
    }

    /* Footer */
    var footerBrand = document.querySelector(".footer-brand");
    if (footerBrand) {
      gsap.from(footerBrand, {
        scrollTrigger: { trigger: ".footer", start: "top 90%", toggleActions: "play none none none" },
        y: isMobile ? 14 : 26, opacity: 0, duration: isMobile ? 0.4 : 0.65, ease: EASE_OUT,
      });
    }
    var footerCols = gsap.utils.toArray(".footer-col");
    if (footerCols.length) {
      gsap.from(footerCols, {
        scrollTrigger: { trigger: ".footer", start: "top 88%", toggleActions: "play none none none" },
        y: isMobile ? 14 : 26, opacity: 0, duration: isMobile ? 0.4 : 0.65, stagger: stag, ease: EASE_OUT,
      });
    }

    /* Page hero (catálogo / promos) */
    gsap.utils.toArray(".page-hero").forEach(function(el){
      gsap.from(el.querySelector(".page-hero-content") || el, {
        scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" },
        y: 20, opacity: 0, duration: .7, ease: EASE_OUT,
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     3. CATEGORY SHOWCASE — animaciones de entrada
  ══════════════════════════════════════════════════════════ */
  function initCategoryShowcaseAnimations() {
    if (!hasGsap() || prefersReduced) return;
    var tiles = document.querySelectorAll(".cat-tile");
    if (!tiles.length) return;
    gsap.fromTo(tiles,
      { opacity: 0, y: 28, scale: 0.97 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.7, stagger: { amount: 0.5, from: "start" },
        ease: EASE_OUT, clearProps: "transform,opacity",
        scrollTrigger: { trigger: ".cat-showcase", start: "top 85%", toggleActions: "play none none none" },
      }
    );
  }

  /* ══════════════════════════════════════════════════════════
     4. HOVER TILT — efecto parallax sutil en cat-tile
        (solo puntero fino / desktop; nunca en móvil)
  ══════════════════════════════════════════════════════════ */
  function initHoverTilt() {
    if (!window.matchMedia("(pointer: fine)").matches || prefersReduced || isMobile) return;
    document.querySelectorAll(".cat-tile").forEach(function (tile) {
      var img = tile.querySelector(".cat-tile__img img");
      var body = tile.querySelector(".cat-tile__body");
      tile.addEventListener("mousemove", function (e) {
        var r = tile.getBoundingClientRect();
        var xPct = (e.clientX - r.left) / r.width  - 0.5;
        var yPct = (e.clientY - r.top)  / r.height - 0.5;
        if (hasGsap()) {
          gsap.to(img,  { rotateY: xPct * 5, rotateX: -yPct * 4, scale: 1.07, duration: 0.4, ease: "none" });
          gsap.to(body, { x: xPct * 8, y: yPct * 4, duration: 0.35, ease: "none" });
        }
      });
      tile.addEventListener("mouseleave", function () {
        if (hasGsap()) {
          gsap.to(img,  { rotateY: 0, rotateX: 0, scale: 1.06, duration: 0.55, ease: EASE_SPRING });
          gsap.to(body, { x: 0, y: 0, duration: 0.45, ease: EASE_SPRING });
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     5. PRODUCT GRID — stagger + sentinel reveal.
     Anima SOLO las primeras N tarjetas (fix rendimiento) y
     añade una animación de entrada al hacer scroll.
     El hover de cada tarjeta (zoom de imagen, elevación) vive
     en CSS puro (.product-card:hover) — no requiere JS.
  ══════════════════════════════════════════════════════════ */
  function animateGrid(container, selector) {
    if (!hasGsap() || prefersReduced || !container) return;
    var items = container.querySelectorAll(selector);
    if (!items.length) return;
    var toAnimate = Array.prototype.slice.call(items, 0, isMobile ? 12 : 24);

    gsap.fromTo(toAnimate,
      { y: isMobile ? 16 : 28, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: isMobile ? 0.35 : 0.48, stagger: isMobile ? 0.03 : 0.06, ease: EASE_OUT, clearProps: "transform,opacity" }
    );
  }

  function watchGrid(id, sel) {
    var el = document.getElementById(id);
    if (!el) return null;
    var observer = new MutationObserver(function (mutations) {
      if (mutations.some(function (m) { return m.addedNodes.length > 0; })) {
        animateGrid(el, sel);
      }
    });
    observer.observe(el, { childList: true });
    return observer;
  }

  function initProductGridAnimations() {
    var grid = document.getElementById("catalogGrid");
    if (grid && grid.children.length) animateGrid(grid, ".product-card");
    _observers.push(watchGrid("catalogGrid",  ".product-card"));
    _observers.push(watchGrid("featuredGrid", ".product-card"));
    _observers.push(watchGrid("packProductGrid", ".pack-product-item"));
  }

  /* ══════════════════════════════════════════════════════════
     6. COUNTERS — stats bar
  ══════════════════════════════════════════════════════════ */
  function initCounters() {
    if (!hasGsap() || prefersReduced) return;
    document.querySelectorAll(".stat-number").forEach(function (el) {
      var original = el.textContent.trim();
      var match = original.match(/^([^0-9]*)([0-9,]+(?:\.[0-9]+)?)(.*)$/);
      if (!match) return;
      var prefix  = match[1];
      var numStr  = match[2].replace(/,/g, "");
      var suffix  = match[3];
      var target  = parseFloat(numStr);
      var isFloat = numStr.indexOf(".") !== -1;
      var dec     = isFloat ? numStr.split(".")[1].length : 0;
      var obj     = { val: 0 };
      gsap.to(obj, {
        scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none", once: true },
        val: target, duration: 2.1, ease: "power2.out",
        onUpdate: function () {
          var v = obj.val;
          var d = isFloat
            ? v.toFixed(dec)
            : (target >= 1000 ? Math.floor(v).toLocaleString("es-PE") : String(Math.floor(v)));
          el.textContent = prefix + d + suffix;
        },
        onComplete: function () { el.textContent = original; },
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     7. MAGNETIC BUTTONS — bot. gold
        (CSS transition + estilo inline puntual, sin librería;
        solo puntero fino / desktop)
  ══════════════════════════════════════════════════════════ */
  function initMagneticButtons() {
    if (!window.matchMedia("(pointer: fine)").matches || prefersReduced || isMobile) return;
    var STRENGTH = 0.22;
    document.querySelectorAll(".btn-gold").forEach(function (btn) {
      var rect;
      btn.addEventListener("mouseenter", function () {
        rect = btn.getBoundingClientRect();
        btn.style.transition = "transform 0.08s linear";
      });
      btn.addEventListener("mousemove", function (e) {
        if (!rect) return;
        var x = (e.clientX - rect.left  - rect.width  / 2) * STRENGTH;
        var y = (e.clientY - rect.top   - rect.height / 2) * STRENGTH;
        btn.style.transform = "translate(" + x + "px," + (y - 2) + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        rect = null;
        btn.style.transition = "transform 0.48s cubic-bezier(.25,.8,.25,1.2)";
        btn.style.transform = "";
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     8. PUBLIC API — window.FraganceAnimations
  ══════════════════════════════════════════════════════════ */
  function refresh() {
    if (hasGsap()) { ScrollTrigger.refresh(true); }
  }

  function destroy() {
    _observers.forEach(function (obs) { if (obs) obs.disconnect(); });
    _observers = [];
    if (hasGsap()) { ScrollTrigger.getAll().forEach(function (st) { st.kill(); }); }
  }

  window.FraganceAnimations = { refresh: refresh, destroy: destroy };

  /* ── Boot ─────────────────────────────────────────────── */
  ready(function () {
    if (hasGsap()) gsap.registerPlugin(ScrollTrigger);
    initHeroEntrance();
    initScrollReveals();
    initCategoryShowcaseAnimations();
    initHoverTilt();
    initProductGridAnimations();
    initCounters();
    initMagneticButtons();
  });

})();
