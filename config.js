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

  /* Próximos lanzamientos para la sección "PRÓXIMAMENTE" (aún no construida). */
  PROXIMAMENTE: [],
};