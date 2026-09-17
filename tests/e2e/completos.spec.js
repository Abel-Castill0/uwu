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
  await expect(cards).toHaveCount(7);
  expect(await cards.evaluateAll((els) => els.map((el) => Number(el.dataset.productId)))).toEqual([141, 142, 143, 145, 146, 147, 148]);
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
  await expect(cards).toHaveCount(7);
  await expect(page.locator('#filtersCategory [data-filter="completos"]')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 5000 });
  await expect(cards).toHaveCount(7);
  await openNavLink(page, 'Inicio');
  await openNavLink(page, 'Completos');
  await page.locator('#catalogGrid [data-product-id="142"]').click();
  await expect(page.locator('#modalAddBtn')).toContainText('Cotizar Frasco');
});

test('Six affected decants share availability and canonical photos in cards and modals', async ({ page }) => {
  const requested = [[140, 'Fierezza', false], [55, 'Porthole', true], [78, 'Gentle Fluidity Silver', true], [81, 'Gris Charnel EDP', false], [90, 'Ani', false], [100, 'Castley', false]];
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
  await page.locator('#catalogSearch').fill('Narcotic Delight');
  await expect(page.locator('#catalogGrid [data-product-id="62"]')).toBeVisible();
  await expect(page.locator('#catalogGrid [data-product-id="144"]')).toHaveCount(0);
});

test('Header fits and Completos wraps across the requested responsive widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'The viewport matrix runs once on desktop Chromium.');
  for (const width of [320, 360, 390, 430, 768, 900, 1024, 1280, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await openNavLink(page, 'Completos');
    await expect(page.locator('#catalogGrid .product-card')).toHaveCount(7);
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
