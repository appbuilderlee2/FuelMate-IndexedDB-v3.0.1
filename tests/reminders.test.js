import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function createHarness() {
  const context = vm.createContext({ console, navigator: {}, setTimeout, clearTimeout, ui: {} });
  for (const file of [
    'src/core/security.js',
    'src/core/calculations.js',
    'src/translations.js',
    'src/store.js',
    'src/utils.js',
    'src/ui/pages/dashboard.js',
  ]) {
    vm.runInContext(await fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  vm.runInContext('globalThis.__store=store; globalThis.__utils=utils;', context);
  const vehicle = {
    id: 'v1', year: 2024, make: 'Test', model: 'Car', currentOdometer: 10000,
    tireReplaceDist: 40000, tireReplaceYears: 4, maintenanceDist: 'none', maintenanceTime: 'none',
  };
  context.__store.data.vehicles = [vehicle];
  context.__store.data.settings.activeVehicleId = 'v1';
  context.__store.data.settings.language = 'en';
  context.__store.data.settings.lastBackupDate = '2026-06-01T00:00:00.000Z';
  return { context, core: context.FuelMateCore, store: context.__store, utils: context.__utils, ui: context.ui, vehicle };
}

test('an unset tire remains visible when another tire is far from due', async () => {
  const { store, ui, vehicle } = await createHarness();
  store.data.logs = [{
    id: 'rep1', vehicleId: 'v1', type: 'tire_replace', date: '2026-01-01',
    odometer: 9000, tirePosition: 'front_left', tireId: 't1',
  }];
  const tireItems = ui.getReminderData(vehicle, { now: '2026-07-14T00:00:00.000Z' }).items
    .filter(item => item.id.startsWith('tire:'));
  assert.equal(tireItems.map(item => item.id).join(','), 'tire:v1:unset:front_right');
});

test('physical tire reminder id stays stable after a rotation', async () => {
  const { store, ui, vehicle } = await createHarness();
  vehicle.currentOdometer = 48800;
  store.data.logs = [{
    id: 'rep1', vehicleId: 'v1', type: 'tire_replace', date: '2026-01-01',
    odometer: 9000, tirePosition: 'front_left', tireId: 't1',
  }];
  const before = ui.getReminderData(vehicle, { now: '2026-07-14T00:00:00.000Z' }).items
    .find(item => item.id.includes(':asset:'));
  store.data.logs.push({
    id: 'rot1', vehicleId: 'v1', type: 'tire_rotation', date: '2026-07-01', odometer: 48000,
    tireSwaps: [{ a: 'front_left', b: 'rear_left' }],
  });
  const after = ui.getReminderData(vehicle, { now: '2026-07-14T00:00:00.000Z' }).items
    .find(item => item.id.includes(':asset:'));
  assert.equal(before.id, 'tire:v1:asset:rep1');
  assert.equal(after.id, before.id);
  assert.match(after.title, /Rear Left/);
});

test('rotation replay follows date before inconsistent odometer values', async () => {
  const { store, utils, vehicle } = await createHarness();
  store.data.logs = [
    { id: 'rep1', vehicleId: 'v1', type: 'tire_replace', date: '2026-01-01', odometer: 20000, tirePosition: 'front_left', tireId: 't1' },
    { id: 'rot1', vehicleId: 'v1', type: 'tire_rotation', date: '2026-01-02', odometer: 10000, tireSwaps: [{ a: 'front_left', b: 'rear_left' }] },
  ];
  const status = utils.getTireReplacementStatus(vehicle).find(item => item.editLogId === 'rep1');
  assert.equal(status.pos, 'rear_left');
});

test('FWD and RWD directional moves produce different tire positions', async () => {
  const { core, utils } = await createHarness();
  const initial = [['front_left', 'FL'], ['front_right', 'FR'], ['rear_left', 'RL'], ['rear_right', 'RR']];
  const fwd = new Map(initial);
  const rwd = new Map(initial);
  utils.applyTireRotation(fwd, { tireMoves: core.getRecommendedTireMoves('fwd') });
  utils.applyTireRotation(rwd, { tireMoves: core.getRecommendedTireMoves('rwd') });
  assert.deepEqual(Object.fromEntries(fwd), { front_left: 'RR', front_right: 'RL', rear_left: 'FL', rear_right: 'FR' });
  assert.deepEqual(Object.fromEntries(rwd), { front_left: 'RL', front_right: 'RR', rear_left: 'FR', rear_right: 'FL' });
});

test('backup done state expires when the next 30-day cycle starts', async () => {
  const { store, ui, vehicle } = await createHarness();
  store.data.logs = Array.from({ length: 6 }, (_, index) => ({
    id: `log${index}`, vehicleId: 'v1', type: 'service', date: '2026-01-01', odometer: index,
  }));
  store.data.settings.lastBackupDate = '2026-01-01T00:00:00.000Z';
  store._invalidateLogsCache();
  const first = ui.getReminderData(vehicle, { now: '2026-02-01T00:00:00.000Z' });
  const firstId = first.items.find(item => item.id.startsWith('backup:')).id;
  store.data.settings.reminderCenter.done[firstId] = true;
  assert.equal(ui.getReminderData(vehicle, { now: '2026-02-01T00:00:00.000Z' }).activeItems.some(item => item.id === firstId), false);
  const next = ui.getReminderData(vehicle, { now: '2026-03-02T00:00:00.000Z' });
  const nextId = next.items.find(item => item.id.startsWith('backup:')).id;
  assert.notEqual(nextId, firstId);
  assert.equal(next.activeItems.some(item => item.id === nextId), true);
});

test('invalid legacy snooze values do not hide reminders', async () => {
  const { store, ui, vehicle } = await createHarness();
  store.data.logs = [];
  store.data.settings.lastBackupDate = null;
  store.data.settings.reminderCenter.snoozedUntil['tire:v1:unset:front_left'] = 'not-a-date';
  const data = ui.getReminderData(vehicle, { now: '2026-07-14T00:00:00.000Z' });
  assert.equal(data.activeItems.some(item => item.id === 'tire:v1:unset:front_left'), true);
});

test('maintenance reminder needs a saved baseline when no service exists', async () => {
  const { ui, vehicle } = await createHarness();
  vehicle.maintenanceDist = '10000';
  vehicle.currentOdometer = 90000;
  let data = ui.getReminderData(vehicle, { includeAll: true, now: '2026-07-14T00:00:00.000Z' });
  assert.equal(data.items.some(item => item.id.startsWith('svc:')), false);
  vehicle.maintenanceBaselineOdometer = 90000;
  data = ui.getReminderData(vehicle, { includeAll: true, now: '2026-07-14T00:00:00.000Z' });
  assert.equal(data.items.some(item => item.id === 'svc:v1:dist:100000'), true);
});

test('reminders expose category and urgency for the upgraded center', async () => {
  const { ui, vehicle } = await createHarness();
  const data = ui.getReminderData(vehicle, { includeAll: true, now: '2026-07-14T00:00:00.000Z' });
  assert.ok(data.items.length > 0);
  assert.ok(data.items.every(item => ['tire', 'service', 'docs', 'backup'].includes(item.category)));
  assert.ok(data.items.every(item => ['overdue', 'due', 'upcoming'].includes(item.urgency)));
});

test('legacy position-based done state still completes the stable tire reminder', async () => {
  const { store, ui, vehicle } = await createHarness();
  vehicle.currentOdometer = 48800;
  store.data.logs = [{
    id: 'rep1', vehicleId: 'v1', type: 'tire_replace', date: '2026-01-01',
    odometer: 9000, tirePosition: 'front_left', tireId: 't1',
  }];
  store.data.settings.reminderCenter.done['tire:v1:front_left:rep1'] = true;
  const data = ui.getReminderData(vehicle, { includeAll: true, now: '2026-07-14T00:00:00.000Z' });
  assert.equal(data.doneItems.some(item => item.id === 'tire:v1:asset:rep1'), true);
  assert.equal(data.activeItems.some(item => item.id === 'tire:v1:asset:rep1'), false);
});
