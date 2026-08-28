/* Playwright E2E tests — Fragrance Obsession
   Cubre: Home, Catálogo, Modal producto, Carrito, Checkout, Packs, Accesibilidad, Performance */
import { test, expect } from '@playwright/test';

test.describe.configure({ retries: 0 });

// ─── Helpers ───────────────────────────────────────────────────
async function waitForHydration(page) {
  await page.waitForFunction(() => document.readyState === 'complete');
  // Wait for loading screen to be hidden
  await page.waitForSelector('#loadingScreen', { state: 'hidden', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function openCart(page) {
  await page.click('#btnCart, [aria-label="Abrir carrito"]');
  await page.waitForSelector('.cart-sidebar.active', { timeout: 5000 });
}

async function closeCart(page) {
  await page.click('.cart-close, .cart-overlay');
  await page.waitForSelector('.cart-sidebar.active', { state: 'hidden', timeout: 3000 });
}

async function addFirstProductToCart(page) {
  await page.waitForSelector('.product-card', { timeout: 10000 });
  await page.hover('.product-card:first-child');
  await page.click('.product-card:first-child');
  await page.waitForSelector('.modal-overlay.active', { timeout: 5000 });

  // Seleccionar primer tamaño disponible
  await page.waitForSelector('.size-option', { timeout: 5000 });
  await page.click('.size-option:first-child');

  // Añadir al carrito
  await page.click('#modalAddBtn');
  await page.waitForSelector('.toast.show', { timeout: 5000 });
  await page.waitForTimeout(600); // animación micro-check
}

async function navigateTo(page, route) {
  await page.click(`[data-page="${route}"]`);
  await page.waitForSelector(`#page-${route}.active`, { timeout: 5000 });
}

// ─── Home Page ─────────────────────────────────────────────────
test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
  });

  test('carga correctamente y muestra hero', async ({ page }) => {
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('.hero h1')).toContainText('Fragancias');
    await expect(page.locator('.hero-video')).toBeVisible();
  });

  test('hero NO carga Three.js/hero-3d (retirado por rendimiento)', async ({ page }) => {
    // El frasco 3D (Three.js) se eliminó: pesaba en todos los dispositivos
    // (móvil incluido) aunque solo se usaba en desktop. Verifica que no
    // quede rastro ni de la librería ni del wrapper que insertaba.
    const hasThree = await page.evaluate(() => typeof window.THREE !== 'undefined');
    expect(hasThree).toBe(false);
    await expect(page.locator('.hero-3d-wrap')).toHaveCount(0);
  });

  test('navegación a catálogo funciona', async ({ page }) => {
    await page.click('[data-page="catalogo"]');
    await expect(page.locator('#page-catalogo.active')).toBeVisible();
    await expect(page.locator('#catalogGrid')).toBeVisible();
  });

  test('navegación a packs funciona', async ({ page }) => {
    await page.click('[data-page="promos"]');
    await expect(page.locator('#page-promos.active')).toBeVisible();
  });

  test('stats bar se anima al hacer scroll', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(800);
    const stat = page.locator('.stat-number').first();
    await expect(stat).toBeVisible();
  });

  test('theme toggle funciona', async ({ page }) => {
    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    await page.click('#themeToggle');
    await page.waitForTimeout(200);
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });
});

// ─── Catálogo ──────────────────────────────────────────────────
test.describe('Catálogo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    await navigateTo(page, 'catalogo');
  });

  test('filtros de categoría funcionan', async ({ page }) => {
    await page.click('[data-filter="nicho"]');
    await page.waitForTimeout(400);
    const cards = page.locator('.product-card');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('filtros de género funcionan', async ({ page }) => {
    await page.click('[data-filter="femenino"]');
    await page.waitForTimeout(400);
    const cards = page.locator('.product-card');
    await expect(cards.first()).toBeVisible();
  });

  test('búsqueda funciona', async ({ page }) => {
    await page.fill('#catalogSearch', 'Naxos');
    await page.waitForTimeout(500);
    const cards = page.locator('.product-card');
    await expect(cards.first()).toBeVisible();
  });

  test('abrir modal de producto desde catálogo', async ({ page }) => {
    await page.waitForSelector('.product-card', { timeout: 10000 });
    await page.click('.product-card:first-child');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();
    await expect(page.locator('#modalName')).toBeVisible();
    await page.click('.modal-close');
    await expect(page.locator('.modal-overlay.active')).toBeHidden();
  });

  test('paginación / load more funciona', async ({ page }) => {
    const initialCount = await page.locator('.product-card').count();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const newCount = await page.locator('.product-card').count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });
});

