import { test, expect } from '@playwright/test';

/* Validación explícita pedida antes del commit:
   CADA PERFUME SELECCIONADO TIENE SU PROPIO TAMAÑO INDEPENDIENTE.

   Se prueba el flujo REAL en navegador (no solo el estado interno):
   A=2ml, B=3ml, C=5ml, D=10ml → cambio aislado de B, cambio aislado de
   A, quitar C, re-agregar C con 2ml. En cada paso se lee la UI (fila
   seleccionada, <select> de la fila, precio de la fila y los chips del
   resumen con la talla de CADA perfume) y se recalcula el total desde
   los precios del catálogo por presentación.

   Después: el pack viaja a carrito/checkout/WhatsApp conservando
   perfume + talla + precio por línea, y Ani (90) queda NO DISPONIBLE. */

const fmt = (p) => 'S/ ' + Number(p).toFixed(2);

async function openCombo(page) {
  await page.goto('/');
  await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 5000 });
  await page.evaluate(() => window.navigateTo('promos'));
  await expect(page.locator('#comboList .combo-item').first()).toBeVisible();
}

/* 4 perfumes elegibles que ofrecen TODAS las tallas del flujo. */
async function pickMix(page) {
  const products = await page.evaluate(() => {
    const prox = (window.FO_CONFIG && window.FO_CONFIG.PROXIMAMENTE) || [];
    const noDisp = (window.FO_CONFIG && window.FO_CONFIG.NO_DISPONIBLE) || [];
    const want = ['1', '2', '3', '5', '10'];
    const seen = {};
    const out = [];
    for (const p of window.FO_PRODUCTS) {
      if (p.public === false || p.tester || prox.includes(p.id) || noDisp.includes(p.id)) continue;
      if (!p.decantSizes || !want.every((s) => p.decantSizes[s] != null)) continue;
      if (seen[p.name]) continue;
      seen[p.name] = true;
      out.push({ id: p.id, name: p.name, prices: Object.fromEntries(want.map((s) => [s, p.decantSizes[s]])) });
      if (out.length === 4) break;
    }
    return out;
  });
  expect(products).toHaveLength(4);
  return products;
}

const row = (page, id) => page.locator(`#comboList .combo-item:has(input[data-product-id="${id}"])`);

async function rowUI(page, id) {
  return row(page, id).evaluate((el) => ({
    selected: el.classList.contains('selected'),
    checked: el.querySelector('input').checked,
    size: el.querySelector('select.combo-item__size').value,
    price: el.querySelector('.combo-item__price').textContent.trim(),
    name: el.querySelector('.combo-item__name').textContent.trim(),
  }));
}

async function selectWithSize(page, id, size) {
  const box = page.locator(`#comboList input[type="checkbox"][data-product-id="${id}"]`);
  await box.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await box.click();
  await expect(box).toBeChecked();
  await page.locator(`#comboList select.combo-item__size[data-product-id="${id}"]`).selectOption(size);
}

async function deselect(page, id) {
  const box = page.locator(`#comboList input[type="checkbox"][data-product-id="${id}"]`);
  await box.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await box.click();
  await expect(box).not.toBeChecked();
}

/* Cambiar la talla de UNA fila (sin tocar el checkbox). */
async function setRowSize(page, id, size) {
  const sel = page.locator(`#comboList select.combo-item__size[data-product-id="${id}"]`);
  await sel.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sel.selectOption(size);
}

/* Resumen: los chips del panel. En móvil el panel es un dock colapsado,
   así que se expande (flujo real de usuario), se leen los chips visibles
   y se vuelve a colapsar para no tapar la lista. */
async function readChips(page) {
  const trigger = page.locator('#comboDockTrigger');
  const mobile = await trigger.isVisible();
  const expanded = async () => (await trigger.isVisible())
    ? page.locator('#comboSummary').evaluate((el) => el.classList.contains('expanded'))
    : false;
  if (mobile && !(await expanded())) await trigger.click();
  if (mobile) await expect(page.locator('#comboSummaryChips')).toBeVisible();
  const chips = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#comboSummaryChips .combo-chip')).map((c) => ({
      name: ((c.childNodes[0] && c.childNodes[0].textContent) || '').trim(),
      size: c.querySelector('.combo-chip__size') ? c.querySelector('.combo-chip__size').textContent.trim() : null,
    })));
  if (mobile && (await expanded())) {
    await trigger.click();
    await expect(page.locator('#comboSummary')).not.toHaveClass(/expanded/);
    // La transición del sheet (.3-.45s) deja el panel sobre las filas un
    // instante: esperar a que realmente se encoja antes de seguir tocando.
    await expect.poll(async () => {
      const bb = await page.locator('#comboSummary').boundingBox();
      return bb ? bb.height : 0;
    }).toBeLessThan(90);
  }
  return chips;
}

/* Total mostrado vs total recalculado desde los precios del catálogo de
   CADA talla elegida (la pct se lee del propio label, sin repetir aquí
   las reglas comerciales). */
