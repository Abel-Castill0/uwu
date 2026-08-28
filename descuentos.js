/* ════════════════════════════════════════════════════════════════
   DESCUENTOS Y PROMOCIONES — FRAGANCE OBSESSION
   ────────────────────────────────────────────────────────────────
   Lógica única de descuentos. Carga antes que script.js.
   Configurable en config.js → window.FO_CONFIG.DESCUENTOS.

   Reglas (por defecto):
   1) Por cantidad (solo decants de 1ml a 10ml, ver POR_CANTIDAD.tamMaxMl):
      2-5 decants → 5% · 6-9 decants → 10% · 10+ decants → 15% (sobre el
      subtotal de esos decants elegibles). Excluyente: solo el mayor.
   2) Por marca: 3+ unidades de la misma marca → 10% sobre el
      subtotal de los productos de esa marca (decants y sellados).
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

    if (!cfg.ACTIVOS || pagables.length === 0) {
      out.subtotalFinal = out.subtotalOriginal;
      return out;
    }

    /* 1) Descuento por cantidad de decants — solo presentaciones de 1ml a
       10ml (POR_CANTIDAD.tamMaxMl) cuentan y reciben este descuento; los
       decants de 20ml/30ml quedan fuera (piden más volumen, no aplica el
       incentivo de "prueba y compra más"). Sin tamMaxMl configurado, no
       se restringe (compatibilidad hacia atrás). */
    if (cfg.POR_CANTIDAD && cfg.POR_CANTIDAD.activo) {
      var tamMax = cfg.POR_CANTIDAD.tamMaxMl;
      var decantsElegibles = !tamMax ? decants : decants.filter(function (it) {
        var ml = parseInt(String(it.size).replace("_premium", ""), 10);
        return !isNaN(ml) && ml <= tamMax;
      });
      var cantElegible = decantsElegibles.reduce(function (s, it) { return s + it.qty; }, 0);
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

    /* 2) Descuento por marca repetida (3+ unidades de la misma marca) */
    if (cfg.POR_MARCA && cfg.POR_MARCA.activo) {
      var porMarca = {};
      pagables.forEach(function (it) {
        porMarca[it.brand] = (porMarca[it.brand] || 0) + it.qty;
      });
      Object.keys(porMarca).forEach(function (marca) {
        if (porMarca[marca] >= cfg.POR_MARCA.minItems) {
          var itemsMarca = pagables.filter(function (it) { return it.brand === marca; });
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

  w.calcularDescuentos = calcularDescuentos;
  w.FO_CALCULAR_DESCUENTOS = calcularDescuentos;
})(window);
