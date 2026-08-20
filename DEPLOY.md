# DEPLOY.md — Despliegue en GitHub Pages (checklist)

Guía de publicación y puesta a punto de **Fragrance Obsession** en GitHub Pages, incluyendo dominio personalizado, SEO, análisis (GA4/Meta Pixel) y requisitos legales.

## 1. Verificación antes de publicar (obligatorio)

```bash
# 1. Integridad: todos los JS deben pasar node --check
node --check script.js sw.js config.js productos.js descuentos.js animations.js

# 2. Suite completa: 6 corridas (file:// + HTTP raíz + /site/ × normal + reduced-motion)
npm test            # esperado: cada corrida medida = 104 PASS | 0 FAIL

# 3. Smoke: 14 recursos esenciales
npm run smoke       # esperado: SMOKE: 14 PASS | 0 FAIL

# 4. Auditoría responsive (5 viewports)
node tests/runners/cdp-responsive-check.js   # esperado: RESPONSIVE: 5/5 OK

# 5. Auditoría de contraste AA
node tests/runners/cdp-contrast-check.js     # esperado: ratios ≥ 4.5 (texto normal) / ≥ 3 (grande)

# 6. Verificar que no haya mojibake (caracteres de reemplazo) en los fuentes
node -e "const fs=require('fs'),p=require('path');const b=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.join(d,e.name);if(e.isDirectory())w(f);else if(/\.(js|html|css|json|md|txt|xml|webmanifest)$/i.test(f)){const s=fs.readFileSync(f,'utf8');if(s.includes('\uFFFD'))b.push(f)}}})( '.');console.log(b.length?b.join('\n'):'OK: sin mojibake')"
```

Nota: el runner de la suite hace una carga `warm-up` descartada (primer arranque de Edge); las corridas medidas son las siguientes. Un warm-up con fallos de timing (p. ej. `cartItems2` o grids) no invalida el resultado.

## 2. Datos de configuración finales (crítico)

Estos valores los pones tú antes de publicar:

| Ítem | Archivo | Cómo |
|------|---------|------|
| **GA4** | `index.html` (bloque `GOOGLE ANALYTICS 4`) | Reemplaza `G-XXXXXXXXXX` en `window.GA_MEASUREMENT_ID`. El loader NO carga GA mientras el ID tenga `XXXXXX`. |
| **Meta Pixel** | `index.html` (bloque `META PIXEL`) | Reemplaza `XXXXXXXXXXXXXXX` en `window.META_PIXEL_ID`. El Pixel NO carga mientras tenga `XXXXXXX`. |
| **ADMIN_HASH** | `config.js` → `ADMIN_HASH` | `node tools/generate-admin-hash.js "tu-contraseña"` → pega el hash (64 hex). Nunca publiques el hash de ejemplo. |
| **Dominio** | `sitemap.xml`, `robots.txt`, `index.html` (canonical) | Usa tu dominio real. `SITE_URL` en `config.js` es dinámico (funciona solo). |

Si no vas a usar GA o Meta Pixel, borra el bloque correspondiente en `index.html`.

## 3. Publicar en GitHub Pages

```bash
git add -A
git commit -m "descripción del cambio"
git push origin main        # Pages publica desde la rama main automáticamente
```

Configuración inicial (una vez):
1. GitHub → repo → **Settings → Pages**.
2. **Build and deployment → Source: Deploy from a branch**.
3. Rama `main`, carpeta `/ (root)` → **Save**.
4. Espera el build (~1 min). URL: `https://TU_USUARIO.github.io/TU_REPO/`.

## 4. Dominio personalizado (opcional)

1. Crea el archivo `CNAME` en la raíz con tu dominio: `fraganceobsession.pe`.
2. Settings → Pages → **Custom domain** → escribe el dominio → Save.
3. En tu proveedor DNS agrega:
   - `A` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - (o `CNAME` → `TU_USUARIO.github.io` si es subdominio como `www.fraganceobsession.pe`)
4. Marca **Enforce HTTPS** (SSL automático de Pages).
5. Actualiza `sitemap.xml`, `robots.txt` y el `canonical` de `index.html` con el dominio final.

## 5. Verificación post-publicación

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://TU_USUARIO.github.io/TU_REPO/            # 200
curl -s -o /dev/null -w "%{http_code}\n" https://TU_USUARIO.github.io/TU_REPO/robots.txt   # 200
curl -s -o /dev/null -w "%{http_code}\n" https://TU_USUARIO.github.io/TU_REPO/sitemap.xml  # 200
curl -s -o /dev/null -w "%{http_code}\n" https://TU_USUARIO.github.io/TU_REPO/sw.js        # 200
```

- [ ] Todas devuelven `200`.
- [ ] En el navegador: página en **modo incógnito** (descartar SW viejo), DevTools → Application → Service Workers activo, sin errores de consola.
- [ ] Recorre: home → catálogo → modal → carrito → checkout WhatsApp → gracias.
- [ ] `/pagina-inexistente.html` muestra el `404.html` custom.
- [ ] `/offline.html` accesible con red cortada (PWA).

## 6. Service Worker: actualizaciones futuras

1. Edita `sw.js` **con Node** (nunca PowerShell → BOM).
2. **Bump de la versión** (ej. `fo-v37-ghpages` → `fo-v38-ghpages`): el SW detecta el cambio y re-descarga los recursos.
3. Commit y push. La primera visita del usuario puede mostrar la versión vieja; la segunda ya usa la nueva.
4. Para forzar actualización en un dispositivo: borrar los datos del sitio (Safari iOS: **Ajustes → Safari → Avanzado → Datos de sitios web → eliminar dominio**) o usar el modo incógnito.

## 7. Nuevos perfumes

1. Agrega la entrada en `productos.js` + imagen en `img/perfumes/`.
2. Regenera los WebP:
   ```bash
   npm install sharp   # solo la primera vez
   node tools/optimize-images.js --only=perfumes   # regenera img/perfumes_optimized/
   ```
3. Re-corre la suite y el smoke (sección 1) antes del push.

## 8. SEO post-publicación

1. **Google Search Console** → Agrega el dominio → verifica (meta tag o DNS).
2. Envía `sitemap.xml` en **Sitemaps**.
3. **Bing Webmaster Tools** → Importa desde GSC.
4. Comprueba datos estructurados (JSON-LD del catálogo) con el validador de Google.

## Notas de seguridad

- El panel admin es client-side (limitación del hosting estático): no lo uses con datos sensibles reales; el checkout pasa por WhatsApp del cliente.
- No se deben subir: `node_modules/`, `.agents/`, `.claude/settings.local.json`, ni las capturas fuera de `tests/shots/`.
- La revisión visual de las capturas (`tests/shots/`, 50 PNG) es responsabilidad del cliente antes de publicar.