async function checkTotal(page, entries) {
  const data = await page.evaluate((items) => {
    const subtotal = items.reduce((sum, [id, size]) => {
      const p = window.FO_PRODUCTS.find((x) => x.id === id);
      return sum + p.decantSizes[size];
    }, 0);
    const label = document.getElementById('comboDiscountLabel').textContent.trim();
    const amount = document.getElementById('comboTotalAmount').textContent.trim();
    const pct = parseInt(label, 10);
    return { subtotal, label, amount, pct: isNaN(pct) ? 0 : pct };
  }, entries);
  const discount = Math.round(data.subtotal * data.pct) / 100;
  const total = Math.round((data.subtotal - discount) * 100) / 100;
  const subTxt = fmt(data.subtotal);
  const totTxt = fmt(total);
  expect(data.amount).toBe(data.pct > 0 ? `${subTxt} → ${totTxt}` : subTxt);
  return data;
}

/* Estados esperados en cada tramo: [{id, name, size}] en orden de
   inserción del resumen (chips) + precio de fila por presentación. */
async function expectState(page, products, ordered) {
  const selectedCount = ordered.length;
  await expect(page.locator('#comboList .combo-item.selected')).toHaveCount(selectedCount);
  for (const want of ordered) {
    const prod = products.find((p) => p.id === want.id);
    const ui = await rowUI(page, prod.id);
    expect(ui).toMatchObject({
      selected: true,
      checked: true,
      size: want.size,
      price: fmt(prod.prices[want.size]),
      name: prod.name,
    });
  }
  const chips = await readChips(page);
  expect(chips).toEqual(ordered.map((w) => {
    const prod = products.find((p) => p.id === w.id);
    return { name: prod.name, size: `${w.size} ml` };
  }));
  const internal = await page.evaluate(() => window.__FO_TEST.getComboSelections());
  expect(internal).toEqual(Object.fromEntries(ordered.map((w) => [w.id, w.size])));
  await checkTotal(page, ordered.map((w) => [w.id, w.size]));
}

async function runMixedSizesFlow(page) {
  const products = await pickMix(page);
  const [A, B, C, D] = products;

  // 2-5. Cada perfume con SU talla.
  await selectWithSize(page, A.id, '2');
  await selectWithSize(page, B.id, '3');
  await selectWithSize(page, C.id, '5');
  await selectWithSize(page, D.id, '10');

  // 6-8. Los 4 seleccionados y el resumen con la talla de cada uno.
  await expectState(page, products, [
    { id: A.id, size: '2' },
    { id: B.id, size: '3' },
    { id: C.id, size: '5' },
    { id: D.id, size: '10' },
  ]);
  await expect(page.locator('#comboConfirmBtn')).toBeEnabled();

  // 9-10. Cambiar SOLO B → 10 ml.
  await setRowSize(page, B.id, '10');
  await expectState(page, products, [
    { id: A.id, size: '2' },
    { id: B.id, size: '10' },
    { id: C.id, size: '5' },
    { id: D.id, size: '10' },
  ]);

  // 11-12. Cambiar SOLO A → 3 ml.
  await setRowSize(page, A.id, '3');
  await expectState(page, products, [
    { id: A.id, size: '3' },
    { id: B.id, size: '10' },
    { id: C.id, size: '5' },
    { id: D.id, size: '10' },
  ]);

  // 13-14. Quitar C: A/B/D permanecen con sus tallas.
  await deselect(page, C.id);
  await expectState(page, products, [
    { id: A.id, size: '3' },
    { id: B.id, size: '10' },
    { id: D.id, size: '10' },
  ]);
  await expect(page.locator(`#comboList input[data-product-id="${C.id}"]`)).not.toBeChecked();

  // 15-16. Re-agregar C con 2 ml: todos con su talla individual.
  await selectWithSize(page, C.id, '2');
  await expectState(page, products, [
    { id: A.id, size: '3' },
    { id: B.id, size: '10' },
    { id: D.id, size: '10' },
    { id: C.id, size: '2' },
  ]);
  await expect(page.locator('#comboConfirmBtn')).toBeEnabled();
  return { products, ordered: [{ id: A.id, size: '3' }, { id: B.id, size: '10' }, { id: D.id, size: '10' }, { id: C.id, size: '2' }] };
}

test('desktop:4 tallas independientes (2/3/5/10ml) + cambios aislados + quitar/re-agregar', async ({ page }) => {
  await openCombo(page);
  await runMixedSizesFlow(page);
});

