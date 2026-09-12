/* ════════════════════════════════════════════════════════════════
   DESCUENTOS Y PROMOCIONES — FRAGANCE OBSESSION
   ────────────────────────────────────────────────────────────────
   Lógica única de descuentos. Carga antes que script.js.
   Configurable en config.js → window.FO_CONFIG.DESCUENTOS.

   Reglas (por defecto):
   1) Por cantidad (solo decants de 1ml a 10ml, ver POR_CANTIDAD.tamMaxMl):
      2-5 decants → 5% · 6-9 decants → 10% · 10+ decants → 15% (sobre el
      subtotal de esos decants elegibles). Excluyente: solo el mayor.
   2) Por marca: 3+ decants elegibles de la misma marca → 10% sobre el
      subtotal de esos decants (los sellados no participan).
   3) Umbral: subtotal final >= S/199 → vial de regalo + envío gratis.
   4) ACUMULAR_DESCUENTOS: false = se aplica SOLO la regla que dé
      mayor descuento (cantidad o marca), nunca ambas.
   Los packs (FO_PROMOS) ya tienen precio promocional: no reciben
   descuento, pero sí cuentan para el subtotal del umbral.
   ════════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";

  function redondear(n) {
    return Math.round(n * 100) / 100;
  }

  function isDiscountEligibleSize(size) {
    var cfg = (w.FO_CONFIG && w.FO_CONFIG.DESCUENTOS) || {};
    var pc = cfg.POR_CANTIDAD;
    if (!cfg.ACTIVOS || !pc || pc.activo !== true) return false;
    var ml = parseInt(String(size).replace("_premium", ""), 10);
    var tamMax = pc.tamMaxMl || 10;
    return !isNaN(ml) && ml >= 1 && ml <= tamMax;
  }

  function calcularDescuentos(items) {
    var cfg = (w.FO_CONFIG && w.FO_CONFIG.DESCUENTOS) || {};
    var out = {
      subtotalOriginal: 0,
      descuentoCantidad: 0,
      descuentoMarca: 0,
      descuentoTotal: 0,
      subtotalFinal: 0,
      aplicaEnvioGratis: false,
      vialGratisAgregado: false,
      cantDecants: 0,
      cantDecantsElegibles: 0,
      detalleCantidad: null,
      detalleMarcas: [],
    };

    var todos = items || [];
    var pagables = todos.filter(function (it) {
      return !it.isPack;
    });
    var subtotalDe = function (arr) {
      return arr.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
    };

    out.subtotalOriginal = redondear(subtotalDe(todos));
    var decants = pagables.filter(function (it) { return it.type === "decant"; });
    out.cantDecants = decants.reduce(function (s, it) { return s + it.qty; }, 0);

    /* El switch global ACTIVOS sigue apagando TODO el sistema de promos
       (descuentos + umbral): comportamiento intencional preservado. */
    if (!cfg.ACTIVOS) {
      out.subtotalFinal = out.subtotalOriginal;
      return out;
    }

    /* pagables.length === 0 (carrito solo con packs) YA NO corta antes del
       umbral: los packs no reciben descuento 5/10/15 (no hay decants
       "pagables" que evaluar en los pasos 1 y 2), pero sí deben poder
       alcanzar el umbral de S/199 con su propio subtotal — de lo
       contrario un pack de S/235.60 nunca desbloquea envío gratis ni vial
       de regalo, y la UI cae en la contradicción "Te faltan S/0.00" +
       "No incluido". Pasos 1 y 2 se saltan; el paso 4 (umbral) SIEMPRE se
       evalúa cuando ACTIVOS es true. */
    /* 1) Descuento por cantidad de decants — solo presentaciones de 1ml a
       10ml (POR_CANTIDAD.tamMaxMl) cuentan y reciben este descuento; los
       decants de 20ml/30ml quedan fuera (piden más volumen, no aplica el
       incentivo de "prueba y compra más"). Sin tamMaxMl configurado, no
       se restringe (compatibilidad hacia atrás). */
    if (pagables.length > 0 && cfg.POR_CANTIDAD && cfg.POR_CANTIDAD.activo) {
      var tamMax = cfg.POR_CANTIDAD.tamMaxMl;
      var decantsElegibles = !tamMax ? decants : decants.filter(function (it) {
        return isDiscountEligibleSize(it.size);
      });
      var cantElegible = decantsElegibles.reduce(function (s, it) { return s + it.qty; }, 0);
      out.cantDecantsElegibles = cantElegible;
      if (cantElegible >= 2) {
        var pctCant = cantElegible >= 10 ? cfg.POR_CANTIDAD.min10
          : cantElegible >= 6 ? cfg.POR_CANTIDAD.min6
          : cfg.POR_CANTIDAD.min2;
        var baseCant = subtotalDe(decantsElegibles);
        out.descuentoCantidad = redondear(baseCant * (pctCant / 100));
        out.detalleCantidad = {
          pct: pctCant,
          monto: out.descuentoCantidad,
          base: redondear(baseCant),
          cant: cantElegible,
        };
      }
    }

    /* 2) Descuento por marca repetida (3+ decants elegibles de la misma marca).
       Solo cuentan decants de 1ml a 10ml (misma restricción que POR_CANTIDAD).
       Sellados, testers y parciales NO participan en este descuento. */
    if (cfg.POR_MARCA && cfg.POR_MARCA.activo) {
      var tamMaxMarca = (cfg.POR_CANTIDAD && cfg.POR_CANTIDAD.tamMaxMl) || 10;
      var decantsMarca = pagables.filter(function (it) {
        if (it.type !== "decant") return false;
        var ml = parseInt(String(it.size).replace("_premium", ""), 10);
        return !isNaN(ml) && ml >= 1 && ml <= tamMaxMarca;
      });
      var porMarca = {};
      decantsMarca.forEach(function (it) {
        porMarca[it.brand] = (porMarca[it.brand] || 0) + it.qty;
      });
      Object.keys(porMarca).forEach(function (marca) {
        if (porMarca[marca] >= cfg.POR_MARCA.minItems) {
          var itemsMarca = decantsMarca.filter(function (it) { return it.brand === marca; });
          var baseMarca = subtotalDe(itemsMarca);
          var montoMarca = redondear(baseMarca * (cfg.POR_MARCA.porcentaje / 100));
          out.descuentoMarca = redondear(out.descuentoMarca + montoMarca);
          out.detalleMarcas.push({
            marca: marca,
            pct: cfg.POR_MARCA.porcentaje,
            monto: montoMarca,
            base: redondear(baseMarca),
            cant: porMarca[marca],
          });
        }
      });
    }

    /* 3) Acumulación o solo la regla de mayor descuento */
    if (cfg.ACUMULAR_DESCUENTOS) {
      out.descuentoTotal = redondear(out.descuentoCantidad + out.descuentoMarca);
    } else if (out.descuentoCantidad >= out.descuentoMarca) {
      out.descuentoTotal = out.descuentoCantidad;
      out.descuentoMarca = 0;
      out.detalleMarcas = [];
    } else {
      out.descuentoTotal = out.descuentoMarca;
      out.descuentoCantidad = 0;
      out.detalleCantidad = null;
    }

    out.subtotalFinal = redondear(Math.max(0, out.subtotalOriginal - out.descuentoTotal));

    /* 4) Umbral: vial de regalo + envío gratis sobre el subtotal final */
    if (cfg.UMBRAL && cfg.UMBRAL.activo && out.subtotalFinal >= cfg.UMBRAL.monto) {
      out.aplicaEnvioGratis = !!cfg.UMBRAL.envioGratis;
      out.vialGratisAgregado = !!cfg.UMBRAL.vialGratis;
    }

    return out;
  }

  /* Estado exclusivamente de presentación. Todos los importes y la regla
     ganadora vienen de calcularDescuentos(); aquí solo se traducen a hitos
     comprensibles para card, carrito, sticky y checkout. */
  function getCartPromoUXState(items) {
    var cfg = (w.FO_CONFIG && w.FO_CONFIG.DESCUENTOS) || {};
    var pc = cfg.POR_CANTIDAD || {};
    var umbral = cfg.UMBRAL || {};
    var d = calcularDescuentos(items);
    var appliedRule = null;
    var appliedPct = 0;
    var appliedDetail = null;

    if (d.detalleCantidad) {
      appliedRule = "quantity";
      appliedPct = d.detalleCantidad.pct;
      appliedDetail = d.detalleCantidad;
    } else if (d.detalleMarcas.length) {
      appliedRule = "brand";
      appliedPct = d.detalleMarcas[0].pct;
      appliedDetail = d.detalleMarcas[0];
    }

    var tiers = [
      { count: 2, pct: pc.min2 },
      { count: 6, pct: pc.min6 },
      { count: 10, pct: pc.min10 },
    ].filter(function (tier) {
      return typeof tier.pct === "number" && tier.pct > appliedPct && tier.count > d.cantDecantsElegibles;
    });
    var nextTier = tiers.length ? tiers[0] : null;
    var thresholdAmount = umbral.activo ? Number(umbral.monto) || 0 : 0;
    var itemsArr = items || [];
    // Carrito compuesto SOLO por packs: sus fragancias internas no son
    // decants individuales elegibles (d.cantDecants ya excluye packs), así
    // que el copy de "próximo tier" no debe sugerir que el combo ya suma
    // hacia el 5/10/15% — ver cartBenefitCopy() en script.js.
    var hasPack = itemsArr.some(function (it) { return it.isPack; });
    var packOnly = hasPack && d.cantDecants === 0;

    return {
      eligibleCount: d.cantDecantsElegibles,
      appliedPct: appliedPct,
      appliedRule: appliedRule,
      appliedDetail: appliedDetail,
      savings: d.descuentoTotal,
      nextTier: nextTier,
      itemsToNextTier: nextTier ? nextTier.count - d.cantDecantsElegibles : 0,
      thresholdAmount: thresholdAmount,
      thresholdRemaining: thresholdAmount ? redondear(Math.max(0, thresholdAmount - d.subtotalFinal)) : 0,
      freeShippingUnlocked: d.aplicaEnvioGratis,
      hasPack: hasPack,
      packOnly: packOnly,
      discounts: d,
    };
  }

  /* ── Precio promocional de un producto individual (frasco completo) ──
     NUNCA fabrica un precio de referencia: solo calcula el % real a
     partir de un `regularPrice` que el negocio confirmó como precio
     ordinario/estándar auténtico (no un valor inflado para simular un
     descuento -- Indecopi lo trata como publicidad engañosa). Si no hay
     `regularPrice`, o es <= al precio final, no hay promo que mostrar:
     se devuelve null y la UI debe caer al precio normal, sin inventar
     nada. El % siempre se deriva de los dos precios reales, nunca se
     hardcodea aparte (evita el bug real detectado: "1050 -> 860" anunciado
     como "20% OFF" cuando matemáticamente es ~18.1%). */
  function calcularPrecioPromo(regularPrice, price) {
    if (typeof regularPrice !== "number" || typeof price !== "number") return null;
    if (!(regularPrice > price) || price < 0) return null;
    const pct = Math.round(((regularPrice - price) / regularPrice) * 1000) / 10;
    return { regularPrice, price, pct, ahorro: redondear(regularPrice - price) };
  }

  w.calcularDescuentos = calcularDescuentos;
  w.FO_CALCULAR_DESCUENTOS = calcularDescuentos;
  w.isDiscountEligibleSize = isDiscountEligibleSize;
  w.getCartPromoUXState = getCartPromoUXState;
  w.calcularPrecioPromo = calcularPrecioPromo;
})(window);
