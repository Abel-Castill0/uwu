import { test, expect } from '@playwright/test';

/* Regresión "Arma tu combo": CADA perfume lleva su TALLA INDEPENDIENTE.
   No existe un tamaño global del combo: cambiar la talla de una fila solo
   reescribe ESA entrada (id -> talla), nunca toca las demás selecciones.
   Se verifica el estado real (getComboSelections/getComboDiscountInfo),
   no solo el texto. */

async function openCombo(page) {
  await page.goto('/');
  await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 5000 });
  await page.evaluate(() => window.navigateTo('promos'));
  await expect(page.locator('#comboList .combo-item').first()).toBeVisible();
}

const state = (page) => page.evaluate(() => {
  const info = window.__FO_TEST.getComboDiscountInfo();
  return {
    selections: window.__FO_TEST.getComboSelections(),
    ids: [...window.comboSelectedIds],
    unavailable: [...info.unavailableSelectedIds],
    valid: info.isValid,
    subtotal: info.subtotal,
    total: info.total,
    dock: document.getElementById('comboDockText').textContent.trim(),
    confirmDisabled: document.getElementById('comboConfirmBtn').disabled,
  };
});

const pick = async (page, id) => {
  const box = page.locator(`#comboList input[type="checkbox"][data-product-id="${id}"]`);
  await box.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await box.click({ force: true });
  await expect(box).toBeChecked();
};

/* Talla POR FILA: '' = "Elegir talla" (seleccionado pero sin talla). */
const setRowSize = async (page, id, size) => {
  const sel = page.locator(`#comboList select.combo-item__size[data-product-id="${id}"]`);
  await sel.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sel.selectOption(String(size));
};

// ids de perfumes elegibles: `full` tiene todas las tallas, `partial` (113)
// solo 2/3/5 ml — sirve para comprobar que cada fila ofrece SOLO las suyas.
async function pickIds(page, count) {
  return page.evaluate((n) => {
    const prox = (window.FO_CONFIG && window.FO_CONFIG.PROXIMAMENTE) || [];
    const noDisp = (window.FO_CONFIG && window.FO_CONFIG.NO_DISPONIBLE) || [];
    const comboSizes = ['1', '2', '3', '5', '10'];
    const eligible = window.FO_PRODUCTS.filter((p) =>
      p.public !== false && !p.tester && !prox.includes(p.id) && !noDisp.includes(p.id) &&
      p.decantSizes && comboSizes.some((s) => p.decantSizes[s] !== undefined));
    const full = eligible.filter((p) => p.decantSizes[1] !== undefined && p.decantSizes[10] !== undefined).map((p) => p.id);
    const partial = eligible.filter((p) => p.decantSizes[10] === undefined).map((p) => p.id);
    return { full: full.slice(0, n), partial: partial.slice(0, 2) };
  }, count);
}

test('cada fila tiene su propio selector de tallas y no existe el selector global', async ({ page }) => {
  await openCombo(page);
  const layout = await page.evaluate(() => ({
    rows: document.querySelectorAll('#comboList .combo-item').length,
    selects: document.querySelectorAll('#comboList select.combo-item__size').length,
    global: document.querySelectorAll('.combo-size-select, .combo-size-btn').length,
  }));
  expect(layout.rows).toBeGreaterThan(0);
  expect(layout.selects).toBe(layout.rows);
  expect(layout.global).toBe(0);

  // Una fila solo ofrece las tallas que existen para ESE producto.
  const { full, partial } = await pickIds(page, 2);
  await pick(page, partial[0]);
  await expect(page.locator(`#comboList select.combo-item__size[data-product-id="${partial[0]}"] option[value="10"]`)).toHaveCount(0);
  await expect(page.locator(`#comboList select.combo-item__size[data-product-id="${partial[0]}"] option[value="2"]`)).toHaveCount(1);
  await expect(page.locator(`#comboList select.combo-item__size[data-product-id="${full[0]}"] option[value="10"]`)).toHaveCount(1);
});

