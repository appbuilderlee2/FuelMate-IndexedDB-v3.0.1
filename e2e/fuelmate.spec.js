import { expect, test } from '@playwright/test';

async function openFreshApp(page) {
  await page.goto('./');
  await expect(page).toHaveTitle('FuelMate');
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.getByTestId('modal-overlay')).toBeVisible();
}

async function createVehicle(page) {
  await page.locator('#v_make').fill('E2E');
  await page.locator('#v_model').fill('Roadster');
  await page.locator('#v_odo').fill('1000');
  await page.getByTestId('save-vehicle').click();
  await expect(page.getByTestId('modal-overlay')).toBeHidden();
  await expect(page.getByText('E2E Roadster', { exact: false }).first()).toBeVisible();
}

async function waitForVisualAssets(page) {
  await page.evaluate(async () => {
    await document.fonts.load('24px "Material Icons"');
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  expect(await page.evaluate(() => document.fonts.check('24px "Material Icons"'))).toBe(true);
}

async function hideTransientStatusForScreenshot(page) {
  // The update-ready notice belongs to a separate service-worker lifecycle check.
  await page.evaluate(() => {
    const banner = document.getElementById('pwa-status-banner');
    if (banner) banner.style.visibility = 'hidden';
  });
}

test('creates a vehicle and keeps the Settings version synchronized', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await openFreshApp(page);
  await createVehicle(page);
  await page.getByTestId('nav-settings').click();

  await expect(page.getByRole('heading', { name: /Settings|設定/ })).toBeVisible();
  const runtimeVersion = await page.evaluate(() => FuelMateVersion.current);
  await expect(page.getByTestId('app-version')).toContainText(`v${runtimeVersion}`);
  await page.getByTestId('appearance-dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'apple-fluid-dark');
  await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'dark');
  await waitForVisualAssets(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  await page.screenshot({ path: testInfo.outputPath('apple-fluid-dark.png'), fullPage: true });
  await page.reload();
  await page.getByTestId('nav-settings').click();
  await expect(page.getByTestId('appearance-dark')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('appearance-light').click();
  await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'light');
  await waitForVisualAssets(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  await page.screenshot({ path: testInfo.outputPath('apple-fluid-light.png'), fullPage: true });
  await page.getByTestId('appearance-system').click();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'apple-fluid-system');
  await page.getByTestId('currency-setting').selectOption('€');
  await expect(page.getByTestId('currency-setting')).toHaveValue('€');
  expect(pageErrors).toEqual([]);
});

test('optional iOS styles preserve mode, records and the original appearance', async ({ page }) => {
  await openFreshApp(page);
  await createVehicle(page);
  await page.getByTestId('nav-settings').click();
  await page.getByTestId('appearance-ios-native').click();
  await page.getByTestId('ios-mode-dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'ios-native-dark');
  await page.getByTestId('appearance-ios-glass').click();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'ios-glass-dark');
  await page.getByTestId('reduce-transparency').check();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-transparency', 'true');
  await page.reload();
  await page.getByTestId('nav-settings').click();
  await expect(page.getByTestId('appearance-ios-glass')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('reduce-transparency')).toBeChecked();
  await page.getByTestId('ios-mode-system').click();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'dark');
  await page.getByTestId('appearance-light').click();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'apple-fluid-light');
  await page.getByTestId('nav-dashboard').click();
  await expect(page.getByText('E2E Roadster', { exact: false }).first()).toBeVisible();
});

