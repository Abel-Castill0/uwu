# DEPLOY.md — Vercel Production Checklist

Guía operativa de producción para **FRAGRANCE OBSESSION**.

## Estado de producción

- **Hosting:** Vercel
- **Repositorio:** `Abel-Castill0/uwu`
- **Rama de producción:** `master`
- **Dominio principal:** `https://www.fraganceobession.com/`
- **Apex:** `https://fraganceobession.com/` → `308` → `https://www.fraganceobession.com/`
- **Project ID:** `prj_2n3qkwZ1g7dcZ2DpnOecpdNsNryN`

## 1. Pre-deploy

Comprueba primero el alcance y evita incluir secretos, capturas, logs o archivos temporales:

```bash
git status
git branch --show-current
git diff
git diff --cached
```

La rama debe ser `master`. Conserva cambios locales ajenos al trabajo actual.

Ejecuta validación proporcional al cambio:

```bash
# Sintaxis de los JavaScript modificados
node --check script.js
node --check config.js
node --check sw.js

# Tests relevantes para la superficie modificada
npm test

# Recursos esenciales
npm run smoke

# Higiene final
git diff --check
git status
git diff --stat
git diff
```

No todos los cambios requieren la suite completa. Los cambios solo documentales requieren `git diff --check` y búsquedas dirigidas; cualquier test ejecutado debe terminar con `0 FAIL`.

## 2. Deploy

El deploy normal se realiza mediante la integración Git de Vercel:

```bash
git add <archivos-revisados>
git commit -m "descripción del cambio"
git push origin master
```

Flujo esperado:

```text
git push origin master
→ Vercel Git Integration
→ target production
→ READY
```

No se crea un deployment manual normalmente. Antes de cerrar, confirma que `HEAD`, `origin/master` y el deployment de producción señalen al mismo SHA.

## 3. Vercel

Configuración esperada:

- `productionBranch = master`
- `target = production`
- `state = READY`
- Dominio `www.fraganceobession.com` asignado a producción
- Dominio `fraganceobession.com` configurado como redirect al `www`

Puede verificarse desde el proyecto de Vercel o mediante su API usando el Project ID explícito. Trata `VERCEL_TOKEN` como secreto: no lo imprimas, no leas `.env` completo y nunca lo incluyas en código, commits o logs.

## 4. Dominio, DNS y SSL

Configuración vigente:

```text
A      @     → 216.198.79.1
CNAME  www   → 43e54af2a1d71a26.vercel-dns-017.com.
```

Comportamiento esperado:

```text
https://fraganceobession.com/
→ 308 Permanent Redirect
→ https://www.fraganceobession.com/
→ 200 OK
```

Verificación:

```powershell
Resolve-DnsName fraganceobession.com -Type A
Resolve-DnsName www.fraganceobession.com -Type CNAME
curl.exe -IL https://fraganceobession.com/
curl.exe -I https://www.fraganceobession.com/
```

Ambos dominios deben tener HTTPS válido y la cadena no debe contener loops. El redirect apex vive en Domain Settings de Vercel; no lo dupliques en `vercel.json`.

## 5. Post-deploy

### HTTP y assets

```powershell
curl.exe -I https://www.fraganceobession.com/
curl.exe -I https://www.fraganceobession.com/styles.css
curl.exe -I https://www.fraganceobession.com/script.js
curl.exe -I https://www.fraganceobession.com/productos.js
curl.exe -I https://www.fraganceobession.com/config.js
curl.exe -I https://www.fraganceobession.com/manifest.webmanifest
curl.exe -I https://www.fraganceobession.com/robots.txt
curl.exe -I https://www.fraganceobession.com/sitemap.xml
curl.exe -I https://www.fraganceobession.com/img/og-cover.webp
curl.exe -I https://www.fraganceobession.com/sw.js
```

Los recursos anteriores deben responder `200`.

### SEO

Confirma en el HTML de producción:

- canonical: `https://www.fraganceobession.com/`
- `og:url`: `https://www.fraganceobession.com/`
- `og:image`: `https://www.fraganceobession.com/img/og-cover.webp`
- `twitter:image`: el mismo OG público
- JSON-LD Store y Breadcrumbs bajo el dominio principal
- `robots.txt` anuncia `https://www.fraganceobession.com/sitemap.xml`
- `sitemap.xml` es XML válido y no contiene fragmentos `#catalogo` o `#promos`

### Security headers

La respuesta del dominio principal debe incluir:

- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`

### PWA y 404

Comprueba que `manifest.webmanifest`, `sw.js`, `icon-192.png` e `icon-512.png` respondan `200`. El service worker usa cachés versionadas, stale-while-revalidate para assets e imágenes y network-first para navegación, con fallback a `offline.html`. Cambia la versión cuando cambie el contrato de caché.

Una ruta estática inexistente debe responder `404` y mostrar el `404.html` del proyecto en Vercel:

```powershell
curl.exe -I https://www.fraganceobession.com/pagina-inexistente.html
```

## 6. Admin

`admin.html` es una utilidad local/demo:

- Solo lee pedidos guardados en el `localStorage` del mismo navegador.
- No tiene backend, base de datos ni sesión server-side.
- `ADMIN_HASH` client-side no es autenticación de producción.
- No debe usarse con datos sensibles ni presentarse como panel real.
- No existe enlace público desde la tienda.
- Vercel bloquea su exposición mediante `/admin.html` → `308` → `/`.

## 7. Emails

Se mantienen sin cambios hasta confirmar un mailbox oficial `.com`:

- `contacto@fraganceobsession.pe`
- `cliente@fraganceobsession.pe`

Estas direcciones y el usuario de TikTok `@fraganceobsession.pe` no son errores de dominio técnico y no deben reemplazarse automáticamente.

## 8. Nuevos perfumes

Cuando cambie el catálogo:

1. Agrega la entrada en `productos.js` y la imagen fuente local.
2. Regenera los WebP con `node tools/optimize-images.js --only=perfumes`.
3. Ejecuta los tests relevantes y `npm run smoke`.
4. Revisa el diff antes del commit.

El proyecto continúa siendo estático y puede servirse en hosting alternativo, pero la producción oficial descrita por esta guía es Vercel.
