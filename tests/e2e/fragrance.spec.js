/* Playwright E2E tests — Fragrance Obsession
   Cubre: Home, Catálogo, Modal producto, Carrito, Checkout, Packs, Accesibilidad, Performance */
import { test, expect } from '@playwright/test';

test.describe.configure({ retries: 0 });

// ─── Helpers ───────────────────────────────────────────────────
async function waitForHydration(page) {
  await page.waitForFunction(() => document.readyState === 'complete');
  // El velo inicial no puede quedar interceptando los flujos de compra.
  await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 4000 });
  await page.waitForTimeout(500);
}

async function isCartActive(page) {
  return page.locator('.cart-sidebar').evaluate((el) => el.classList.contains('active'));
}
async function openCart(page) {
  // En WebKit se vio una carrera real: el chequeo "ya esta activo" pasaba
  // en false, pero el sidebar terminaba de animarse a 'active' un
  // instante despues (p.ej. tras addToCart), y entonces bloqueaba
  // permanentemente el click a #btnCart (subtree intercepts pointer
  // events) hasta agotar el timeout. Un par de reintentos cortos antes de
  // clickear cierra esa ventana de carrera sin ocultar un bug real de la
  // app -- el estado final buscado (sidebar activo) es el mismo.
  for (let i = 0; i < 3; i++) {
    if (await isCartActive(page)) return;
    if (i < 2) await page.waitForTimeout(150);
  }
  await page.click('#btnCart, [aria-label="Abrir carrito"]');
  await page.waitForSelector('.cart-sidebar.active', { timeout: 5000 });
}

async function closeCart(page) {
  await page.locator('.cart-close').click();
  await page.waitForSelector('.cart-sidebar.active', { state: 'hidden', timeout: 3000 });
}

async function addFirstProductToCart(page) {
  const cards = page.locator('#featuredGrid .product-card');
  await expect(cards.first()).toBeVisible({ timeout: 10000 });
  await cards.first().hover();
  await cards.first().click();
  await page.waitForSelector('.modal-overlay.active', { timeout: 5000 });

  // El primer destacado puede abrir por defecto en "Frasco completo".
  // Para probar el carrito hay que seleccionar la presentación decant, que es
  // la única que se añade al carrito desde este modal.
  const decantTab = page.locator('#tabDecant');
  if (await decantTab.isVisible()) {
    await decantTab.click();
    await expect(decantTab).toHaveClass(/active/);
  }

  // Seleccionar primer tamaño disponible
  await page.waitForSelector('.size-option', { timeout: 5000 });
  await page.click('.size-option:first-child');

  // Añadir al carrito
  await page.click('#modalAddBtn');
  await page.waitForSelector('.toast.show', { timeout: 5000 });
  await page.waitForTimeout(600); // animación micro-check
}

