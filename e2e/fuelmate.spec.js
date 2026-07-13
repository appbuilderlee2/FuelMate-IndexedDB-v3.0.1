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
  await expect(page.getByTestId('app-version')).toContainText('v3.3.0');
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
  await page.locator('#l_cost').fill('80');
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
