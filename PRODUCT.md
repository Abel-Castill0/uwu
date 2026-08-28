# Product

## Register

brand

## Users

Compradores de decants de perfumes de nicho, árabes y de diseñador en Lima, Perú, que llegan mayormente desde redes sociales (TikTok/Instagram) en el celular. Buscan un fragancia concreta o exploran el catálogo, comparan tamaños (5ml/10ml/20ml/30ml), y cierran la compra por WhatsApp. Son compradores sensibles al precio pero que esperan que una tienda de "lujo accesible" se vea y se sienta premium — la percepción de calidad del sitio es parte de lo que están comprando.

## Product Purpose

Tienda estática (sin backend) que muestra el catálogo de decants, deja explorar/filtrar por nota olfativa y tamaño, y **convierte todo el flujo en un pedido por WhatsApp** (con Mercado Pago como alternativa de pago). Éxito = el visitante llega al catálogo rápido, encuentra su fragancia sin fricción en el celular, y sale a WhatsApp con el pedido armado.

## Brand Personality

Profesional, elegante, lujoso — pero de "lujo accesible", no de moda ostentosa. Cálido y cercano (checkout por WhatsApp, trato directo), nunca frío o corporativo. Confianza y cuidado en el detalle por encima de espectáculo visual.

## Anti-references

- Nada que grite "hecho con IA": sin texto en degradado, sin eyebrows en mayúsculas en cada sección, sin grids de tarjetas idénticas, sin números 01/02/03 decorativos.
- Nada de "SaaS tech" (azules genéricos, glassmorphism decorativo, hero-metric con números grandes) — esto es una tienda de perfumes, no una app de software.
- Nada que sacrifique velocidad por espectáculo: el 3D/animación pesada que no aporta a la conversión se recorta (ver decisión ya tomada: se retira Three.js/Lenis/Anime.js).
- Nada "barato" tampoco: hay que evitar el extremo opuesto (plantillas de tienda genéricas, emojis como iconografía, tipografía sin jerarquía).

## Design Principles

1. **Rápido primero, lujoso después** — en una tienda que vive de tráfico móvil de redes sociales, el LCP/INP bajo es parte de la experiencia premium, no un trade-off contra ella.
2. **El producto es el protagonista** — fotografía de perfume nítida y bien recortada por encima de cualquier decoración de UI.
3. **Fricción cero hasta WhatsApp** — cada pantalla (catálogo, modal, carrito, checkout) debe acortar el camino a "Hacer Pedido", nunca alargarlo.
4. **Detalle artesanal, no ruido** — microinteracciones (hover, toasts, transiciones) discretas y consistentes; nunca animación por animación.
5. **Un solo sistema de movimiento** — un único lenguaje de animación (no 3-4 librerías compitiendo) aplicado con intención.

## Accessibility & Inclusion

- WCAG AA como mínimo: contraste de texto ≥4.5:1 (cuerpo) / ≥3:1 (texto grande), objetivos táctiles ≥44px.
- `prefers-reduced-motion: reduce` debe desactivar/reemplazar toda animación no esencial.
- Sitio 100% operable en móvil de gama media (no solo iPhone último modelo): sin scroll-jacking, sin animaciones que dependan de GPU potente.