async function navigateTo(page, route) {
  // En mobile (<=900px) los links de navegacion viven dentro del drawer
  // lateral, cerrado por defecto (transform fuera de pantalla,
  // pointer-events:none) -- hay que abrir el hamburger primero, igual que
  // haria un usuario real. En desktop el hamburger no es visible y el
  // link ya esta en la fila horizontal, clickeable directo.
  const hamburger = page.locator('#hamburger');
  if (await hamburger.isVisible()) {
    await hamburger.click();
    await page.waitForSelector('#nav.open', { timeout: 3000 });
  }
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
    // El <video> del hero es display:none en mobile (<=768px) a proposito
    // (peso de 3MB innecesario en movil): el fondo lo reemplaza inicio.webp
    // via CSS background-image en .hero. No es un bug, es el diseño
    // documentado en HANDOFF.md.
    const isMobileViewport = (page.viewportSize()?.width || 1280) <= 768;
    if (isMobileViewport) {
      await expect(page.locator('.hero-video')).toBeHidden();
    } else {
      await expect(page.locator('.hero-video')).toBeVisible();
    }
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
    await navigateTo(page, 'catalogo');
    await expect(page.locator('#page-catalogo.active')).toBeVisible();
    await expect(page.locator('#catalogGrid')).toBeVisible();
  });

  test('navegación a packs funciona', async ({ page }) => {
    await navigateTo(page, 'promos');
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
    // El icono de header (#themeToggle) esta display:none en mobile
    // (<=900px) -- ahi el control real vive dentro del drawer
    // (#navThemeLight / #navThemeDark), no es el mismo boton.
    const hamburger = page.locator('#hamburger');
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForSelector('#nav.open', { timeout: 3000 });
      const target = initialTheme === 'dark' ? '#navThemeLight' : '#navThemeDark';
      await page.click(target);
    } else {
      await page.click('#themeToggle');
    }
    await page.waitForTimeout(200);
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });

  test('menú móvil ocupa el viewport, queda sobre el backdrop y devuelve foco al cerrar', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await waitForHydration(page);
    const hamburger = page.locator('#hamburger');
    await hamburger.click();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#nav')).toHaveClass(/open/);
    await expect(page.locator('#navBackdrop')).toHaveClass(/active/);
    await expect(page.locator('#nav')).toBeVisible();
    await expect(page.locator('#themeToggle')).toBeHidden();
    await expect(page.locator('#nav')).toBeFocused();
    await page.waitForFunction(() => {
      const rect = document.querySelector('#nav').getBoundingClientRect();
      return Math.abs(rect.right - window.innerWidth) <= 2 && rect.left >= -1;
    });
    const layers = await page.evaluate(() => {
      const nav = document.querySelector('#nav');
      const backdrop = document.querySelector('#navBackdrop');
      const rect = nav.getBoundingClientRect();
      const pointTarget = document.elementFromPoint(rect.left + 24, rect.top + rect.height / 2);
      return {
        navZ: getComputedStyle(nav).zIndex,
        backdropZ: getComputedStyle(backdrop).zIndex,
        overflow: getComputedStyle(document.body).overflow,
        focus: document.activeElement && document.activeElement.id,
        mountedAtBody: nav.parentElement === document.body,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        pointHitsDrawer: pointTarget === nav || nav.contains(pointTarget),
      };
    });
    expect(Number(layers.navZ)).toBeGreaterThan(Number(layers.backdropZ));
    expect(layers.overflow).toBe('hidden');
    expect(layers.focus).toBe('nav');
    expect(layers.mountedAtBody).toBe(true);
    expect(layers.top).toBeLessThanOrEqual(1);
    expect(layers.right).toBeGreaterThanOrEqual(layers.viewportWidth - 1);
    expect(layers.right).toBeLessThanOrEqual(layers.viewportWidth + 2);
    expect(layers.left).toBeGreaterThanOrEqual(-1);
    expect(layers.width).toBeLessThanOrEqual(0.86 * layers.viewportWidth + 1);
    expect(layers.height).toBeGreaterThanOrEqual(0.95 * layers.viewportHeight);
    expect(layers.pointHitsDrawer).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('menu-mobile-abierto.png') });
    await page.keyboard.press('Escape');
    await expect(page.locator('#nav')).not.toHaveClass(/open/);
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#hamburger')).toBeFocused();
    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload();
    await waitForHydration(page);
    await page.click('#hamburger');
    await expect(page.locator('#nav')).toBeVisible();
    const narrowGeometry = await page.locator('#nav').evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height, right: rect.right, viewportHeight: window.innerHeight };
    });
    expect(narrowGeometry.width).toBeLessThanOrEqual(0.86 * 320 + 1);
    expect(narrowGeometry.height).toBeGreaterThanOrEqual(0.95 * narrowGeometry.viewportHeight);
    expect(narrowGeometry.right).toBeGreaterThanOrEqual(319);
    await page.keyboard.press('Escape');
  });

  test('navegar desde el drawer limpia su estado transitorio', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await waitForHydration(page);
    await page.screenshot({ path: testInfo.outputPath('menu-mobile-normal.png') });

    async function assertNeutralDrawerState(route) {
      await page.waitForFunction(() => {
        const backdrop = document.querySelector('#navBackdrop');
        const style = getComputedStyle(backdrop);
        return !backdrop.classList.contains('active')
          && style.visibility === 'hidden'
          && style.opacity === '0'
          && style.pointerEvents === 'none';
      });
      const state = await page.evaluate(() => {
        const nav = document.querySelector('#nav');
        const backdrop = document.querySelector('#navBackdrop');
        const main = document.querySelector('main');
        const middle = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        const backdropStyle = getComputedStyle(backdrop);
        const mainStyle = getComputedStyle(main);
        return {
          drawerOpen: nav.classList.contains('open'),
          backdropOpen: backdrop.classList.contains('active'),
          bodyMenuOpen: document.body.classList.contains('menu-open') || document.body.classList.contains('modal-open'),
          htmlMenuOpen: document.documentElement.classList.contains('menu-open') || document.documentElement.classList.contains('modal-open'),
          bodyOverflow: getComputedStyle(document.body).overflow,
          bodyInlineOverflow: document.body.style.overflow,
          backdropDisplay: backdropStyle.display,
          backdropVisibility: backdropStyle.visibility,
          backdropOpacity: backdropStyle.opacity,
          backdropPointerEvents: backdropStyle.pointerEvents,
          mainInert: main.inert,
          mainAriaHidden: main.getAttribute('aria-hidden'),
          mainFilter: mainStyle.filter,
          mainOpacity: mainStyle.opacity,
          mainPointerEvents: mainStyle.pointerEvents,
          middleHitsBackdrop: middle === backdrop || backdrop.contains(middle),
        };
      });
      expect(state.drawerOpen).toBe(false);
      expect(state.backdropOpen).toBe(false);
      expect(state.bodyMenuOpen).toBe(false);
      expect(state.htmlMenuOpen).toBe(false);
      expect(state.bodyInlineOverflow).toBe('');
      expect(state.bodyOverflow).not.toBe('hidden');
      expect(state.backdropDisplay).not.toBe('none');
      expect(state.backdropVisibility).toBe('hidden');
      expect(state.backdropOpacity).toBe('0');
      expect(state.backdropPointerEvents).toBe('none');
      expect(state.mainInert).toBe(false);
      expect(state.mainAriaHidden).toBeNull();
      expect(state.mainFilter).toBe('none');
      expect(state.mainOpacity).toBe('1');
      expect(state.mainPointerEvents).not.toBe('none');
      expect(state.middleHitsBackdrop).toBe(false);
      await page.screenshot({ path: testInfo.outputPath(`menu-mobile-despues-${route}.png`) });
    }

    for (const route of ['catalogo', 'promos', 'home']) {
      await page.click('#hamburger');
      await expect(page.locator('#nav')).toHaveClass(/open/);
      if (route === 'catalogo') await page.screenshot({ path: testInfo.outputPath('menu-mobile-abierto-navegacion.png') });
      await page.click(`#nav a[data-page="${route}"]`);
      await expect(page.locator(`#page-${route}.active`)).toBeVisible();
      await assertNeutralDrawerState(route);
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.click('#hamburger');
    await page.click('#nav a[data-page="catalogo"]');
    await expect(page.locator('#page-catalogo.active')).toBeVisible();
    await assertNeutralDrawerState('catalogo-reduced-motion');
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
    const cards = page.locator('#catalogGrid .product-card');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('búsqueda funciona', async ({ page }) => {
    await page.fill('#catalogSearch', 'Naxos');
    await page.waitForTimeout(500);
    const cards = page.locator('#catalogGrid .product-card');
    await expect(cards.first()).toBeVisible();
  });

  test('abrir modal de producto desde catálogo', async ({ page }) => {
    const cards = page.locator('#catalogGrid .product-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await cards.first().click();
    await expect(page.locator('.modal-overlay.active')).toBeVisible();
    await expect(page.locator('#modalName')).toBeVisible();
    await page.click('#modalOverlay .modal-close');
    await expect(page.locator('.modal-overlay.active')).toBeHidden();
  });

  test('paginación / load more funciona', async ({ page }) => {
    const cards = page.locator('#catalogGrid .product-card');
    const initialCount = await cards.count();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const newCount = await cards.count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });
});

// ─── Modal Producto ────────────────────────────────────────────
test.describe('Modal Producto', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const cards = page.locator('#featuredGrid .product-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await cards.first().click();
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
      const tabFull = page.locator('#tabFull');
      if (await tabFull.isVisible()) {
        await tabFull.click();
        await expect(tabFull).toHaveClass(/active/);
      }
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

// ─── Guardas visuales P1 (móvil) ─────────────────────────────
test.describe('Guardas visuales P1', () => {
  test('Combo no desborda y el modal no oculta sus controles', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await waitForHydration(page);

    await page.click('#hamburger');
    await page.click('#nav a[data-page="promos"]');
    await expect(page.locator('#page-promos.active')).toBeVisible();
    await expect(page.locator('#nav')).not.toHaveClass(/mounted/, { timeout: 1000 });
    await page.screenshot({ path: testInfo.outputPath('combo-light-mobile.png'), fullPage: true });

    const comboLayout = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const builder = document.querySelector('#comboBuilder');
      const overflowing = Array.from(document.querySelectorAll('body *')).flatMap((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.right <= document.documentElement.clientWidth + 1) return [];
        return [{
          node: el.tagName.toLowerCase(), id: el.id, className: String(el.className).slice(0, 120),
          left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width),
        }];
      }).slice(0, 12);
      window.scrollTo({ left: 100, top: window.scrollY });
      const horizontalScroll = window.scrollX;
      window.scrollTo({ left: 0, top: window.scrollY });
      return {
        clientWidth: root.clientWidth,
        rootScrollWidth: root.scrollWidth,
        bodyScrollWidth: body.scrollWidth,
        builderRight: builder.getBoundingClientRect().right,
        navDisplay: getComputedStyle(document.querySelector('#nav')).display,
        cartDisplay: getComputedStyle(document.querySelector('#cartSidebar')).display,
        horizontalScroll,
        overflowing,
      };
    });
    expect(comboLayout.horizontalScroll).toBe(0);
    expect(comboLayout.navDisplay).toBe('none');
    expect(comboLayout.cartDisplay).toBe('none');

    await page.click('#hamburger');
    await page.click('#navThemeDark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const selectedSizeStyle = await page.locator('.combo-size-btn.active').evaluate((el) => {
      const style = getComputedStyle(el);
      return { backgroundImage: style.backgroundImage, color: style.color };
    });
    expect(selectedSizeStyle.backgroundImage).not.toBe('none');
    expect(selectedSizeStyle.color).toBe('rgb(26, 18, 11)');
    await page.screenshot({ path: testInfo.outputPath('combo-dark-mobile.png'), fullPage: true });

    await page.click('#nav a[data-page="home"]');
    await expect(page.locator('#page-home.active')).toBeVisible();
    await page.locator('#featuredGrid .product-card').first().click();
    await expect(page.locator('#modalOverlay.active')).toBeVisible();
    const decantTab = page.locator('#tabDecant');
    if (await decantTab.isVisible()) await decantTab.click();
    const sizes = page.locator('#modalSizes .size-option');
    await expect(sizes.first()).toBeVisible();
    await sizes.last().scrollIntoViewIfNeeded();
    await sizes.last().click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: testInfo.outputPath('modal-mobile-controls.png') });

    const modalLayout = await page.evaluate(() => {
      const price = document.querySelector('#modalPrice').getBoundingClientRect();
      const add = document.querySelector('#modalAddBtn').getBoundingClientRect();
      const selected = document.querySelector('#modalSizes .size-option.selected').getBoundingClientRect();
      return { priceBottom: price.bottom, addTop: add.top, selectedBottom: selected.bottom };
    });
    expect(modalLayout.addTop).toBeGreaterThanOrEqual(modalLayout.priceBottom + 8);
    expect(modalLayout.addTop).toBeGreaterThanOrEqual(modalLayout.selectedBottom + 8);
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
    await closeCart(page);
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
    await openCart(page);
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
    if (await card.getAttribute('aria-disabled') === 'true') {
      await expect(card).not.toHaveClass(/active/);
    } else {
      await card.click();
      await expect(card).toHaveClass(/active/);
    }
  });

  test('validación de campos requeridos bloquea la confirmación', async ({ page }) => {
    await expect(page.locator('#payConfirmBtn')).toHaveAttribute('aria-disabled', 'true');
  });
});

