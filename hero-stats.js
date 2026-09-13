/* hero-stats.js — corrige el hardcode "+135" con el conteo real del
   catálogo (FO_PRODUCTS). Debe ser un archivo externo con `defer`, NO un
   <script> inline: el atributo defer se IGNORA en scripts inline (se
   ejecutan de inmediato, en el punto donde el parser los encuentra), así
   que un inline aquí correría ANTES de que productos.js (también defer)
   hubiera poblado window.FO_PRODUCTS — exactamente el bug que causó que
   el conteo dinámico nunca se aplicara la primera vez.
   Debe cargar DESPUÉS de productos.js y ANTES de animations.js: su
   initCounters() lee el texto inicial de forma síncrona apenas ese script
   se ejecuta (no espera a scroll ni a DOMContentLoaded), así que el DOM
   ya debe tener el número real para cuando lo lea. */
(function () {
  "use strict";
  try {
    var products = window.FO_PRODUCTS || [];
    var proximamente = (window.FO_CONFIG && window.FO_CONFIG.PROXIMAMENTE) || [];
    // "Disponible" = producto real, no tester, no marcado como Próximamente.
    var count = products.filter(function (p) {
      return (!p.type || p.type === "product") && !p.tester && proximamente.indexOf(p.id) === -1;
    }).length;
    if (count > 0) {
      ["heroStatCatalogCount", "statsBarCatalogCount"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.textContent = "+" + count;
      });
    }
  } catch (e) { /* deja el valor estático si algo falla */ }
})();
