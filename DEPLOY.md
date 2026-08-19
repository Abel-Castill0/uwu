# DEPLOY.md — Despliegue en GitHub Pages (checklist)

Guía de publicación y puesta a punto de **Fragrance Obsession** en GitHub Pages, incluyendo dominio personalizado, SEO y requisitos legales.

## 1. Subir el código

```bash
git add -A
git commit -m "v27 — SEO, legales e imágenes optimizadas"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git   # una vez
git push -u origin main
```

## 2. Activar Pages

1. GitHub → repo → **Settings → Pages**.
2. **Build and deployment → Source: Deploy from a branch**.
3. Rama `main`, carpeta `/ (root)` → **Save**.
4. Espera el build (~1 min). URL: `https://TU_USUARIO.github.io/TU_REPO/`.

## 3. Antes de publicar (crítico)

- [ ] `config.js` → `ADMIN_HASH`: reemplaza el hash de ejemplo por uno real (comando PowerShell en README).
- [ ] `index.html` → `G-XXXXXXXXXX`: pon tu ID real de Google Analytics.
- [ ] `index.html` → `window.META_PIXEL_ID`: pon tu ID real de Meta Pixel (o borra el bloque si no lo usarás).
- [ ] Verifica que `sitemap.xml` liste el dominio correcto (edita las URLs si no es `fraganceobsession.pe`).
- [ ] `robots.txt` apunta a `Sitemap: https://<DOMINIO>/sitemap.xml` — ajusta si usas otro dominio.
- [ ] Revisa `privacidad.html` y `terminos.html`: actualiza la sección de **contacto** y los datos del **responsable** con los tuyos.

## 4. Dominio personalizado

1. Crea el archivo `CNAME` en la raíz con tu dominio: `fraganceobsession.pe`.
2. Settings → Pages → **Custom domain** → escribe el dominio → Save.
3. En tu proveedor DNS agrega:
   - `A` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - (o `CNAME` → `TU_USUARIO.github.io` si es subdominio como `www.fraganceobsession.pe`)
4. Marca **Enforce HTTPS** (SSL automático de Pages).

## 5. Verificación post-publicación

```bash
# Estado del sitio y HTTP
curl -s -o /dev/null -w "%{http_code}" https://TU_USUARIO.github.io/TU_REPO/        # 200
curl -s -o /dev/null -w "%{http_code}" https://TU_USUARIO.github.io/TU_REPO/robots.txt
curl -s -o /dev/null -w "%{http_code}" https://TU_USUARIO.github.io/TU_REPO/sitemap.xml
curl -s -o /dev/null -w "%{http_code}" https://TU_USUARIO.github.io/TU_REPO/privacidad.html
curl -s -o /dev/null -w "%{http_code}" https://TU_USUARIO.github.io/TU_REPO/terminos.html
curl -s -o /dev/null -w "%{http_code}" https://TU_USUARIO.github.io/TU_REPO/sw.js
curl -s -o /dev/null -w "%{http_code}" https://TU_USUARIO.github.io/TU_REPO/img/perfumes_optimized/Angels%20Share.webp
```

- [ ] Todas devuelven `200`.
- [ ] En el navegador: página en **modo incógnito** (descartar SW viejo), DevTools → Application → Service Workers activo, sin errores de consola.
- [ ] Recorre: home → catálogo → modal → carrito → checkout WhatsApp → gracias.
- [ ] `/pagina-inexistente.html` muestra el `404.html` custom.
- [ ] `/offline.html` accesible con red cortada (PWA).

## 6. SEO post-publicación

1. **Google Search Console** → Agrega el dominio → verifica (meta tag o DNS).
2. Envía `sitemap.xml` en **Sitemaps**.
3. **Bing Webmaster Tools** → Importa desde GSC.
4. Comprueba datos estructurados (JSON-LD del catálogo) con el validador de Google.
5. Opcional: en `index.html` ajusta `og:image` a la URL absoluta del sitio.

## 7. Actualizaciones futuras

1. Cambios en el SW (`sw.js`): sube el archivo **escrito con Node** (nunca PowerShell → BOM) y **bump de la versión** (`fo-v28-...`) en `const CACHE` + `self.addEventListener("install")`.
2. Nuevos perfumes: agrega la entrada en `productos.js` + imagen en `img/perfumes/`, luego:
   ```bash
   node tools/optimize-images.js --only=perfumes   # regenera img/perfumes_optimized/
   ```
3. Re-corre la suite (`cdp-runner7.js` con `SUITE_URL`) y el smoke (`pwtest/smoke.mjs`) antes del push.
4. `git add -A && git commit -m "..." && git push` — Pages redirige automáticamente.

## Notas de seguridad

- Proyecto auditado con **cyber-neo** (2026-08-18): 0 vulnerabilidades críticas/altas, 0 secretos, `npm audit` limpio. Informe: `cyber-neo-report-Fragance-Obsession-2026-08-18.md` (escritorio del autor).
- El panel admin es client-side (limitación del hosting estático): no lo uses con datos sensibles reales; el checkout pasa por WhatsApp del cliente.
- No se deben subir: `node_modules/`, `.agents/`, `.claude/settings.local.json`.