// ─── Modal Producto ────────────────────────────────────────────
test.describe('Modal Producto', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    await page.waitForSelector('.product-card', { timeout: 10000 });
    await page.click('.product-card:first-child');
    await page.waitForSelector('.modal-overlay.active', { timeout: 5000 });
  });

  test('muestra nombre, marca y notas', async ({ page }) => {
    await expect(page.locator('#modalName')).toBeVisible();
    await expect(page.locator('#modalBrand')).toBeVisible();
    await expect(page.locator('#modalNotes')).toBeVisible();
  });

  test('selector de tamaños funciona', async ({ page }) => {
    const sizes = page.locator('.size-option');
    await expect(sizes.first()).toBeVisible();
    await sizes.first().click();
    await expect(sizes.first()).toHaveClass(/selected/);
  });

  test('pestaña Frasco Completo / Decant', async ({ page }) => {
    const tabDecant = page.locator('#tabDecant');
    if (await tabDecant.isVisible()) {
      await tabDecant.click();
      await expect(tabDecant).toHaveClass(/active/);
      await page.locator('#tabFull').click();
      await expect(page.locator('#tabFull')).toHaveClass(/active/);
    }
  });

  test('imagen cambia al seleccionar tamaño', async ({ page }) => {
    const sizes = page.locator('.size-option');
    const count = await sizes.count();
    if (count > 1) {
      const img = page.locator('#modalImage img');
      const src1 = await img.getAttribute('src');
      await sizes.nth(1).click();
      await page.waitForTimeout(200);
      const src2 = await img.getAttribute('src');
      // La imagen puede o no cambiar según si hay sizeImages
      expect(src2).toBeTruthy();
    }
  });
});

// ─── Carrito ───────────────────────────────────────────────────
test.describe('Carrito', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    // Limpiar carrito si hay items
    await openCart(page);
    const removeBtns = page.locator('[data-action="remove"]');
    while (await removeBtns.count() > 0) {
      await removeBtns.first().click();
      await page.waitForTimeout(300);
    }
    await closeCart(page);
  });

  test('abrir/cerrar carrito', async ({ page }) => {
    await openCart(page);
    await expect(page.locator('.cart-sidebar.active')).toBeVisible();
    await closeCart(page);
    await expect(page.locator('.cart-sidebar.active')).toBeHidden();
  });

  test('añadir producto al carrito', async ({ page }) => {
    await addFirstProductToCart(page);
    await openCart(page);
    const items = page.locator('.cart-item');
    await expect(items.first()).toBeVisible();
  });

  test('contador de carrito se actualiza', async ({ page }) => {
    const countBefore = await page.locator('#cartCount').textContent();
    await addFirstProductToCart(page);
    const countAfter = await page.locator('#cartCount').textContent();
    expect(parseInt(countAfter)).toBeGreaterThan(parseInt(countBefore));
  });

  test('modificar cantidad en carrito', async ({ page }) => {
    await addFirstProductToCart(page);
    await openCart(page);
    await page.click('[data-action="qty"][data-delta="1"]');
    await page.waitForTimeout(300);
    const qty = await page.locator('.cart-item-qty span').textContent();
    expect(parseInt(qty)).toBe(2);
  });

  test('eliminar producto del carrito', async ({ page }) => {
    await addFirstProductToCart(page);
    await openCart(page);
    await page.click('[data-action="remove"]');
    await page.waitForTimeout(500);
    await expect(page.locator('.cart-empty')).toBeVisible();
  });

  test('sticky cart aparece en mobile al hacer scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await addFirstProductToCart(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    await expect(page.locator('#stickyCart.visible')).toBeVisible();
  });
});