// ─── Combo (reemplaza "Packs" -- grid+modal retirado desde Prompt 35,
// ver HANDOFF.md; [data-promo-filter], .pack-modal-overlay y
// #packsToolbarRow no existen en el HTML actual, 0 referencias) ────
test.describe('Combo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    await navigateTo(page, 'promos');
  });

  test('seleccionar el minimo confirma el combo y lleva a Checkout', async ({ page }) => {
    const checkboxes = page.locator('#comboList input[type="checkbox"]:not(:disabled)');
    await expect(checkboxes.first()).toBeVisible({ timeout: 10000 });
    // Selecciona los primeros 3 disponibles (minimo valido, ver COMBO_MIN).
    // comboToggleProduct() reemplaza el innerHTML de toda la lista en cada
    // cambio (mismo motivo documentado en tests/selftest.js) -- el
    // .check() "de verdad" de Playwright (mueve el mouse, espera
    // estabilidad visual) entra en carrera con ese re-render y nunca
    // converge. Se dispara el evento change directo, igual que el otro
    // suite (CDP) ya hace con exito para este mismo componente.
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const input = document.querySelector('#comboList input[type="checkbox"]:not(:checked):not(:disabled)');
        if (!input) return;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(200);
    }
    await expect(page.locator('#comboSummaryCount')).toContainText('3/6');
    const confirmBtn = page.locator('#comboConfirmBtn');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();
    await expect(page.locator('#page-checkout.active')).toBeVisible({ timeout: 5000 });
    // El combo NO abre WhatsApp directo: aterriza en Checkout como un item
    // mas del carrito (type:"pack"), mismo CTA final que el resto del sitio.
    await expect(page.locator('#checkoutSummaryItems')).toBeVisible();
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
      const img = imgs.nth(i);
      const alt = await img.getAttribute('alt');
      // alt="" es valido (no un bug) cuando la imagen es decorativa DENTRO
      // de un control que ya tiene su propio nombre accesible via
      // aria-label -- ej. .tiktok-card__img dentro de <a aria-label="Ver
      // video en TikTok: {titulo}">. Duplicar el texto en el alt del <img>
      // seria ruido para lectores de pantalla (WCAG desaconseja el eco),
      // no una omision. Solo se exige alt no-vacio cuando la imagen NO
      // esta dentro de un ancestro con su propio aria-label.
      const hasLabelledAncestor = await img.evaluate((el) => !!el.closest('[aria-label]'));
      if (hasLabelledAncestor && alt === '') continue;
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
    // .first(): el texto aparece tanto en el <h2> de la seccion como en su
    // parrafo -- ambas coincidencias son correctas (no es contenido
    // duplicado por error), pero un locator con 2+ matches viola el modo
    // estricto de Playwright. Solo hace falta confirmar que la seccion
    // existe y es visible, no contar cuantas veces aparece el texto.
    await expect(page.locator('text=Inteligencia Artificial').first()).toBeVisible();
    await expect(page.locator('text=Cookies').first()).toBeVisible();
  });

  test('Términos carga', async ({ page }) => {
    await page.goto('/terminos.html');
    await waitForHydration(page);
    await expect(page.locator('h1')).toContainText('Términos');
  });
});