test('Apple Fluid dashboard uses saved records and keeps its primary actions usable', async ({ page }, testInfo) => {
  await openFreshApp(page);
  await createVehicle(page);
  await page.evaluate(async () => {
    const today = FuelMateCore.localDateKey();
    await store.addLog({ id: 'dash-fuel', vehicleId: store.data.settings.activeVehicleId, type: 'fuel', date: today, odometer: 1000, cost: '80', liters: '40' });
    await store.addLog({ id: 'dash-service', vehicleId: store.data.settings.activeVehicleId, type: 'service', date: today, odometer: 1001, cost: '60', notes: 'Oil change' });
    ui.render();
  });
  const dashboard = page.getByTestId('fluid-dashboard');
  await expect(dashboard).toBeVisible();
  await expect(dashboard.locator('.fluid-hero h2')).toHaveText('E2E Roadster');
  await expect(dashboard.locator('.fluid-metric').nth(1).getByText('$140.00')).toBeVisible();
  await expect(page.getByTestId('dashboard-recent')).toHaveCount(2);
  await waitForVisualAssets(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await hideTransientStatusForScreenshot(page);
  await page.screenshot({ path: testInfo.outputPath('dashboard-light.png'), fullPage: false });
  await page.getByTestId('dashboard-add-fuel').click();
  await expect(page.getByTestId('modal-overlay')).toBeVisible();
  await expect(page.locator('#l_liters')).toBeVisible();
  await page.getByTestId('modal-overlay').click({ position: { x: 3, y: 3 } });
  await page.getByTestId('nav-settings').click();
  await page.getByTestId('appearance-dark').click();
  await page.getByTestId('nav-dashboard').click();
  await waitForVisualAssets(page);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await hideTransientStatusForScreenshot(page);
  await page.screenshot({ path: testInfo.outputPath('dashboard-dark.png'), fullPage: false });
  await page.getByTestId('dashboard-see-all').click();
  await expect(page.locator('#modal-content').getByTestId('log-card')).toHaveCount(2);
});

test('vehicle shortcuts switch between saved cars and date periods stay separate', async ({ page }, testInfo) => {
  await openFreshApp(page);
  await createVehicle(page);
  await page.getByTestId('dashboard-add-vehicle').click();
  await page.locator('#v_make').fill('Honda');
  await page.locator('#v_model').fill('CR-V');
  await page.locator('#v_year').fill('2018');
  await page.locator('#v_odo').fill('12000');
  await page.getByTestId('save-vehicle').click();
  await expect(page.getByTestId('dashboard-vehicle-option')).toHaveCount(2);
  await page.getByTestId('dashboard-vehicle-option').first().click();
  await expect(page.getByTestId('fluid-dashboard').locator('.fluid-hero h2')).toHaveText('E2E Roadster');
  await page.getByTestId('dashboard-vehicle-option').nth(1).click();
  await expect(page.getByTestId('fluid-dashboard').locator('.fluid-hero h2')).toHaveText('Honda CR-V');
  await page.evaluate(async () => {
    const vehicleId = store.data.settings.activeVehicleId;
    await store.addLog({ id: 'earlier-fuel', vehicleId, type: 'fuel', date: '2025-05-10', odometer: 12100, cost: '30', liters: '15' });
    await store.addLog({ id: 'later-fuel', vehicleId, type: 'fuel', date: '2026-09-20', odometer: 12300, cost: '40', liters: '20' });
    ui.render();
  });
  for (const nav of ['fuel', 'parking', 'maintenance', 'analytics']) {
    await page.getByTestId(`nav-${nav}`).click();
    const period = page.getByTestId(`period-filter-${nav}`);
    await expect(period.getByTestId('period-mode-year')).toHaveAttribute('aria-pressed', 'true');
    await period.getByTestId('period-mode-custom').click();
    await period.getByTestId('period-from').fill('2025-05-01');
    await expect(period.getByTestId('period-from')).toHaveValue('2025-05-01');
    await page.getByTestId(`period-filter-${nav}`).getByTestId('period-to').fill('2025-05-31');
    await expect(page.getByTestId(`period-filter-${nav}`).getByTestId('period-to')).toHaveValue('2025-05-31');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    if (nav === 'fuel') {
      await waitForVisualAssets(page);
      await hideTransientStatusForScreenshot(page);
      await page.screenshot({ path: testInfo.outputPath('period-filter-fuel.png'), fullPage: false });
      await expect(page.locator('[data-testid="log-card"][data-log-type="fuel"]')).toHaveCount(1);
      await page.getByTestId(`period-filter-${nav}`).getByTestId('period-from').fill('2025-06-01');
      await expect(page.getByTestId(`period-filter-${nav}`).getByTestId('period-to')).toHaveValue('2025-06-01');
      await page.getByTestId(`period-filter-${nav}`).getByTestId('period-mode-year').click();
      await expect(page.locator('[data-testid="log-card"][data-log-type="fuel"]')).toHaveCount(1);
      await expect(page.getByTestId(`period-filter-${nav}`).getByTestId('period-value')).toHaveValue('2026');
      await page.getByTestId(`period-filter-${nav}`).getByTestId('period-mode-custom').click();
      await expect(page.getByTestId(`period-filter-${nav}`).getByTestId('period-from')).toHaveValue('');
    }
  }
});

test('dashboard car image follows the selected Mazda 2 or Honda CR-V', async ({ page }, testInfo) => {
  await openFreshApp(page);
  await createVehicle(page);
  await expect(page.getByTestId('dashboard-vehicle-fallback')).toBeVisible();

  for (const car of [{ make: 'Mazda', model: '2', year: '2012' }, { make: 'Honda', model: 'CRV', year: '2018' }]) {
    await page.getByTestId('dashboard-add-vehicle').click();
    await page.locator('#v_make').fill(car.make);
    await page.locator('#v_model').fill(car.model);
    await page.locator('#v_year').fill(car.year);
    await page.locator('#v_odo').fill('1000');
    await page.getByTestId('save-vehicle').click();
  }

  for (const car of [{ label: 'Mazda 2 2012', file: 'vehicle-hatchback.webp', screenshot: 'vehicle-mazda.png' }, { label: 'Honda CRV 2018', file: 'vehicle-honda-crv.webp', screenshot: 'vehicle-honda.png' }]) {
    await page.getByTestId('dashboard-vehicle-option').filter({ hasText: car.label }).click();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const image = page.getByTestId('dashboard-vehicle-image');
    await expect(image).toHaveAttribute('src', `./${car.file}`);
    await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
    await expect(page.getByTestId('dashboard-vehicle-fallback')).toHaveCount(0);
    await waitForVisualAssets(page);
    await hideTransientStatusForScreenshot(page);
    await page.screenshot({ path: testInfo.outputPath(car.screenshot), fullPage: false });
  }

  await page.getByTestId('dashboard-vehicle-option').filter({ hasText: 'E2E Roadster' }).click();
  await expect(page.getByTestId('dashboard-vehicle-image')).toHaveCount(0);
  await expect(page.getByTestId('dashboard-vehicle-fallback')).toBeVisible();
});

test('adds a fuel record and renders the saved IndexedDB data', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await openFreshApp(page);
  await createVehicle(page);
  await page.getByTestId('nav-fuel').click();
  await page.getByTestId('add-fuel').click();

  await page.locator('#l_liters').fill('40');
  await page.locator('#l_price').fill('2');
  await expect(page.locator('#l_cost')).toHaveValue('80.00');
  await page.locator('#l_loc').fill('E2E Station');
  await page.getByTestId('save-fuel').click();

  const fuelCard = page.locator('[data-testid="log-card"][data-log-type="fuel"]');
  await expect(fuelCard).toHaveCount(1);
  await expect(fuelCard).toContainText('E2E Station');
  await page.reload();
  await page.getByTestId('nav-fuel').click();
  await expect(page.locator('[data-testid="log-card"][data-log-type="fuel"]')).toContainText('E2E Station');
  expect(pageErrors).toEqual([]);
});

