/* Service Worker — Fragrance Obsession
 * - Stale-while-revalidate: CSS, JS, fuentes (siempre al día en la
 *   2ª carga; sin versionar a mano ya no hay riesgo de servir JS viejo)
 * - Stale-while-revalidate: imágenes
 * - Network-first con fallback a offline.html: navegación
 * OJO: si algún día se vuelve a cache-first para assets, CADA deploy
 * DEBE bumpear VERSION o los clientes se quedan con código viejo.
 */
const VERSION = "fo-v51-ghpages";
const CORE_CACHE = `core-${VERSION}`;
const IMG_CACHE = `img-${VERSION}`;
const FONT_CACHE = `font-${VERSION}`;

// Precarga: shell + logo + imágenes de filtros + página offline
const CORE_ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "script.js",
  "productos.js",
  "config.js",
  "descuentos.js",
  "animations.js",
  "offline.html",
  "404.html",
  "gracias.html",
  "terminos.html",
  "privacidad.html",
  "robots.txt",
  "sitemap.xml",
  "logo.webp",
  "icon-192.png",
  "icon-512.png",
  "icon-180.png",
  "inicio.webp",
  "img/filtros/nicho.webp",
  "img/filtros/disenador.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) =>
      // addAll falla si algún recurso 404; usamos add individual tolerante
      Promise.allSettled(CORE_ASSETS.map((a) => cache.add(a))),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![CORE_CACHE, IMG_CACHE, FONT_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

function isFont(url) {
  return (
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("fonts.googleapis.com") ||
    /\.(woff2?|ttf|otf)$/i.test(url.pathname)
  );
}
function isImage(url, req) {
  return req.destination === "image" || /\.(webp|png|jpe?g|gif|svg|avif)$/i.test(url.pathname);
}
function isStaticAsset(url, req) {
  return req.destination === "style" || req.destination === "script" ||
    /\.(css|js)$/i.test(url.pathname);
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.status === 200) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Navegación (documentos): network-first → offline.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match("offline.html").then((r) => r || caches.match("index.html")),
      ),
    );
    return;
  }

  // No interceptar terceros que no sean fuentes (p. ej. TikTok, Font Awesome CDN se cachea como font/static)
  const sameOrigin = url.origin === self.location.origin;

  if (isFont(url)) {
    event.respondWith(staleWhileRevalidate(req, FONT_CACHE));
    return;
  }
  if (sameOrigin && isStaticAsset(url, req)) {
    event.respondWith(staleWhileRevalidate(req, CORE_CACHE));
    return;
  }
  if (sameOrigin && isImage(url, req)) {
    event.respondWith(staleWhileRevalidate(req, IMG_CACHE));
    return;
  }
  // Resto: red con fallback a caché si existe
  if (sameOrigin) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
  }
});
