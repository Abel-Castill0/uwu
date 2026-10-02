import { test, expect } from '@playwright/test';

/* 02/10 — Cliente: (a) NO duplicar el DNI (ya existía como campo OPCIONAL)
   y (b) añadir "Forma de envío" OBLIGATORIA dentro de "Datos de entrega".
   El catálogo de modalidades está cerrado en script.js (SHIP_METHODS:
   motorizado | olva | shalom) — aquí se verifica que el DOM ofrezca
   EXACTAMENTE esos tres valores, que sin selección no se puede confirmar,
   que cada modalidad llega al mensaje de WhatsApp y que el COSTO de envío
   sigue saliendo de las reglas comerciales intactas (nunca se calcula aquí). */

const SHIP_LABELS = {
  motorizado: 'Motorizado',
  olva: 'Olva',
  shalom: 'Shalom',
};

const FIELDS = {
  chNombre: 'Test',
  chApellido: 'Cliente',
  chTelefono: '999888777',
  chDepartamento: 'Lima',
  chProvincia: 'Lima',
  chDistrito: 'Miraflores',
  chDireccion: 'Av. Test 123',
};

/* Sesión limpia: producto en el carrito, stub de window.open y checkout
   visible con el formulario completo relleno. `ship` deja preseleccionada
   una modalidad (las pruebas que necesitan el estado "sin elegir" pasan
   ship: null). */
async function openCheckout(page, { cart, ship = 'motorizado' } = {}) {
  await page.goto('/');
  await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 5000 });
  await page.evaluate((initial) => {
    window.__FO_TEST.clearCart();
    (initial || []).forEach(([id, type, size]) => window.__FO_TEST.addToCart(id, type, size));
    window.__opened = null;
    window.open = (u) => { window.__opened = u; return {}; };
    window.navigateTo('checkout');
  }, cart || [[100, 'decant', '5']]);
  await expect(page.locator('#page-checkout')).toHaveClass(/active/);
  await expect(page.locator('#checkout-form-wrapper')).toBeVisible();
  for (const [id, value] of Object.entries(FIELDS)) await page.locator(`#${id}`).fill(value);
  if (ship) await selectShip(page, ship);
}

async function reenterCheckout(page) {
  await page.evaluate(() => {
    window.__opened = null;
    window.open = (u) => { window.__opened = u; return {}; };
    window.navigateTo('checkout');
  });
  await expect(page.locator('#page-checkout')).toHaveClass(/active/);
}

async function selectShip(page, value) {
  // Se hace click en la tarjeta (el input real está a opacity:0 debajo):
  // es exactamente la interacción del usuario y activa el radio del label.
  await page.locator(`#shipGroup label.ship-option:has(input[value="${value}"])`).click();
  await expect(page.locator(`input[name="chEnvio"][value="${value}"]`)).toBeChecked();
}

/* confirmarCompra() programa `location.href = "gracias.html"` a los 1600 ms
   de un pedido exitoso (solo si la app sigue en checkout). Salir del
   checkout y esperar ese lapso desarma el redirect para que el resto del
   test pueda seguir en la misma página. */
async function confirmOrder(page) {
  await page.locator('#payConfirmBtn').click();
  const url = await page.evaluate(() => window.__opened);
  expect(url).toBeTruthy();
  expect(url).toContain('https://wa.me/');
  await page.evaluate(() => window.navigateTo('catalogo'));
  await page.waitForTimeout(1700);
  return decodeURIComponent(String(url).split('text=')[1] || '');
}

async function confirmDirect(page) {
  return page.evaluate(() => {
    window.__opened = null;
    window.confirmarCompra();
    return window.__opened;
  });
}

