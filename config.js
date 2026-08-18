/* ════════════════════════════════════════════════════════════════
   CONFIG — FRAGANCE OBSESSION
   ────────────────────────────────────────────────────────────────
   Valores del negocio. Edítalos SOLO aquí antes de publicar.
   script.js, index.html y admin.html leen de window.FO_CONFIG.
   ════════════════════════════════════════════════════════════════ */
window.FO_CONFIG = {
  /* Dominio final del sitio (canonical, og:url, compartir productos).
     ⚠️ Debe coincidir con <link rel="canonical"> y <meta og:url> de index.html. */
  SITE_URL: "https://fraganceobsession.pe/",

  /* Instagram del negocio (topbar, FAB flotante y footer). */
  INSTAGRAM_URL: "https://instagram.com/fraganceobsession.pe",

  /* WhatsApp en formato internacional SIN "+" (checkout, topbar, FAB, footer). */
  WHATSAPP_NUMBER: "51994467586",

  /* Email de contacto. Hoy el checkout es 100% por WhatsApp; se reserva
     para futuras confirmaciones por correo. */
  EMAIL: "contacto@fraganceobsession.pe",

  /* Contraseña del panel admin (admin.html). ⚠️ CAMBIAR antes de publicar. */
  ADMIN_PASSWORD: "cambiar-esta-password",

  /* true  = los descuentos del marquee se acumulan con packs y regalos.
     false = se mantiene la lógica actual (sin acumulación). */
  ACUMULAR_PROMOS: false,

  /* ── DESCUENTOS Y PROMOCIONES ──────────────────────────────────
     Reglas que se aplican en el carrito y el checkout.
     Cambia los valores aquí; el resto del sitio se adapta solo. */
  DESCUENTOS: {
    ACTIVOS: true, // false desactiva TODOS los descuentos de abajo

    /* Descuento por cantidad de decants (excluyente entre sí):
       · 2 a 5 decants  → min2 %
       · 6 o más        → min6 %
       Se aplica sobre el subtotal de los decants. */
    POR_CANTIDAD: { activo: true, min2: 5, min6: 10 },

    /* Descuento por marca repetida:
       3+ unidades de la misma marca → porcentaje % sobre esa marca. */
    POR_MARCA: { activo: true, minItems: 3, porcentaje: 10 },

    /* Beneficio por umbral de compra (subtotal final >= monto):
       vial de regalo (línea informativa, no altera stock)
       + envío gratis (mensaje en carrito/checkout/WhatsApp). */
    UMBRAL: { activo: true, monto: 199, vialGratis: true, envioGratis: true },

    /* false = se aplica SOLO la regla de mayor descuento (cantidad o marca).
       true  = ambos descuentos se suman. */
    ACUMULAR_DESCUENTOS: false,
  },

  /* Próximos lanzamientos para la sección "PRÓXIMAMENTE" (aún no construida). */
  PROXIMAMENTE: [],
};