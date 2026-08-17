/* animations.js — Fragance Obsession v2
   Expone window.FraganceAnimations = { refresh, destroy }
   para que script.js llame refresh() después de cada render.
   Vanilla JS, sin build step, sin dependencias externas propias.
*/
(function () {
  "use strict";

  /* ─── Estado interno ──────────────────────────────────────── */
  var _lenis    = null;
  var _observers = [];   /* MutationObservers activos */
  var _gsapCtx  = null;  /* contexto GSAP para cleanup limpio */

  var EASE_OUT = "power3.out";
  var EASE_SPRING = "back.out(1.2)";

  /* ─── Reducción de movimiento ─────────────────────────────── */
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─── Helpers ─────────────────────────────────────────────── */
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function hasGsap() { return typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined"; }
  function hasLenis() { return typeof Lenis !== "undefined"; }

  /* ══════════════════════════════════════════════════════════
     1. LENIS — Smooth scroll con integración GSAP ticker
  ══════════════════════════════════════════════════════════ */
  function initLenis() {
    if (!hasLenis()) return;

    _lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.3,
    });

    window.__fo_lenis = _lenis;
    document.documentElement.style.scrollBehavior = "auto";

    /* Parchamos scrollTo para que navigateTo() use Lenis */
    var _origScrollTo = window.scrollTo.bind(window);
    window.scrollTo = function (xOrOpts, y) {
      if (xOrOpts && typeof xOrOpts === "object" && "top" in xOrOpts) {
        _lenis.scrollTo(xOrOpts.top || 0, { duration: 0.8 });
      } else {
        _origScrollTo(xOrOpts, y);
      }
    };

    if (hasGsap()) {
      _lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { _lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { _lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }

  /* ══════════════════════════════════════════════════════════
     2. SCROLL REVEALS — Secciones estáticas
  ══════════════════════════════════════════════════════════ */
  function initScrollReveals() {
    if (!hasGsap() || prefersReduced) return;
    gsap.registerPlugin(ScrollTrigger);

    /* Section headers */
    gsap.utils.toArray(".section-header").forEach(function (el) {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" },
        y: 40, opacity: 0, duration: 0.85, ease: EASE_OUT,
      });
    });

    /* Trust cards */
    var trust = gsap.utils.toArray(".trust-card");
    if (trust.length) {
      gsap.from(trust, {
        scrollTrigger: { trigger: ".trust-grid", start: "top 84%", toggleActions: "play none none none" },
        y: 50, opacity: 0, scale: 0.96,
        duration: 0.7, stagger: 0.12, ease: EASE_OUT, clearProps: "transform",
      });
    }

    /* Review cards */
    var reviews = gsap.utils.toArray(".review-card");
    if (reviews.length) {
      gsap.from(reviews, {
        scrollTrigger: { trigger: ".reviews-carousel", start: "top 84%", toggleActions: "play none none none" },
        y: 35, opacity: 0, duration: 0.6, stagger: 0.08, ease: EASE_OUT, clearProps: "transform",
      });
    }

    /* Stats bar */
    var statsInner = document.querySelector(".stats-inner");
    if (statsInner) {
      gsap.from(statsInner, {
        scrollTrigger: { trigger: ".stats-bar", start: "top 92%", toggleActions: "play none none none" },
        y: 24, opacity: 0, duration: 0.7, ease: EASE_OUT,
      });
    }

    /* TikTok cards */
    var tiktok = gsap.utils.toArray(".tiktok-card");
    if (tiktok.length) {
      gsap.from(tiktok, {
        scrollTrigger: { trigger: ".tiktok-grid", start: "top 85%", toggleActions: "play none none none" },
        y: 38, opacity: 0, scale: 0.97,
        duration: 0.6, stagger: 0.09, ease: EASE_OUT, clearProps: "transform",
      });
    }

    /* Footer */
    var footerBrand = document.querySelector(".footer-brand");
    if (footerBrand) {
      gsap.from(footerBrand, {
        scrollTrigger: { trigger: ".footer", start: "top 90%", toggleActions: "play none none none" },
        y: 26, opacity: 0, duration: 0.65, ease: EASE_OUT,
      });
    }
    var footerCols = gsap.utils.toArray(".footer-col");
    if (footerCols.length) {
      gsap.from(footerCols, {
        scrollTrigger: { trigger: ".footer", start: "top 88%", toggleActions: "play none none none" },
        y: 26, opacity: 0, duration: 0.65, stagger: 0.1, ease: EASE_OUT,
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     3. CATEGORY SHOWCASE — animaciones de entrada
     Se llama UNA VEZ al cargar y de nuevo si se regeneran
     las tiles (actualmente no ocurre, pero por futuro).
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
     Sólo en pointer: fine (desktop), no interfiere con touch.
  ══════════════════════════════════════════════════════════ */
  function initHoverTilt() {
    if (!window.matchMedia("(pointer: fine)").matches || prefersReduced) return;

    document.querySelectorAll(".cat-tile").forEach(function (tile) {
      var img = tile.querySelector(".cat-tile__img img");
      var body = tile.querySelector(".cat-tile__body");

      tile.addEventListener("mousemove", function (e) {
        var r = tile.getBoundingClientRect();
        var xPct = (e.clientX - r.left) / r.width  - 0.5;   /* -0.5 .. 0.5 */
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
     5. PRODUCT GRID ANIMATIONS — stagger tras renderizado
  ══════════════════════════════════════════════════════════ */
  function animateGrid(container, selector) {
    if (!hasGsap() || prefersReduced || !container) return;
    var items = container.querySelectorAll(selector);
    if (!items.length) return;

    gsap.fromTo(items,
      { y: 28, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.48, stagger: 0.06, ease: EASE_OUT, clearProps: "transform,opacity" }
    );
  }

  function initProductGridAnimations() {
    var grid = document.getElementById("catalogGrid");
    if (grid && grid.children.length) animateGrid(grid, ".product-card");

    _observers.push(observeGrid("catalogGrid",  ".product-card"));
    _observers.push(observeGrid("featuredGrid", ".product-card"));
    _observers.push(observeGrid("promoGrid",    ".promo-card"));
  }

  function observeGrid(id, sel) {
    var el = document.getElementById(id);
    if (!el) return null;

    var observer = new MutationObserver(function (mutations) {
      var hasAdded = mutations.some(function (m) { return m.addedNodes.length > 0; });
      if (hasAdded) animateGrid(el, sel);
    });
    observer.observe(el, { childList: true });
    return observer;
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
     7. MAGNETIC BUTTONS — btn-gold
  ══════════════════════════════════════════════════════════ */
  function initMagneticButtons() {
    if (!window.matchMedia("(pointer: fine)").matches || prefersReduced) return;

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
     refresh()  → llamar después de cada renderizado dinámico
     destroy()  → limpiar todo (Lenis, observers, ScrollTrigger)
  ══════════════════════════════════════════════════════════ */
  function refresh() {
    /* Refresca ScrollTrigger cuando el DOM cambia */
    if (hasGsap()) {
      ScrollTrigger.refresh(true);
    }
  }

  function destroy() {
    if (_lenis) { _lenis.destroy(); _lenis = null; }
    _observers.forEach(function (obs) { if (obs) obs.disconnect(); });
    _observers = [];
    if (hasGsap()) { ScrollTrigger.getAll().forEach(function (st) { st.kill(); }); }
  }

  window.FraganceAnimations = { refresh: refresh, destroy: destroy };

  /* ── Boot ─────────────────────────────────────────────── */
  ready(function () {
    initLenis();
    if (hasGsap()) gsap.registerPlugin(ScrollTrigger);
    initScrollReveals();
    initCategoryShowcaseAnimations();
    initHoverTilt();
    initProductGridAnimations();
    initCounters();
    initMagneticButtons();
  });

})();
