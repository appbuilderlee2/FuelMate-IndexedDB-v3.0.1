import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadUtils() {
  const context = vm.createContext({ console, navigator: {}, setTimeout, clearTimeout });
  for (const file of [
    'src/core/security.js',
    'src/core/calculations.js',
    'src/translations.js',
    'src/store.js',
  ]) {
    vm.runInContext(await fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  const source = await fs.readFile(new URL('../src/utils.js', import.meta.url), 'utf8');
  vm.runInContext(`${source}\nglobalThis.__utils = utils; globalThis.__store = store;`, context);
  context.__store.data.settings.activeVehicleId = 'v1';
  context.__store.data.settings.units = 'metric';
  context.__store.data.vehicles = [{ id: 'v1', fuelUnit: 'L' }];
  return { utils: context.__utils, store: context.__store };
}

test('one odometer point does not imply distance travelled', async () => {
  const { utils } = await loadUtils();
  const stats = utils.calculateStats([
    { type: 'fuel', odometer: 50000, liters: 40, cost: 80 },
  ], 'fuel');
  assert.equal(stats.totalDist, 0);
  assert.equal(stats.costKm, '--');
  assert.equal(stats.totalDistCount, 1);
});

test('trend chart includes partial fuel and renders finite coordinates', async () => {
  const { utils } = await loadUtils();
  const chart = utils.generateTrendChart([
    { type: 'fuel', date: '2026-01-01', odometer: 1000, liters: 40, isPartial: false },
    { type: 'fuel', date: '2026-01-10', odometer: 1200, liters: 10, isPartial: true },
    { type: 'fuel', date: '2026-01-20', odometer: 1500, liters: 30, isPartial: false },
  ]);
  assert.match(chart, />8\.0<\/text>/);
  assert.doesNotMatch(chart, /NaN|Infinity/);
});