test('DNI: campo opcional, no se persiste y viaja al WhatsApp solo si se llena', async ({ page }) => {
  await openCheckout(page);

  // El campo YA existía: se conserva igual, etiquetado como opcional.
  const dni = page.locator('#chDNI');
  await expect(dni).toBeVisible();
  await expect(page.locator('label[for="chDNI"]')).toContainText('opcional');
  await expect(dni).not.toHaveAttribute('required', '');
  await expect(dni).toHaveValue('');

  // 1) Sin DNI el pedido se confirma igual (opcional).
  await expect(page.locator('#payConfirmBtn')).toHaveAttribute('aria-disabled', 'false');
  const emptyMsg = await confirmOrder(page);
  expect(emptyMsg).not.toContain('DNI');

  // 2) DNI válido: aparece en el mensaje y NO se guarda en ningún almacenamiento.
  await reenterCheckout(page);
  await dni.fill('12345678');
  await expect(page.locator('#payConfirmBtn')).toHaveAttribute('aria-disabled', 'false');
  const withDniMsg = await confirmOrder(page);
  expect(withDniMsg).toContain('*DNI:* 12345678');

  const persisted = await page.evaluate(() => {
    const dump = JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, cookie: document.cookie });
    return { hasValue: dump.includes('12345678'), hasKey: /"chDNI"|DNI/.test(dump) };
  });
  expect(persisted).toEqual({ hasValue: false, hasKey: false });

  // 3) DNI con valor: SOLO 8 dígitos. Corto, 9 dígitos y alfanumérico
  //    (la vieja rama 9-12 ya no existe) bloquean el pedido.
  for (const bad of ['123', '123456789', 'ABC123456']) {
    await reenterCheckout(page);
    await dni.fill(bad);
    await expect(page.locator('#payConfirmBtn')).toHaveAttribute('aria-disabled', 'true');
    expect(await confirmDirect(page)).toBeNull();
  }
});

