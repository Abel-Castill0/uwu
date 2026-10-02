import { test, expect } from '@playwright/test';

const navOrder = ['Inicio', 'Catálogo', 'Marcas', 'Completos', 'Combos', 'Comentarios'];

async function openNavLink(page, name) {
  if (await page.locator('#hamburger').isVisible()) await page.locator('#hamburger').click();
  await page.locator('#nav').getByRole('link', { name, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 5000 });
  await expect(page.locator('#featuredGrid .product-card')).toHaveCount(12);
});

test('Completos nav clears stale filters, wraps vertically and survives Back/Forward', async ({ page }) => {
  await expect(page.locator('#nav .nav-links > a, #nav .nav-links > button')).toHaveText(navOrder);
  await openNavLink(page, 'Catálogo');
  await page.locator('#catalogSearch').fill('Babycat');
  await expect(page.locator('#catalogGrid .product-card')).toHaveCount(1);
  await openNavLink(page, 'Completos');
  await expect(page.locator('#catalogSearch')).toHaveValue('');
  await expect(page.locator('#page-catalogo')).toHaveClass(/active/);
  await expect(page.locator('#nav')).not.toHaveClass(/open/);
  await expect(page.locator('#filtersCategory [data-filter="completos"]')).toHaveAttribute('aria-pressed', 'true');
  const cards = page.locator('#catalogGrid .product-card');
  /* Inventario real de frascos sellados PÚBLICOS tras la retirada del
     02/10: 144 (Narcotic), 142 (Castley) y 152 (Dream Sea) tienen
     public:false — se derivan del catálogo, no de un número a mano. */
  const publicSealedIds = await page.evaluate(() =>
    (window.FO_PRODUCTS || []).filter((p) => p.sealed === true && p.public !== false).map((p) => p.id));
  await expect(cards).toHaveCount(publicSealedIds.length);
  expect(await cards.evaluateAll((els) => els.map((el) => Number(el.dataset.productId)))).toEqual(publicSealedIds);
  expect(publicSealedIds).toEqual([141, 143, 145, 146, 147, 148, 151, 153]);
  // Retirados (cliente 02/10): sus ids NO están en el grid.
  for (const id of [142, 152]) {
    expect(publicSealedIds).not.toContain(id);
    await expect(page.locator(`#catalogGrid [data-product-id="${id}"]`)).toHaveCount(0);
  }
  const layout = await page.locator('#catalogGrid').evaluate((el) => {
    const style = getComputedStyle(el);
    const rows = new Set([...el.querySelectorAll('.product-card')].map((card) => Math.round(card.getBoundingClientRect().top)));
    return { display: style.display, snap: style.scrollSnapType, overflow: el.scrollWidth > el.clientWidth + 1, rows: rows.size, pageOverflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(layout).toMatchObject({ display: 'grid', snap: 'none', overflow: false, pageOverflow: false });
  expect(layout.rows).toBeGreaterThan(1);
  await page.goBack();
  await expect(page.locator('#filtersCategory [data-filter="todos"]')).toHaveAttribute('aria-pressed', 'true');
  await page.goForward();
  await expect(cards).toHaveCount(publicSealedIds.length);
  await expect(page.locator('#filtersCategory [data-filter="completos"]')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 5000 });
  await expect(cards).toHaveCount(publicSealedIds.length);
  await openNavLink(page, 'Inicio');
  await openNavLink(page, 'Completos');
  // Castley sellado (142) ya no está: abrir la ficha de OTRO sellado
  // conserva el flujo de cotización de Completos.
  await expect(page.locator('#catalogGrid [data-product-id="142"]')).toHaveCount(0);
  await page.locator('#catalogGrid [data-product-id="143"]').click();
  await expect(page.locator('#modalName')).toHaveText('Erba Gold');
  await expect(page.locator('#modalAddBtn')).toContainText('Cotizar Frasco');
});

test('Six affected decants share availability and canonical photos in cards and modals', async ({ page }) => {
  test.setTimeout(120000); // 8 fichas × catálogo + modal: en WebKit móvil excede los 60 s por defecto
  const requested = [[140, 'Fierezza', false], [55, 'Porthole', true], [78, 'Gentle Fluidity Silver', true], [81, 'Gris Charnel EDP', false], [100, 'Castley', false], [51, 'Birth of Venus', false], [64, 'Paragon', false], [137, 'Toucan', false], [150, 'Mefisto Gentiluomo', true]];
  const fierezza = page.locator('#featuredGrid [data-product-id="140"]');
  await expect(fierezza.locator('.btn-add')).toBeEnabled();
  await expect(fierezza.locator('.product-badge').filter({ hasText: 'Próximamente' })).toHaveCount(0);
  for (const [id, name, soon] of requested) {
    await openNavLink(page, 'Catálogo');
    await page.locator('#catalogSearch').fill(name);
    const card = page.locator(`#catalogGrid [data-product-id="${id}"]`);
    await expect(card).toBeVisible();
    const button = card.locator('.btn-add');
    if (soon) await expect(button).toBeDisabled();
    else await expect(button).toBeEnabled();
    const image = await card.locator('img').getAttribute('src');
    expect(image).toBeTruthy();
    await expect.poll(() => card.locator('img').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
    await card.click();
    await expect(page.locator('#modalOverlay')).toHaveClass(/active/);
    await expect(page.locator('#modalName')).toHaveText(name);
    await expect(page.locator('#modalImage img')).toHaveAttribute('src', image);
    if (soon) {
      await expect(page.locator('#modalAddBtn')).toBeDisabled();
      await expect(page.locator('#modalAddBtn')).toContainText('Próximamente');
    } else await expect(page.locator('#modalAddBtn')).toBeEnabled();
    await page.locator('#modalOverlay .modal-close').click();
  }
  await openNavLink(page, 'Catálogo');
  await page.locator('#catalogSearch').fill('Ani');
  // Ani (90) NO DISPONIBLE: SIGUE visible en el catálogo (cliente 01/10),
  // pero su ficha queda bloqueada para compra.
  const ani = page.locator('#catalogGrid [data-product-id="90"]');
  await expect(ani).toBeVisible();
  await expect(ani.locator('.product-badge').filter({ hasText: 'NO DISPONIBLE' })).toHaveCount(1);
  await expect(ani.locator('.btn-add')).toBeDisabled();
  await expect(ani.locator('.btn-add')).toHaveText('NO DISPONIBLE');
  await expect(ani.locator('.product-price')).toHaveText('No disponible');
  await ani.click();
  await expect(page.locator('#modalOverlay')).toHaveClass(/active/);
  await expect(page.locator('#modalName')).toHaveText('Ani');
  await expect(page.locator('#modalAddBtn')).toBeDisabled();
  await expect(page.locator('#modalAddBtn')).toContainText('NO DISPONIBLE');
  await expect(page.locator('#modalPrice')).toHaveText('No disponible');
  await expect(page.locator('#modalUnavailableNote')).toBeVisible();
  // Sin selector de tallas ni precio de compra: no hay forma de agregarlo.
  await expect(page.locator('#modalSizes .size-option')).toHaveCount(0);
  await page.locator('#modalOverlay .modal-close').click();
  // Su "hermana" Ani X (91) no está afectada: sigue comprable.
  const aniX = page.locator('#catalogGrid [data-product-id="91"]');
  await expect(aniX).toBeVisible();
  await expect(aniX.locator('.btn-add')).toBeEnabled();
  await expect(aniX.locator('.product-badge').filter({ hasText: 'NO DISPONIBLE' })).toHaveCount(0);
  await page.locator('#catalogSearch').fill('Narcotic Delight');
  await expect(page.locator('#catalogGrid [data-product-id="62"]')).toBeVisible();
  await expect(page.locator('#catalogGrid [data-product-id="144"]')).toHaveCount(0);
});

test('Header fits and Completos wraps across the requested responsive widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'The viewport matrix runs once on desktop Chromium.');
  const publicSealedCount = await page.evaluate(() =>
    (window.FO_PRODUCTS || []).filter((p) => p.sealed === true && p.public !== false).length);
  expect(publicSealedCount).toBe(8); // 141, 143, 145, 146, 147, 148, 151, 153
  for (const width of [320, 360, 390, 430, 768, 900, 1024, 1280, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await openNavLink(page, 'Completos');
    await expect(page.locator('#catalogGrid .product-card')).toHaveCount(publicSealedCount);
    const header = await page.evaluate(() => {
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
      const logo = rect('.header-inner .logo'), nav = rect('#nav'), actions = rect('.header-actions');
      return { pageOverflow: document.documentElement.scrollWidth > innerWidth, logoRight: logo.right, navLeft: nav.left, navRight: nav.right, actionsLeft: actions.left, center: (nav.left + nav.right) / 2, viewportCenter: document.documentElement.clientWidth / 2, gridOverflow: document.querySelector('#catalogGrid').scrollWidth > document.querySelector('#catalogGrid').clientWidth + 1 };
    });
    expect(header.pageOverflow, `page at ${width}`).toBe(false);
    expect(header.gridOverflow, `grid at ${width}`).toBe(false);
    if (width > 900) {
      expect(header.logoRight, `logo/nav at ${width}`).toBeLessThanOrEqual(header.navLeft);
      expect(header.navRight, `nav/actions at ${width}`).toBeLessThan(header.actionsLeft);
      expect(Math.abs(header.center - header.viewportCenter)).toBeLessThan(1);
    } else {
      expect(header.logoRight, `logo/actions at ${width}`).toBeLessThan(header.actionsLeft);
      await expect(page.locator('#hamburger')).toBeVisible();
    }
  }
});

test('Sellados retirados: Castley 142 y Dream Sea 152 fuera del inventario público', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 5000 });

  // 1. Datos históricos intactos en el array crudo (no se borró nada).
  const raw = await page.evaluate(() => [142, 152].map((id) => {
    const p = (window.FO_PRODUCTS || []).find((x) => x.id === id);
    return { id, public: p && p.public, sealed: p && p.sealed, price: p && Object.values(p.fullSizes)[0] };
  }));
  expect(raw).toEqual([
    { id: 142, public: false, sealed: true, price: 870 },
    { id: 152, public: false, sealed: true, price: 675 },
  ]);

  // 2. Nada de Castley sellado en catálogo; el DECANT (100) sigue a la venta.
  await page.evaluate(() => window.navigateTo('catalogo'));
  await page.locator('#catalogSearch').fill('Castley');
  await expect(page.locator('#catalogGrid [data-product-id="100"]')).toBeVisible();
  await expect(page.locator('#catalogGrid [data-product-id="142"]')).toHaveCount(0);

  // 3. Mismo criterio para Dream Sea: solo el decant (58) queda visible.
  await page.locator('#catalogSearch').fill('Dream Sea');
  await expect(page.locator('#catalogGrid [data-product-id="58"]')).toBeVisible();
  await expect(page.locator('#catalogGrid [data-product-id="152"]')).toHaveCount(0);

  // 4. La ficha sellada no se puede abrir (openModal la resuelve contra el
  //    inventario público) y addToCart no la acepta.
  const modal = await page.evaluate(() => {
    window.__FO_TEST.clearCart();
    window.openModal(142);
    const opened = document.getElementById('modalOverlay').classList.contains('active');
    window.closeModal(true);
    window.__FO_TEST.addToCart(142, 'full', '125');
    const cartLen = JSON.parse(localStorage.getItem('fo_cart_v4') || '[]').length;
    return { opened, cartLen };
  });
  expect(modal).toEqual({ opened: false, cartLen: 0 });

  // 5. Carrito viejo con uno de esos sellados: lo retira y avisa.
  const sanitized = await page.evaluate(() => window.__FO_TEST.sanitizeCartAvailability([
    { productId: 142, type: 'full', name: 'Castley', brand: 'Parfums de Marly', size: '125', price: 870, qty: 1 },
    { productId: 152, type: 'full', name: 'Dream Sea', brand: 'Lorenzo Pazzaglia', size: '50', price: 675, qty: 1 },
    { productId: 100, type: 'decant', name: 'Castley', brand: 'Parfums de Marly', size: '5', price: 59, qty: 1 },
  ]));
  expect(sanitized.removed).toBe(2);
  expect(sanitized.items.map((i) => i.productId)).toEqual([100]);

  // 6. El decant de Castley (100) sigue comprable de verdad.
  const added = await page.evaluate(() => {
    window.__FO_TEST.clearCart();
    window.__FO_TEST.addToCart(100, 'decant', '5');
    const cart = JSON.parse(localStorage.getItem('fo_cart_v4') || '[]');
    return { count: cart.length, productId: cart[0] && cart[0].productId, price: cart[0] && cart[0].price };
  });
  expect(added.count).toBe(1);
  expect(added.productId).toBe(100);
  const expected = await page.evaluate(() => {
    const p = (window.FO_PRODUCTS || []).find((x) => x.id === 100);
    return p.decantSizes[5];
  });
  expect(added.price).toBe(expected);
});
