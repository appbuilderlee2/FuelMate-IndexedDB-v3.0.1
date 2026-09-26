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

test('date-only records display and filter by calendar day west of UTC', async () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    const { utils, store } = await loadUtils();
    const logs = [{ id: 'one', vehicleId: 'v1', date: '2026-01-01' }, { id: 'two', vehicleId: 'v1', date: '2026-09-01' }];
    store.data.logs = logs;
    store._invalidateLogsCache();
    assert.equal(utils.formatDate(logs[0].date), '01/01/2026');
    assert.deepEqual(Array.from(utils.getAvailableYears()), [2026]);
    assert.deepEqual(Array.from(utils.filterLogs(logs, { mode: 'month', value: '2026-09' }), log => log.id), ['two']);
    assert.deepEqual(Array.from(utils.filterByDateRange(logs, '2026-09-01', '2026-09-01'), log => log.id), ['two']);
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test('same-day tire replay stays stable after IndexedDB reload reorders IDs', async () => {
  const { utils, store } = await loadUtils();
  const vehicle = { id: 'v1', currentOdometer: 1000 };
  const replacement = { id: 'z-replace', vehicleId: 'v1', type: 'tire_replace', date: '2026-09-01', odometer: 1000, tirePosition: 'front_left', tireId: 't1' };
  const rotation = { id: 'a-rotate', vehicleId: 'v1', type: 'tire_rotation', date: '2026-09-01', odometer: 1000, tireSwaps: [{ a: 'front_left', b: 'rear_left' }] };
  for (const logs of [[replacement, rotation], [rotation, replacement]]) {
    store.data.logs = logs;
    assert.equal(utils.getTireReplacementStatus(vehicle).find(status => status.tireId === 't1').pos, 'rear_left');
    assert.equal(utils.getTireTimeline(vehicle).find(tire => tire.tireId === 't1').currentPos, 'rear_left');
  }
  const laterReplacement = { ...replacement, createdAt: '2026-09-01T10:01:00Z' };
  const earlierRotation = { ...rotation, createdAt: '2026-09-01T10:00:00Z' };
  store.data.logs = [laterReplacement, earlierRotation];
  assert.equal(utils.getTireReplacementStatus(vehicle).find(status => status.tireId === 't1').pos, 'front_left');
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

test('monthly spend chart uses the selected period endpoint and only supplied logs', async () => {
  const { utils } = await loadUtils();
  const chart = utils.generateMonthlyBarChart([
    { type: 'fuel', date: '2025-11-01', cost: 25 },
  ], '2025-12');
  assert.match(chart, /data-value="\$25" data-month="11"/);
  assert.match(chart, /data-value="\$0" data-month="12"/);
  assert.doesNotMatch(chart, /data-month="01"/);
});

test('dashboard art matches a saved vehicle model and year, never another model', async () => {
  const { utils } = await loadUtils();
  assert.equal(utils.getVehicleHeroImage({ make: 'Mazda', model: '2', year: 2012 }), './vehicle-hatchback.webp');
  assert.equal(utils.getVehicleHeroImage({ make: 'Honda', model: 'CR-V', year: '2018' }), './vehicle-honda-crv.webp');
  assert.equal(utils.getVehicleHeroImage({ make: 'Honda', model: 'CRV', year: 2018 }), './vehicle-honda-crv.webp');
  assert.equal(utils.getVehicleHeroImage({ make: 'Honda', model: 'CR-V', year: 2025 }), null);
  assert.equal(utils.getVehicleHeroImage({ make: 'Toyota', model: 'RAV4', year: 2018 }), null);
});
