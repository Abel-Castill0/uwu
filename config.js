/* ════════════════════════════════════════════════════════════════
   CONFIG — FRAGANCE OBSESSION
   ────────────────────────────────────────────────────────────────
   Valores del negocio. Edítalos SOLO aquí antes de publicar.
   script.js, index.html y admin.html leen de window.FO_CONFIG.
   ════════════════════════════════════════════════════════════════ */
window.FO_CONFIG = {
  /* Dominio final del sitio (canonical, og:url, compartir productos).
     Dinámico: en GitHub Pages toma la URL real automáticamente
     (funciona en localhost, subcarpeta o dominio propio). */
  SITE_URL: (function () {
    try {
      var path = (window.location.pathname || "/").replace(/\/?index\.html$/, "").replace(/\/+$/, "");
      return window.location.origin + (path ? path + "/" : "/");
    } catch (e) {
      return "https://fraganceobsession.pe/";
    }
  })(),

  /* Instagram del negocio (topbar, FAB flotante y footer). */
  INSTAGRAM_URL: "https://instagram.com/fraganceobsession.pe",

  /* WhatsApp en formato internacional SIN "+" (checkout, topbar, FAB, footer). */
  WHATSAPP_NUMBER: "51994467586",

  /* Email de contacto. Hoy el checkout es 100% por WhatsApp; se reserva
     para futuras confirmaciones por correo. */
  EMAIL: "contacto@fraganceobsession.pe",

  /* Panel admin (admin.html): la contraseña NO se guarda en texto plano.
     ADMIN_HASH es el SHA-256 (hex) de tu contraseña.
     ⚠️ CAMBIAR antes de publicar: genera tu propio hash, por ejemplo con
     PowerShell:  [System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes("TU-CONTRASEÑA"))).Replace("-","").ToLower()
     y pega el resultado aquí (64 caracteres hex). */
  ADMIN_HASH: "1d3542876d1c3e0b8c53394e2fcadb4d55cc36df65fa4f122af1d86c825e34af",

  /* ── FRANJA DE PROMOCIONES (marquee) ──────────────────────────
     Se muestran TODOS los beneficios en una cinta deslizante continua
     bajo el topbar. Con prefers-reduced-motion queda estática. */
  TOPBAR_BENEFITS: [
    "Envíos a todo el Perú",
    "WhatsApp: +51 994 467 586",
    "Despacho en 1-2 días hábiles",
    "5% OFF en 2-5 decants",
    "10% OFF desde 6 decants",
    "10% OFF en 3 decants de la misma marca",
    "Vial de regalo en pedidos desde S/ 199",
  ],

  /* ── RESEÑAS DE CLIENTES (Social Proof) ──────────────────────
     Se renderizan en la sección "Reseñas Reales" de la home. */
  REVIEWS: [
    { stars: 5, text: "La calidad del decant es excelente, 100% original.", name: "María G.", product: "Yara · Lattafa" },
    { stars: 5, text: "Llegó rápido y muy bien empaquetado.", name: "Carlos R.", product: "9 PM · Afnan" },
    { stars: 4, text: "El aroma es idéntico al original, duró todo el día.", name: "Lucía P.", product: "Khamrah · Lattafa" },
    { stars: 5, text: "Pedí el pack de 3 diseñador y quedé encantado. Recomiendo 100%.", name: "Luis M.", product: "Stronger With You Intensely" },
    { stars: 5, text: "Me asesoraron por WhatsApp para elegir y acertaron. Servicio excelente.", name: "Ana P.", product: "Game of Spades Royale" },
  ],

  /* ── INSIGNIAS DE CONFIANZA ──────────────────────────────────
     Íconos + texto corto que se muestran en carrito y checkout. */
  TRUST_BADGES: [
    { icon: "fa-gem", label: "Perfumes 100% Originales" },
    { icon: "fa-shield-halved", label: "Pago Seguro" },
    { icon: "fa-syringe", label: "Extracción con jeringa (no spray)" },
  ],

  /* ── LINKS DEL FOOTER (abren modales informativos) ─────────── */
  FOOTER_LINKS: {
    "Preguntas Frecuentes": "faq",
    "Envíos y Despacho": "envios",
    "Devoluciones y Reembolsos": "devoluciones",
    "Términos y Condiciones": "terminos",
    "Nosotros": "nosotros",
  },

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

  /* ── FRASCO COMPLETO → WHATSAPP DE COTIZACIÓN ──────────────────
     Al elegir "Frasco Completo" en el modal de producto ya NO se
     agrega al carrito: se abre WhatsApp con un mensaje de cotización.
     El mensaje es una función (name, brand) → texto. */
  FRASCO_COMPLETO_WHATSAPP: true,
  WHATSAPP_COTIZAR_MSG: (name, brand) =>
    `Hola, quiero cotizar el frasco completo de ${name} (${brand}). ¿Me pueden dar más información?`,

  /* ── DECANTS PREMIUM (5ml y 10ml) ─────────────────────────────
     Añade automáticamente variantes "premium" al modal de producto
     (y solo si el producto ya tiene el tamaño normal):
       · 5ml  → "5ml decant premium"  = precio normal + PREMIUM_UPLIFT["5ml"]
       · 10ml → "10ml decant premium" = precio normal + PREMIUM_UPLIFT["10ml"]
     El ejemplo del cliente fue 5ml S/25→S/29 (+4) y 10ml S/39→S/45 (+6).
     Si prefieres +6 para 10ml, cambia el valor a 6 aquí. */
  PREMIUM_DECANTS: true,
  PREMIUM_UPLIFT: { "5": 4, "10": 5 },

  /* ── CATÁLOGO: GRID CONTINUO (Prompt 19) ────────────────────────
     true  = cada marca se muestra con su encabezado (heading) y su grilla.
     false = grilla continua uniforme (5 columnas desktop, sin huecos). */
  GROUP_BY_BRAND: false,

  /* ── PRÓXIMAMENTE (sin stock todavía) ────────────────────────
     Pon aquí los ids (números) de los productos que aún no están
     a la venta: se mostrarán con el badge "Próximamente", botón
     deshabilitado y aviso de reserva en el modal.
     Ejemplo: PROXIMAMENTE: [42, 73] */
  PROXIMAMENTE: [],
};