test('móvil: mismo flujo de tallas mixtas con resumen en dock', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCombo(page);
  await runMixedSizesFlow(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('carrito/checkout/WhatsApp conservan perfume, talla y precio por línea', async ({ page }) => {
  await openCombo(page);
  const products = await pickMix(page);
  const [A, B, C, D] = products;
  const sizes = [[A, '2'], [B, '3'], [C, '5'], [D, '10']];
  for (const [p, size] of sizes) await selectWithSize(page, p.id, size);
  await page.locator('#comboConfirmBtn').click();
  await expect(page.locator('#page-checkout.active')).toBeVisible();

  // Checkout: pack con tallas mixtas + cada perfume con su talla y precio.
  const summary = await page.locator('#checkoutSummaryItems').innerText();
  expect(summary).toContain('4 fragancias');
  expect(summary).toContain('2ml / 3ml / 5ml / 10ml');
  for (const [p, size] of sizes) {
    expect(summary).toContain(p.name);
    expect(summary).toContain(`${size}ml · ${fmt(p.prices[size])}`);
  }

  // Carrito lateral: strip con nombre + talla + precio de CADA perfume.
  await page.locator('#btnCart').click();
  await expect(page.locator('#cartSidebar')).toHaveClass(/active/);
  await expect(page.locator('#cartItems .cart-item-meta').first()).toContainText('Pack 2ml / 3ml / 5ml / 10ml');
  const strip = page.locator('#cartItems .cart-pack-item');
  await expect(strip).toHaveCount(4);
  for (let i = 0; i < sizes.length; i++) {
    const [p, size] = sizes[i];
    await expect(strip.nth(i).locator('.cart-pack-name')).toHaveText(p.name);
    await expect(strip.nth(i).locator('.cart-pack-meta')).toHaveText(`${size}ml · ${fmt(p.prices[size])}`);
  }
  await page.locator('.cart-close').click();

  // Mensaje de WhatsApp: misma información por producto.
  await page.evaluate(() => {
    window.__opened = null;
    window.open = (u) => { window.__opened = u; return {}; };
  });
  for (const [id, value] of [
    ['chNombre', 'Test'], ['chApellido', 'Combo'], ['chTelefono', '999888777'],
    ['chDepartamento', 'Lima'], ['chProvincia', 'Lima'], ['chDireccion', 'Av. Test 123'], ['chDistrito', 'Miraflores'],
  ]) {
    await page.locator(`#${id}`).fill(value);
  }
  // Forma de envío (02/10): obligatoria para habilitar el botón.
  await page.locator('label.ship-option:has(input[name="chEnvio"][value="motorizado"])').click();
  await expect(page.locator('input[name="chEnvio"][value="motorizado"]')).toBeChecked();
  await expect(page.locator('#payConfirmBtn')).toHaveAttribute('aria-disabled', 'false');
  await page.locator('#payConfirmBtn').click();
  const url = await page.evaluate(() => window.__opened);
  expect(url).toBeTruthy();
  expect(url).toContain('https://wa.me/');
  const msg = decodeURIComponent(String(url).split('text=')[1] || '');
  for (const [p, size] of sizes) {
    expect(msg).toContain(`• ${p.name} (${size}ml) · ${fmt(p.prices[size])}`);
  }
  expect(msg).toContain('Combo curado · 4 fragancias (Pack 2ml / 3ml / 5ml / 10ml)');
  expect(msg).toContain('Precio: ');
  expect(msg).toContain('🚚 *Forma de envío:* Motorizado');
  expect(msg).toMatch(/💸 \*Costo de envío:\* (GRATIS|A coordinar \(Lima Metropolitana\))/);
});

test('Ani (90): NO DISPONIBLE en catálogo, sin compra y fuera del combo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 5000 });
  await page.evaluate(() => window.navigateTo('catalogo'));
  await page.locator('#catalogSearch').fill('Ani');

  // Visible en el catálogo y marcada NO DISPONIBLE (no está eliminada).
  expect(await page.evaluate(() => {
    const p = window.FO_PRODUCTS.find((x) => x.id === 90);
    return { public: p.public, proximamente: (window.FO_CONFIG.PROXIMAMENTE || []).includes(90), noDisp: (window.FO_CONFIG.NO_DISPONIBLE || []).includes(90) };
  })).toEqual({ public: undefined, proximamente: false, noDisp: true });

  const card = page.locator('#catalogGrid [data-product-id="90"]');
  await expect(card).toBeVisible();
  await expect(card.locator('.product-badge').filter({ hasText: 'NO DISPONIBLE' })).toHaveCount(1);
  await expect(card.locator('.btn-add')).toBeDisabled();
  await expect(card.locator('.product-price')).toHaveText('No disponible');

  // Ficha: sin tallas y sin forma de agregarla al carrito.
  await card.click();
  await expect(page.locator('#modalOverlay')).toHaveClass(/active/);
  await expect(page.locator('#modalName')).toHaveText('Ani');
  await expect(page.locator('#modalSizes .size-option')).toHaveCount(0);
  await expect(page.locator('#modalAddBtn')).toBeDisabled();
  await page.locator('#modalAddBtn').dispatchEvent('click');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fo_cart_v4') || '[]').length)).toBe(0);
  await page.locator('#modalOverlay .modal-close').click();

  // Combos: Ani no aparece en la lista (no seleccionable).
  await page.evaluate(() => window.navigateTo('promos'));
  await expect(page.locator('#comboList .combo-item').first()).toBeVisible();
  expect(await page.evaluate(() =>
    Array.from(document.querySelectorAll('#comboList .combo-item__name')).some((el) => el.textContent.trim() === 'Ani'))).toBe(false);
  expect(await page.locator('#comboList [data-product-id="90"]').count()).toBe(0);
});
