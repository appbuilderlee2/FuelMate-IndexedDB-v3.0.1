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

test('creates a vehicle and keeps the Settings version synchronized', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await openFreshApp(page);
  await createVehicle(page);
  await page.getByTestId('nav-settings').click();

  await expect(page.getByRole('heading', { name: /Settings|設定/ })).toBeVisible();
  await expect(page.getByTestId('app-version')).toContainText('v3.6.1');
  await page.getByTestId('currency-setting').selectOption('€');
  await expect(page.getByTestId('currency-setting')).toHaveValue('€');
  expect(pageErrors).toEqual([]);
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

test('keeps an unset-tire reminder visible and supports snoozing it', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await openFreshApp(page);
  await createVehicle(page);
  const dashboardReminder = page.locator('[data-testid="dashboard-reminder"][data-reminder-id*="unset:front_left"]');
  await expect(dashboardReminder).toBeVisible();
  await dashboardReminder.getByRole('button', { name: /Snooze 7d|延後 7 天/ }).click();
  await expect(dashboardReminder).toBeHidden();

  await page.getByRole('button', { name: /View All|查看全部/ }).first().click();
  await page.getByRole('button', { name: /Snoozed|已延後/ }).click();
  const snoozedReminder = page.locator('[data-testid="reminder-card"][data-reminder-id*="unset:front_left"]');
  await expect(snoozedReminder).toBeVisible();
  await expect(snoozedReminder).toContainText('Snoozed until');
  expect(pageErrors).toEqual([]);
});

test('filters reminder categories, opens details, and completes a selection in bulk', async ({ page }) => {
  await openFreshApp(page);
  await createVehicle(page);
  await page.getByRole('button', { name: /View All|查看全部/ }).first().click();

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
  await page.getByRole('button', { name: /Done|已完成/ }).click();
  await expect(page.locator('[data-testid="reminder-card"]')).not.toHaveCount(0);
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
  } finally {
    await context.setOffline(false);
  }
});