test('trip odometer survives mode switching and saving', async ({ page }, testInfo) => {
  await openFreshApp(page);
  await createVehicle(page);
  await page.getByTestId('nav-fuel').click();
  await page.getByTestId('add-fuel').click();
  await page.locator('#l_odo_mode').click();
  await page.locator('#l_odo').fill('100');
  await page.locator('#l_odo_mode').click();
  await expect(page.locator('#l_odo')).toHaveValue('1100');
  await expect(page.locator('#l_odo_mode')).toHaveText('ODO');
  await page.locator('#l_odo_mode').click();
  await page.locator('#l_odo').fill('250');
  await page.locator('#l_liters').fill('40');
  await page.locator('#l_price').fill('2');
  await page.getByTestId('save-fuel').click();
  await expect(page.locator('[data-testid="log-card"][data-log-type="fuel"]')).toContainText('1250');
  await page.screenshot({ path: testInfo.outputPath('trip-odometer.png'), fullPage: false });
});

test('unit switch preserves physical mileage and filtered analytics charts', async ({ page }, testInfo) => {
  await openFreshApp(page);
  await createVehicle(page);
  await page.evaluate(async () => {
    const vehicleId = store.data.settings.activeVehicleId;
    await store.addLog({ id: 'year-2025', vehicleId, type: 'fuel', date: '2025-11-10', odometer: 1000, liters: 40, cost: 25, isPartial: false });
    await store.addLog({ id: 'year-2025-end', vehicleId, type: 'fuel', date: '2025-12-10', odometer: 1500, liters: 40, cost: 35, isPartial: false });
    await store.addLog({ id: 'year-2026', vehicleId, type: 'fuel', date: '2026-09-10', odometer: 2000, liters: 50, cost: 90, isPartial: false });
    ui.render();
  });
  await page.getByTestId('nav-analytics').click();
  await page.getByTestId('period-filter-analytics').getByTestId('period-value').selectOption('2025');
  await expect(page.getByText('$60.00').first()).toBeVisible();
  const chart = page.locator('svg:has(rect[data-series="fuel"])');
  await expect(chart.locator('rect[data-series="fuel"][data-month="11"]')).toHaveAttribute('data-value', '$25');
  await expect(chart.locator('rect[data-series="fuel"][data-month="12"]')).toHaveAttribute('data-value', '$35');
  await expect(page.locator('.h-32 svg')).toContainText('8.0');
  await waitForVisualAssets(page);
  await hideTransientStatusForScreenshot(page);
  await page.screenshot({ path: testInfo.outputPath('analytics-filtered.png'), fullPage: false });

  await page.getByTestId('nav-settings').click();
  await page.evaluate(() => ui.updateGlobalSetting('units', 'imperial'));
  await expect.poll(() => page.evaluate(() => store.getActiveVehicle().currentOdometer)).toBeCloseTo(1242.742, 2);
  await expect(page.getByText(/1242\.742 mi/).first()).toBeVisible();
  await page.reload();
  const persisted = await page.evaluate(() => ({ units: store.data.settings.units, odometer: store.getActiveVehicle().currentOdometer }));
  expect(persisted.units).toBe('imperial');
  expect(persisted.odometer).toBeCloseTo(1242.742, 2);
});

