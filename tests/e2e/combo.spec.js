import { test, expect } from '@playwright/test';

/* Regresión "Arma tu combo": cambiar de presentación NO debe tocar la
   selección. SELECCIÓN != COMPATIBILIDAD != PRECIO. Se verifica el estado
   real (window.comboSelectedIds, getComboDiscountInfo), no solo el texto. */

async function openCombo(page) {
  await page.goto('/');
  await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 5000 });
  await page.evaluate(() => window.navigateTo('promos'));
  await expect(page.locator('#comboList .combo-item').first()).toBeVisible();
}

const state = (page) => page.evaluate(() => {
  const info = window.__FO_TEST.getComboDiscountInfo();
  return {
    size: window.getComboSize(), ids: [...window.comboSelectedIds],
    unavailable: [...info.unavailableSelectedIds], valid: info.isValid, total: info.total,
    dock: document.getElementById('comboDockText').textContent.trim(),
    confirmDisabled: document.getElementById('comboConfirmBtn').disabled,
  };
});
const pickSize = async (page, size) => {
  // Con el dock móvil el scroll suave puede mover el selector mientras se hace clic.
  const btn = page.locator(`.combo-size-btn[data-size="${size}"]`);
  await btn.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await btn.click();
  await expect(page.locator(`.combo-size-btn[data-size="${size}"]`)).toHaveAttribute('aria-pressed', 'true');
};
const pick = async (page, id) => {
  const row = page.locator(`#comboList .combo-item:has(input[data-product-id="${id}"])`);
  await row.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await row.click({ force: true });
  await expect(page.locator(`#comboList input[data-product-id="${id}"]`)).toBeChecked();
};

// ids de perfumes elegibles con 3 ml: `full` tiene todas las tallas, `partial` no tiene 10 ml.
async function pickIds(page, n) {
  return page.evaluate((count) => {
    const eligible = window.FO_PRODUCTS.filter((p) => p.public !== false && !p.tester && p.decantSizes && p.decantSizes[3] !== undefined && !(window.FO_CONFIG && window.FO_CONFIG.PROXIMAMENTE || []).includes(p.id));
    const full = eligible.filter((p) => p.decantSizes[10] !== undefined && p.decantSizes[1] !== undefined).map((p) => p.id);
    const partial = eligible.filter((p) => p.decantSizes[10] === undefined).map((p) => p.id);
    return { full: full.slice(0, count), partial: partial.slice(0, 2) };
  }, n);
}

for (const count of [3, 4, 6]) {
  test(`selección de ${count} sobrevive a cambios de presentación y es reversible`, async ({ page }) => {
    await openCombo(page);
    const { full, partial } = await pickIds(page, count);
    const ids = [partial[0], ...full.slice(0, count - 1)];
    await pickSize(page, 3);
    for (const id of ids) await pick(page, id);
    const base = await state(page);
    expect(base.ids).toEqual(ids);
    expect(base.valid).toBe(true);
    expect(base.confirmDisabled).toBe(false);
    await page.evaluate(() => { window.__comboRef = window.comboSelectedIds; });

    for (const size of ['10', '1', '10', '5', '10']) {
      await pickSize(page, size);
      const s = await state(page);
      expect(s.ids, `ids tras ${size} ml`).toEqual(ids);
      const shouldMiss = await page.evaluate(([list, sz]) => list.filter((id) => window.FO_PRODUCTS.find((p) => p.id === id).decantSizes[sz] === undefined), [ids, size]);
      expect(s.unavailable).toEqual(shouldMiss);
      if (shouldMiss.length) {
        expect(s.valid).toBe(false);
        expect(s.confirmDisabled).toBe(true);
        expect(s.dock).toBe(`${count} seleccionadas · ${shouldMiss.length} sin ${size} ml`);
        await expect(page.locator(`#comboList input[data-product-id="${shouldMiss[0]}"]`)).toBeChecked();
        await expect(page.locator('.combo-chip--unavail')).toHaveCount(shouldMiss.length);
        expect(s.total).toBeLessThan(base.total * 100); // sin precio ficticio para el incompatible
      } else {
        expect(s.valid).toBe(true);
        expect(s.confirmDisabled).toBe(false);
      }
    }
    // El array de selección es el mismo objeto (no se reasignó ni se reinicializó).
    expect(await page.evaluate(() => window.comboSelectedIds === window.__comboRef)).toBe(true);

    await pickSize(page, 3);
    const back = await state(page);
    expect(back).toEqual(base);
    expect(back.dock).toContain('S/');
  });
}

test('precio por presentación sin tocar la composición', async ({ page }) => {
  await openCombo(page);
  const { full } = await pickIds(page, 3);
  for (const id of full.slice(0, 3)) await pick(page, id);
  const prices = {};
  for (const size of ['1', '3', '5', '10']) {
    await pickSize(page, size);
    const s = await state(page);
    expect(s.ids).toEqual(full.slice(0, 3));
    prices[size] = s.total;
  }
  expect(new Set(Object.values(prices)).size).toBe(4);
  await pickSize(page, '3');
  expect((await state(page)).total).toBe(prices['3']);
});

test('móvil: el dock muestra la incompatibilidad sin overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCombo(page);
  const { full, partial } = await pickIds(page, 2);
  for (const id of [partial[0], ...full]) await pick(page, id);
  await pickSize(page, 10);
  await expect(page.locator('#comboDockText')).toHaveText('3 seleccionadas · 1 sin 10 ml');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#comboConfirmBtn')).toBeDisabled();
});