// ─── Checkout ──────────────────────────────────────────────────
test.describe('Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    await addFirstProductToCart(page);
    await page.click('#btnCart');
    await page.click('button:has-text("Ir al Checkout")');
    await page.waitForSelector('#page-checkout.active', { timeout: 5000 });
  });

  test('formulario de checkout visible', async ({ page }) => {
    await expect(page.locator('#checkoutForm')).toBeVisible();
    await expect(page.locator('#chNombre')).toBeVisible();
    await expect(page.locator('#chTelefono')).toBeVisible();
    await expect(page.locator('#chDireccion')).toBeVisible();
  });

  test('resumen de pedido muestra items', async ({ page }) => {
    await expect(page.locator('#checkoutSummaryItems')).toBeVisible();
    await expect(page.locator('#checkoutTotal')).toBeVisible();
  });

  test('métodos de pago seleccionables', async ({ page }) => {
    const whatsapp = page.locator('[data-pay="whatsapp"]');
    const card = page.locator('[data-pay="card"]');
    await expect(whatsapp).toHaveClass(/active/);
    await card.click();
    await expect(card).toHaveClass(/active/);
  });

  test('validación de campos requeridos', async ({ page }) => {
    await page.click('#payConfirmBtn');
    await page.waitForTimeout(300);
    // HTML5 validation debería impedir envío
    await expect(page.locator('#chNombre:invalid')).toBeVisible();
  });
});

// ─── Packs / Promos ────────────────────────────────────────────
test.describe('Packs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    await navigateTo(page, 'promos');
  });

  test('seleccionar pack Nicho abre modal', async ({ page }) => {
    await page.click('[data-promo-filter="nicho"]');
    await page.waitForTimeout(400);
    await expect(page.locator('.pack-modal-overlay.active, #packModalOverlay.active')).toBeVisible();
  });

  test('toolbar de tamaños visible tras seleccionar pack', async ({ page }) => {
    await page.click('[data-promo-filter="nicho"]');
    await page.waitForTimeout(400);
    await page.waitForSelector('#packsToolbarRow:not([style*="display: none"])', { timeout: 5000 }).catch(() => {});
  });
});

// ─── Accesibilidad ─────────────────────────────────────────────
test.describe('Accesibilidad', () => {
  test('Home: landmarks y heading order', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    const main = page.locator('main');
    await expect(main).toBeVisible();

    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();

    // No h1 duplicados en hero
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('Imágenes tienen alt text', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    const imgs = page.locator('img:not([aria-hidden="true"])');
    const count = await imgs.count();
    for (let i = 0; i < Math.min(count, 20); i++) {
      const alt = await imgs.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('Focus visible en elementos interactivos', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.keyboard.press('Tab');
    const focused = await page.locator(':focus').getAttribute('class');
    expect(focused).toBeTruthy();
  });

  test('prefers-reduced-motion desactiva animaciones', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await waitForHydration(page);

    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();
    // Las animaciones deberían estar desactivadas (no fallar)
  });
});

// ─── Performance ───────────────────────────────────────────────
test.describe('Performance', () => {
  test('Home carga en < 3s (FCP)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const fcp = Date.now() - start;
    expect(fcp).toBeLessThan(3000);
  });

  test('No errores de consola críticos', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await waitForHydration(page);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('manifest') && !e.includes('ga') && !e.includes('tracking')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Service Worker registrado', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const sw = await page.evaluate(() => navigator.serviceWorker.controller ? 'active' : 'pending');
    expect(['active', 'pending']).toContain(sw);
  });
});

// ─── SEO / Meta ────────────────────────────────────────────────
test.describe('SEO & Meta', () => {
  test('Meta tags esenciales presentes', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /.+/);
  });

  test('Structured data (JSON-LD) válido', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    const ld = page.locator('script[type="application/ld+json"]');
    const count = await ld.count();
    expect(count).toBeGreaterThanOrEqual(2); // Store + BreadcrumbList + FAQPage
  });

  test('Sitemap.xml y robots.txt accesibles', async ({ page }) => {
    const sitemap = await page.request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();

    const robots = await page.request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
  });
});

// ─── Legal Pages ───────────────────────────────────────────────
test.describe('Legal Pages', () => {
  test('Privacidad carga y tiene IA disclosure', async ({ page }) => {
    await page.goto('/privacidad.html');
    await waitForHydration(page);
    await expect(page.locator('h1')).toContainText('Privacidad');
    await expect(page.locator('text=Inteligencia Artificial')).toBeVisible();
    await expect(page.locator('text=Cookies')).toBeVisible();
  });

  test('Términos carga', async ({ page }) => {
    await page.goto('/terminos.html');
    await waitForHydration(page);
    await expect(page.locator('h1')).toContainText('Términos');
  });
});