test('tallas distintas conviven en el mismo combo y cada una suma su precio', async ({ page }) => {
  await openCombo(page);
  const { full } = await pickIds(page, 3);
  const ids = full.slice(0, 3);
  for (const id of ids) await pick(page, id);

  let s = await state(page);
  expect(s.ids).toEqual(ids);
  expect(Object.values(s.selections).every((size) => size === '3')).toBe(true); // talla inicial

  await setRowSize(page, ids[0], '10');
  await setRowSize(page, ids[1], '5');
  await setRowSize(page, ids[2], '1');
  s = await state(page);
  expect(s.selections).toEqual({ [ids[0]]: '10', [ids[1]]: '5', [ids[2]]: '1' });
  expect(s.unavailable).toEqual([]);
  expect(s.valid).toBe(true);
  expect(s.confirmDisabled).toBe(false);

  const expectedSubtotal = await page.evaluate((list) => list.reduce((sum, it) => {
    const p = window.FO_PRODUCTS.find((x) => x.id === it.id);
    return sum + p.decantSizes[it.size];
  }, 0), [{ id: ids[0], size: '10' }, { id: ids[1], size: '5' }, { id: ids[2], size: '1' }]);
  expect(s.subtotal).toBe(expectedSubtotal);

  // El chip informa la talla de CADA perfume.
  await expect(page.locator('.combo-chip__size')).toHaveCount(3);
});

test('cambiar la talla de un perfume nunca toca a los demás', async ({ page }) => {
  await openCombo(page);
  const { full } = await pickIds(page, 3);
  const ids = full.slice(0, 3);
  for (const id of ids) await pick(page, id);
  await setRowSize(page, ids[0], '10');
  await setRowSize(page, ids[1], '5');
  const before = await state(page);

  await setRowSize(page, ids[2], '3');
  await setRowSize(page, ids[0], '1');
  const after = await state(page);
  expect(after.ids).toEqual(before.ids);           // selección intacta
  expect(after.selections[ids[1]]).toBe('5');      // la otra fila no se movió
  expect(after.selections[ids[0]]).toBe('1');
  expect(after.selections[ids[2]]).toBe('3');
  expect(after.valid).toBe(true);
  expect(after.confirmDisabled).toBe(false);
});

test('precio por presentación de UN perfume (sin tocar la composición)', async ({ page }) => {
  await openCombo(page);
  const { full } = await pickIds(page, 3);
  const id = full[0];
  await pick(page, id);

  const prices = {};
  for (const size of ['1', '3', '5', '10']) {
    await setRowSize(page, id, size);
    const s = await state(page);
    prices[size] = s.subtotal;
    expect(s.selections).toEqual({ [id]: size });
  }
  expect(new Set(Object.values(prices)).size).toBe(4);
  const catalog = await page.evaluate((pid) => window.FO_PRODUCTS.find((p) => p.id === pid).decantSizes, id);
  expect(prices).toEqual({ '1': catalog[1], '3': catalog[3], '5': catalog[5], '10': catalog[10] });

  await setRowSize(page, id, '3');
  expect((await state(page)).subtotal).toBe(prices['3']);
});

test('dejar un perfume sin talla conserva la selección y bloquea confirmar', async ({ page }) => {
  await openCombo(page);
  const { full } = await pickIds(page, 3);
  const ids = full.slice(0, 3);
  for (const id of ids) await pick(page, id);

  await setRowSize(page, ids[1], '');
  const s = await state(page);
  expect(s.ids).toEqual(ids);                 // NO se eliminó ninguna selección
  expect(s.selections[ids[1]]).toBeNull();
  expect(s.unavailable).toEqual([ids[1]]);
  expect(s.valid).toBe(false);
  expect(s.confirmDisabled).toBe(true);
  expect(s.dock).toContain('sin talla');
  await expect(page.locator('.combo-chip--unavail')).toHaveCount(1);
  await expect(page.locator(`#comboList .combo-item:has(input[data-product-id="${ids[1]}"])`)).toHaveClass(/pending/);

  // Recuperar la talla reactiva el combo sin volver a seleccionar nada.
  await setRowSize(page, ids[1], '5');
  const restored = await state(page);
  expect(restored.ids).toEqual(ids);
  expect(restored.valid).toBe(true);
  expect(restored.confirmDisabled).toBe(false);
});

test('móvil: el dock muestra la talla pendiente sin overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCombo(page);
  const { full, partial } = await pickIds(page, 2);
  const ids = [partial[0], ...full.slice(0, 2)];
  for (const id of ids) await pick(page, id);
  await setRowSize(page, ids[0], '');
  await expect(page.locator('#comboDockText')).toHaveText('3 seleccionadas · 1 sin talla elegida');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#comboConfirmBtn')).toBeDisabled();
});
