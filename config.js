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
      var origin = window.location.origin || "";
      if (/\.vercel\.app$/.test(origin) || /^https?:\/\/localhost/.test(origin)) {
        return "https://www.fraganceobession.com/";
      }
      var path = (window.location.pathname || "/").replace(/\/?index\.html$/, "").replace(/\/+$/, "");
      return origin + (path ? path + "/" : "/");
    } catch (e) {
      return "https://www.fraganceobession.com/";
    }
  })(),

  /* WhatsApp en formato internacional SIN "+" (checkout, topbar, FAB, footer). */
  WHATSAPP_NUMBER: "51994467586",

  /* Email de contacto. Hoy el checkout es 100% por WhatsApp; se reserva
     para futuras confirmaciones por correo. */
  EMAIL: "contacto@fraganceobsession.pe",

  /* Utilidad local/demo (admin.html), no administración de producción.
     ADMIN_HASH es solo un candado client-side, no una frontera de seguridad.
     Para cambiarlo localmente, genera otro hash con la herramienta:
        node tools/generate-admin-hash.js "TU-CONTRASEÑA"
     (o interactivo:  node tools/generate-admin-hash.js)
     y pega el resultado aquí (64 caracteres hex). */
  ADMIN_HASH: "1d3542876d1c3e0b8c53394e2fcadb4d55cc36df65fa4f122af1d86c825e34af",

  /* ── FRANJA DE PROMOCIONES (marquee) ──────────────────────────
     Se muestran TODOS los beneficios en una cinta deslizante continua
     bajo el topbar. Con prefers-reduced-motion queda estática. */
  TOPBAR_BENEFITS: [
    "Envíos a todo el Perú",
    "WhatsApp: +51 994 467 586",
    "Despacho en 1-2 días hábiles",
    "5% OFF en 2-5 decants (1-10ml)",
    "10% OFF en 6-9 decants · 15% OFF desde 10",
    "10% OFF en 3 decants de la misma marca",
    "ENVÍO GRATIS + vial de nicho de regalo desde S/ 199",
  ],

  /* ── RESEÑAS DE CLIENTES (Senja) ──────────────────────────────
     La sección "Opiniones de Clientes" de la home ya NO usa testimonios
     de demo/hardcodeados: usa los embeds públicos oficiales de Senja
     (sin API key, sin backend, sin base de datos propia).
       - FORM_URL: página pública del formulario (fallback si el iframe no carga).
       - FORM_EMBED_SRC: src del iframe embebido dentro del modal "Dejar una Opinión".
       - WIDGET_ID: id del widget de testimonios aprobados (Senja Studio).
       - WIDGET_PLATFORM_SRC: script público que renderiza el widget.
     La aprobación de cada reseña ocurre manualmente dentro de Senja;
     este sitio nunca decide qué testimonio se publica. */
  SENJA: {
    FORM_URL: "https://senja.io/p/fragrance-obsession/r/ZY90RH",
    FORM_EMBED_SRC: "https://senja.io/p/fragrance-obsession/r/ZY90RH?mode=embed&nostyle=true",
    WIDGET_ID: "16d9277d-d35e-4f68-ad14-fb6b2d8d1b2e",
    WIDGET_PLATFORM_SRC: "https://widget.senja.io/widget/16d9277d-d35e-4f68-ad14-fb6b2d8d1b2e/platform.js",
    IFRAME_RESIZER_SRC: "https://widget.senja.io/js/iframeResizer.min.js",
  },

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
    ACTIVOS: true,

    /* Descuento por cantidad de decants, SOLO 1ml-10ml (tamMaxMl): 20ml/30ml
       no cuentan ni reciben este descuento.
       · 2 a 5 decants   → 5%
       · 6 a 9 decants   → 10%
       · 10 o más        → 15%
       Se aplica sobre el subtotal de esos decants elegibles. Regla real del
       cliente -- ver descuentos.js, que ya la documenta y calcula bien; el
       "Arma tu Pack" (fo-v60/v61) dejó estos valores desalineados
       (min10:10 en vez de 15, tamMaxMl:30 en vez de 10), lo que rompía 4
       assertions de test-descuentos.js. Corregido. */
    POR_CANTIDAD: { activo: true, min2: 5, min6: 10, min10: 15, tamMaxMl: 10 },

    /* Descuento por marca repetida:
       3+ decants de la misma marca → 10% sobre esa marca. */
    POR_MARCA: { activo: true, minItems: 3, porcentaje: 10 },

    /* Beneficio por umbral de compra */
    UMBRAL: { activo: true, monto: 199, vialGratis: true, envioGratis: true },

    /* false = se aplica SOLO la regla de mayor descuento (cantidad o marca).
       true  = ambos descuentos se suman. */
    ACUMULAR_DESCUENTOS: false,
  },

  /* ── FRASCO COMPLETO → WHATSAPP DE COTIZACIÓN ──────────────────
     Al elegir "Frasco Completo" en el modal de producto ya NO se
     agrega al carrito: se abre WhatsApp con un mensaje de cotización.
     El mensaje es una función (name, brand, condition, price) → texto.
     condition = "Tester" / "Parcial · 99% de contenido" / "" (sellado
     normal, sin mención). price ya viene formateado ("S/ 630.00") o "". */
  FRASCO_COMPLETO_WHATSAPP: true,
  WHATSAPP_COTIZAR_MSG: (name, brand, condition, price) =>
    `Hola, quiero cotizar el frasco completo de ${name} (${brand})` +
    (condition ? ` — ${condition}` : "") +
    (price ? ` (${price})` : "") +
    `. ¿Me pueden dar más información?`,