test('recognizes an invoice with a user key and saves one reviewed expense', async ({ page }) => {
  await page.route('https://api.openai.com/v1/models', async route => {
    expect(route.request().headers().authorization).toBe('Bearer test-user-key');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'gpt-4.1-mini' }, { id: 'gpt-4o-mini' }] }) });
  });
  await page.route('https://api.openai.com/v1/responses', async route => {
    const request = route.request();
    expect(request.headers().authorization).toBe('Bearer test-user-key');
    expect(request.postData()).toContain('input_image');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ output_text: JSON.stringify({
      documentType: 'invoice', date: '2026-09-13', supplier: 'Example Motors', invoiceNumber: 'INV-42', odometer: 1500,
      currency: 'A$', subtotal: 100, tax: 10, total: 110, confidence: 0.94, warnings: [],
      lineItems: [
        { description: 'Oil and filter service', amount: 80, category: 'oil', status: 'completed', selected: true },
        { description: 'Inspect brakes next visit', amount: 30, category: 'brake', status: 'recommended', selected: true },
      ],
    }) }) });
  });
  await openFreshApp(page);
  await createVehicle(page);
  await page.getByTestId('nav-settings').click();
  await page.getByTestId('ai-invoice-toggle').check();
  await expect(page.getByTestId('ai-provider').locator('option')).toHaveText(['OpenAI', 'Google AI Studio', 'Groq', 'DeepSeek', 'OpenRouter', 'NVIDIA', 'OpenAI-compatible API']);
  await page.getByTestId('ai-provider').selectOption('openrouter');
  await expect(page.getByText(/Connect to load OpenRouter models automatically|連接後會自動列出 OpenRouter 模型/)).toBeVisible();
  await page.getByTestId('ai-provider').selectOption('openai');
  await page.getByTestId('ai-api-key').fill('test-user-key');
  await page.getByTestId('test-ai-connection').click();
  await expect(page.getByText(/2 models loaded|已載入 2 個模型/)).toBeVisible();
  await expect(page.getByTestId('ai-model-select')).toBeVisible();
  await page.getByTestId('ai-model-select').selectOption('gpt-4o-mini');
  await page.getByTestId('save-ai-settings').click();
  await page.getByTestId('nav-maintenance').click();
  await page.getByTestId('add-service').click();
  await page.getByTestId('scan-invoice').click();
  await page.locator('#invoice_file').setInputFiles({ name: 'invoice.png', mimeType: 'image/png', buffer: Buffer.from('fake-image') });
  await expect(page.getByRole('heading', { name: /Review invoice|核對帳單/ })).toBeVisible();
  await expect(page.locator('#inv_selected_0')).toBeChecked();
  await expect(page.locator('#inv_selected_1')).not.toBeChecked();
  await page.getByTestId('save-invoice-record').click();
  await expect(page.getByTestId('modal-overlay')).toBeHidden();
  const invoiceLogs = await page.evaluate(() => store.data.logs.filter(log => log.invoiceMeta));
  expect(invoiceLogs).toHaveLength(1);
  expect(invoiceLogs[0].cost).toBe('110.00');
  expect(invoiceLogs[0].invoiceItems).toHaveLength(2);
  expect(invoiceLogs[0].notes).toContain('Oil and filter service');
  expect(invoiceLogs[0].notes).toContain('Inspect brakes next visit');
  expect(await page.evaluate(() => store.data.settings.aiModel)).toBe('gpt-4o-mini');
  expect(await page.evaluate(() => JSON.stringify(store.data.settings))).not.toContain('test-user-key');
});

