const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webmanifest": "application/manifest+json" };
function server() {
  return http.createServer((req, res) => {
    let pathname = decodeURIComponent(req.url.split("?")[0]);
    if (pathname.startsWith("/site/")) pathname = pathname.slice(5);
    if (pathname === "/" || pathname === "") pathname = "/index.html";
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res);
  });
}
const run = (url, runIndex) => new Promise((resolve) => {
  const child = spawn(process.execPath, ["tests/runners/cdp-runner.js"], { cwd: root, stdio: "inherit", env: { ...process.env, SUITE_URL: url, CDP_PORT: String(9400 + runIndex) } });
  child.on("exit", (code) => resolve(code === 0));
});
(async () => {
  const checks = [spawnSync(process.execPath, ["--check", "script.js"], { cwd: root }).status === 0, spawnSync(process.execPath, ["--check", "animations.js"], { cwd: root }).status === 0];
  const app = server(); await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const port = app.address().port;
  // La aplicación se verifica por HTTP local, igual que en producción: evita
  // falsos positivos de file:// (origen, carga de assets y service workers).
  const targets = [`http://127.0.0.1:${port}/`, `http://127.0.0.1:${port}/site/`];
  for (let index = 0; index < targets.length; index += 1) {
    let passed = await run(targets[index], index);
    // Edge puede perder una navegación tras cerrar su perfil temporal; el
    // reintento usa un puerto y perfil nuevos, sin ocultar una aserción fallida.
    if (!passed) passed = await run(targets[index], index + 10);
    checks.push(passed);
  }
  await new Promise((resolve) => app.close(resolve));
  if (!checks.every(Boolean)) process.exitCode = 1;
})();
