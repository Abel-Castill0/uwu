# Pruebas reproducibles

`npm test` ejecuta el selftest de navegador en `file://`, HTTP raíz y `/site/`, tanto normal como con `prefers-reduced-motion: reduce` (6 corridas medidas: `npm test` solo informa las medidas; el runner hace una carga `warm-up` previa que se descarta para evitar falsos negativos por cold start de Edge).

Requisitos: Node 22+ y Microsoft Edge (o `EDGE_PATH` con la ruta del ejecutable). No requiere servidor previo ni dependencias de test.

`npm run smoke` valida los 14 recursos obligatorios del shell publicado. El selftest interactivo está en `selftest.js`; no editarlo con PowerShell para preservar UTF-8.