/* ── DECANTS PREMIUM (5ml y 10ml) ─────────────────────────────
      Añade automáticamente variantes "premium" al modal de producto
      (y solo si el producto ya tiene el tamaño normal):
        · 5ml  → "5ml decant premium"  = precio normal + 4 si termina en 5,
           o +6 si termina en 9 (lógica dinámica por último dígito).
        · 10ml → "10ml decant premium" = precio normal + 6 si termina en 9,
           o +4 si termina en 5 (lógica dinámica por último dígito).
      La función `getPremiumUplift(basePrice)` en script.js usa
      `basePrice % 10` para determinar el recargo: si el precio base
      termina en 5 → +4; si termina en 9 → +6; otro dígito → 0.
      El ejemplo del cliente fue 5ml S/25→S/29 (+4) y 10ml S/39→S/45 (+6).
      Si se desactiva `PREMIUM_DECANTS: false`, no se añaden variantes.
      (No existe una config PREMIUM_UPLIFT: la regla vive únicamente
      en getPremiumUplift(basePrice), en script.js.) */
  PREMIUM_DECANTS: true,

  /* ── CATÁLOGO: GRID CONTINUO (Prompt 19) ────────────────────────
     true  = cada marca se muestra con su encabezado (heading) y su grilla.
     false = grilla continua uniforme (5 columnas desktop, sin huecos). */
  GROUP_BY_BRAND: false,

  /* ── PRÓXIMAMENTE (sin stock todavía) ────────────────────────
     Pon aquí los ids (números) de los productos que aún no están
     a la venta: se mostrarán con el badge "Próximamente", botón
     deshabilitado y aviso de reserva en el modal.
     Ejemplo: PROXIMAMENTE: [42, 73] */
  PROXIMAMENTE: [9, 10, 19, 37, 40, 41, 51, 55, 60, 63, 64, 78, 79, 95, 101, 103, 137, 138], // Ichigo Ichie, Last Birthday Cake, Mango Kiss, Que Chimba, Speachless, Evil Angel, Birth of Venus, Porthole, Tropikalys Karma, Musk Therapy, Paragon, Gentle Fluidity Silver, Grand Soir, Wulong Cha X, Sedley, Malibú Party, Toucan, Loverbird
  /* Disponibles: Fierezza (140), Gris Charnel EDP (81), Ani (90), Castley
     decant (100) y sellado (142), y Narcotic Delight decant (62).
     Narcotic Delight sellado (144) se conserva como dato histórico y está
     retirado del inventario público mediante public: false en productos.js. */

  /* ── FRAGANCIAS DESTACADAS (Home) ────────────────────────────────
     Orden EXACTO confirmado por el cliente. Se renderiza vía
     FO_PRODUCTS.find(id) en renderFeatured() — no duplica objetos.
     "Destacado" NO implica disponible: si el producto sigue en
     PROXIMAMENTE, conserva su badge normalmente. */
  FEATURED_PRODUCT_IDS: [32, 140, 8, 15, 17, 24, 56, 66, 68, 82, 149, 123], // Avanguardia, Fierezza, P*rnst*r, Oud Maracuja, God of Fire, Mangomacumba, Blue Talisman EDP, Wild Rush, Vibrato, Gris Charnel Extrait, Babycat, Gris Dior

  /* ── CONTENIDO: VIDEOS DE TIKTOK (embed oficial, click-to-play) ──
     Cada tarjeta muestra un "thumbnail" local con botón de play; al
     hacer clic se crea un <iframe> con el embed oficial de TikTok
     (tiktok.com/player/v1/<postId>) y el video se reproduce DENTRO de
     la sección, sin salir a la app. El iframe no existe hasta ese clic,
     así que no hay requests a tiktok.com solo por cargar o scrollear la
     página. Ver renderTikTokGallery() en script.js.
     · thumbnail: poster local en img/tiktok/ (SVG/WebP), mostrado antes
       del clic.
     · url:       enlace público del video (fallback / "Síguenos en
       TikTok" fuera del player).
     · postId:    ID numérico del video, resuelto una sola vez desde el
       enlace corto (vt.tiktok.com/... → tiktok.com/@usuario/video/<id>). */
  TIKTOK_PROFILE_URL: "https://www.tiktok.com/@fraganceobsession.pe?_r=1&_t=ZS-993ZhxTLNmH",
  /* postId: ID numérico del video, resuelto una sola vez desde el enlace
     corto (vt.tiktok.com/... → tiktok.com/@usuario/video/<postId>). Se usa
     para el embed oficial https://www.tiktok.com/player/v1/<postId> — el
     usuario da play y el video se reproduce dentro de la sección, sin
     salir a la app. thumbnail sigue siendo el poster local mostrado ANTES
     de que el usuario le dé play (el iframe no se crea hasta ese clic). */
  TIKTOK_VIDEOS: [
    { title: "El perfume ideal para el calor", thumbnail: "img/tiktok/thumb1.svg", url: "https://vt.tiktok.com/ZSVyQTpeK/", postId: "7490728805271751942" },
    { title: "Colección Stéphane Humbert Lucas", thumbnail: "img/tiktok/thumb2.svg", url: "https://vt.tiktok.com/ZSVyC1pGB/", postId: "7489656124468202758" },
  ],
};
