/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // El catálogo inicial carga vídeo e imágenes pesadas; limitar la concurrencia
  // local evita que el servidor estático sature conexiones y falsee flujos UI.
  workers: process.env.CI ? 1 : 2,
  reporter: [['html', { outputFolder: 'tests/playwright-report' }], ['list']],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { ...require('@playwright/test').devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...require('@playwright/test').devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...require('@playwright/test').devices['iPhone 12'] } },
  ],
  webServer: {
    // python -m http.server es monohilo y no aguanta 3 proyectos de
    // navegador en paralelo durante ~15min de suite -- se caia a mitad de
    // corrida (ECONNREFUSED) y arrastraba a fallo todo lo que venia
    // despues, sin relacion con bugs reales de la app. http-server (Node,
    // ya usado por el preview de Claude Code) soporta la concurrencia real.
    command: 'npx http-server -p 8080 -c-1 --silent',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
};
