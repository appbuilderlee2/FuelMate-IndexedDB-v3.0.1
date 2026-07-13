import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function createStore() {
  const context = vm.createContext({ console, setTimeout, clearTimeout });
  const source = await fs.readFile(new URL('../src/store.js', import.meta.url), 'utf8');
  vm.runInContext(`${source}\nglobalThis.__store = store;`, context);
  const store = context.__store;
  store.runTransaction = async () => {};
  store.data.settings.activeVehicleId = 'v1';
  store.data.vehicles = [{ id: 'v1', currentOdometer: 1500 }];
  store.data.logs = [
    { id: 'l1', vehicleId: 'v1', type: 'fuel', odometer: 1000 },
    { id: 'l2', vehicleId: 'v1', type: 'fuel', odometer: 1500 },
  ];
  return store;
}

test('correcting the highest log downward corrects a derived vehicle odometer', async () => {
  const store = await createStore();
  await store.updateLog({ id: 'l2', vehicleId: 'v1', type: 'fuel', odometer: 1300 });
  assert.equal(store.data.vehicles[0].currentOdometer, 1300);
});

test('deleting the highest log corrects a derived vehicle odometer', async () => {
  const store = await createStore();
  await store.deleteLog('l2');
  assert.equal(store.data.vehicles[0].currentOdometer, 1000);
});

test('log edits do not reduce a manually newer vehicle odometer', async () => {
  const store = await createStore();
  store.data.vehicles[0].currentOdometer = 2000;
  await store.deleteLog('l2');
  assert.equal(store.data.vehicles[0].currentOdometer, 2000);
});