test('invoice review leaves unreadable date, odometer, and total empty until confirmed', async ({ page }) => {
  await openFreshApp(page);
  await createVehicle(page);
  await page.evaluate(() => {
    ui._invoiceDraft = {
      date: null, odometer: null, total: null, subtotal: null, tax: null,
      supplier: 'Test Workshop', invoiceNumber: '', currency: 'A$', documentType: 'receipt',
      lineItems: [{ description: 'Tyre inspection', amount: null, category: 'tire', status: 'completed', selected: true }],
      confidence: 0.5, warnings: [], hash: 'test-null-invoice', fileName: 'test.png', provider: 'openai', model: 'mock',
    };
    ui.renderInvoiceReview();
  });
  await expect(page.locator('#inv_date')).toHaveValue('');
  await expect(page.locator('#inv_odometer')).toHaveValue('');
  await expect(page.locator('#inv_total')).toHaveValue('');
  await expect(page.locator('#inv_amount_0')).toHaveValue('');
  await page.locator('#inv_date').fill('2026-09-26');
  await page.locator('#inv_odometer').fill('1200');
  await page.locator('#inv_total').fill('30');
  await page.getByTestId('save-invoice-record').click();
  await expect(page.getByTestId('modal-overlay')).toBeHidden();
  const saved = await page.evaluate(() => store.data.logs.find(log => log.invoiceHash === 'test-null-invoice'));
  expect(saved).toMatchObject({ date: '2026-09-26', odometer: 1200, cost: '30' });
  expect(saved.invoiceItems[0].amount).toBeNull();
});