test('Forma de envío: catálogo cerrado de 3 modalidades y bloqueo sin selección', async ({ page }) => {
  await openCheckout(page, { ship: null });

  const group = page.locator('#shipGroup');
  await expect(group).toBeVisible();
  await expect(group.locator('legend')).toContainText('Forma de envío');
  await expect(group.locator('.ship-method__grid')).toHaveAttribute('role', 'radiogroup');

  // Catálogo EXACTO: ni una opción de más ni de menos.
  const radios = page.locator('#shipGroup input[name="chEnvio"]');
  await expect(radios).toHaveCount(3);
  expect(await radios.evaluateAll((els) => els.map((el) => el.value))).toEqual(['motorizado', 'olva', 'shalom']);
  for (const [value, label] of Object.entries(SHIP_LABELS)) {
    await expect(page.locator(`#shipGroup label.ship-option:has(input[value="${value}"]) .ship-option__name`)).toHaveText(label);
  }

  // Sin selección: el botón queda inerte y confirmarCompra() no genera pedido.
  await expect(page.locator('#payConfirmBtn')).toHaveAttribute('aria-disabled', 'true');
  expect(await confirmDirect(page)).toBeNull();
  await expect(group).toHaveClass(/is-invalid/);

  // Las tres modalidades, una por una: UNA sola línea de modalidad por
  // mensaje (nunca dos ni una de más), y el costo sale de las reglas
  // comerciales — idéntico con cualquiera de las tres (independiente).
  const costs = [];
  for (const [value, label] of Object.entries(SHIP_LABELS)) {
    await reenterCheckout(page);
    await selectShip(page, value);
    await expect(page.locator('#payConfirmBtn')).toHaveAttribute('aria-disabled', 'false');
    await expect(group).not.toHaveClass(/is-invalid/);
    const msg = await confirmOrder(page);
    expect(msg.split('🚚 *Forma de envío:*').length - 1).toBe(1);
    expect(msg).toContain(`🚚 *Forma de envío:* ${label}`);
    for (const otherLabel of Object.values(SHIP_LABELS)) {
      if (otherLabel !== label) expect(msg).not.toContain(`🚚 *Forma de envío:* ${otherLabel}`);
    }
    const cost = (msg.match(/💸 \*Costo de envío:\* (GRATIS|A coordinar \(Lima Metropolitana\))/) || [])[1];
    expect(cost).toBeTruthy();
    expect(msg).not.toContain('🚚 *Envío:*');
    costs.push(cost);
  }
  expect(new Set(costs).size).toBe(1);

  // Modalidad desconocida inyectada en el DOM: el catálogo cerrado la
  // rechaza (cuenta como "sin elegir") y el pedido queda bloqueado.
  await reenterCheckout(page);
  await page.evaluate(() => {
    const radio = document.querySelector('input[name="chEnvio"][value="shalom"]');
    radio.value = 'dhl';
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#payConfirmBtn')).toHaveAttribute('aria-disabled', 'true');
  await expect(group).toHaveClass(/is-invalid/);
  expect(await confirmDirect(page)).toBeNull();
});

test('Costo de envío conserva la regla comercial: GRATIS desde S/199', async ({ page }) => {
  test.setTimeout(150000); // 2 carritos × 3 modalidades (cada confirm exige reabrir checkout)

  // < S/199 (decant S/59): A coordinar, con CUALQUIER modalidad.
  for (const value of Object.keys(SHIP_LABELS)) {
    await openCheckout(page, { cart: [[100, 'decant', '5']], ship: value });
    const cheapMsg = await confirmOrder(page);
    expect(cheapMsg).toContain('💸 *Costo de envío:* A coordinar (Lima Metropolitana)');
    expect(cheapMsg).toContain(`🚚 *Forma de envío:* ${SHIP_LABELS[value]}`);
  }

  // ≥ S/199 (frasco completo S/875): GRATIS, con CUALQUIER modalidad.
  for (const value of Object.keys(SHIP_LABELS)) {
    await openCheckout(page, { cart: [[141, 'full', '100']], ship: value });
    const expensiveMsg = await confirmOrder(page);
    expect(expensiveMsg).toContain('💸 *Costo de envío:* GRATIS');
    expect(expensiveMsg).toContain(`🚚 *Forma de envío:* ${SHIP_LABELS[value]}`);
  }
});

test('La forma de envío vive en "Datos de entrega", antes del pago', async ({ page }) => {
  await openCheckout(page);
  const order = await page.evaluate(() => {
    const ship = document.getElementById('shipGroup');
    const payTitle = [...document.querySelectorAll('#checkoutForm .form-section-title')]
      .find((el) => el.textContent.includes('pagar'));
    const summary = document.querySelector('.checkout-summary');
    return {
      insideForm: !!document.getElementById('checkoutForm').contains(ship),
      payTitleIsAfter: !!payTitle && !!(ship.compareDocumentPosition(payTitle) & Node.DOCUMENT_POSITION_FOLLOWING),
      summaryIsAfter: !!summary && !!(ship.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING),
      label: (ship.querySelector('.ship-method__legend') || {}).textContent || '',
    };
  });
  expect(order.insideForm).toBe(true);
  expect(order.payTitleIsAfter).toBe(true);
  expect(order.summaryIsAfter).toBe(true);
  expect(order.label.trim()).toBe('Forma de envío *');
});

test('Responsive: las 3 modalidades sin desborde de 320 a 1280 px', async ({ page }) => {
  await openCheckout(page);
  for (const width of [320, 360, 390, 430, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('#shipGroup')).toBeVisible();
    await expect(page.locator('#shipGroup .ship-option')).toHaveCount(3);
    const state = await page.evaluate(() => {
      const group = document.getElementById('shipGroup');
      const box = group.getBoundingClientRect();
      const cards = [...group.querySelectorAll('.ship-option__card')].map((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right <= innerWidth + 1 && r.left >= -1;
      });
      return {
        pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        groupOverflow: box.right > innerWidth + 1 || box.left < -1,
        allCardsInside: cards.length === 3 && cards.every(Boolean),
        namesFit: [...group.querySelectorAll('.ship-option__name')].every((el) => el.scrollHeight <= el.clientHeight + 1),
      };
    });
    expect(state.pageOverflow).toBe(false);
    expect(state.groupOverflow).toBe(false);
    expect(state.allCardsInside).toBe(true);
    expect(state.namesFit).toBe(true);
  }
});