test('keeps an unset-tire reminder visible and supports snoozing it', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await openFreshApp(page);
  await createVehicle(page);
  const dashboardReminder = page.locator('[data-testid="dashboard-reminder"][data-reminder-id*="unset:front_left"]');
  await expect(dashboardReminder).toBeVisible();
  await dashboardReminder.getByRole('button', { name: /Snooze 7d|延後 7 天/ }).click();
  await expect(dashboardReminder).toBeHidden();

  await page.getByTestId('dashboard-reminders-see-all').click();
  await page.getByRole('button', { name: /Snoozed|已延後/ }).click();
  const snoozedReminder = page.locator('[data-testid="reminder-card"][data-reminder-id*="unset:front_left"]');
  await expect(snoozedReminder).toBeVisible();
  await expect(snoozedReminder).toContainText('Snoozed until');
  expect(pageErrors).toEqual([]);
});

test('filters reminder categories, opens details, and completes a selection in bulk', async ({ page }) => {
  await openFreshApp(page);
  await createVehicle(page);
  await page.getByTestId('dashboard-reminders-see-all').click();

  await expect(page.getByTestId('reminder-summary')).toBeVisible();
  await page.locator('[data-reminder-category="tire"]').click();
  const card = page.locator('[data-testid="reminder-card"]').first();
  await expect(card).toBeVisible();
  await card.getByRole('button').last().click();
  await expect(page.getByTestId('reminder-detail')).toBeVisible();
  await page.getByTestId('modal-overlay').getByRole('button').first().click();

  await page.getByTestId('reminder-select-mode').click();
  await page.locator('[data-testid="reminder-card"]').first().getByRole('button').first().click();
  await page.getByTestId('reminder-bulk-done').click();
  await page.getByTestId('reminder-tab-done').click();
  await expect(page.locator('[data-testid="reminder-card"]')).not.toHaveCount(0);
});

test('a tire reminder opens its source editor without being hidden by the closing sheet', async ({ page }, testInfo) => {
  await openFreshApp(page);
  await createVehicle(page);
  await page.getByTestId('nav-maintenance').click();
  await page.getByTestId('maintenance-view-tires').click();
  await page.getByRole('button', { name: 'Quick Setup', exact: true }).click();
  await page.locator('#qs_remaining_months').fill('12');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('modal-overlay')).toBeHidden();
  const expectedDate = await page.evaluate(() => {
    const log = store.data.logs.find(item => item.type === 'tire_replace');
    return utils.formatDate(FuelMateCore.addCalendarMonths(log.date, 12));
  });
  await page.getByTestId('nav-settings').click();
  await page.getByRole('button', { name: /View All|查看全部/ }).click();
  const sourceReminder = page.locator('[data-testid="reminder-card"][data-reminder-id*="asset:"]');
  await sourceReminder.getByRole('button').last().click();
  await expect(page.getByTestId('reminder-detail')).toContainText(expectedDate);
  await page.getByRole('button', { name: /View source record|查看來源記錄/ }).click();
  await expect(page.locator('#l_type')).toHaveValue('tire_replace');
  await page.waitForTimeout(400);
  await expect(page.locator('#l_type')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('reminder-source-editor.png'), fullPage: false });
});

test('reloads the cached app shell while the browser is offline', async ({ page, context }) => {
  await openFreshApp(page);
  await createVehicle(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#app')).not.toBeEmpty();
    await expect(page.getByText('E2E Roadster', { exact: false }).first()).toBeVisible();
    await expect(page.locator('#pwa-status-banner')).toContainText(/Offline mode|離線模式/);
    await expect(page.locator('#pwa-status-banner')).toHaveCSS('pointer-events', 'auto');
  } finally {
    await context.setOffline(false);
  }
});
