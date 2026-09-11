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
  store.db = { transaction() {
    const tx = { objectStore: () => ({ put() {}, delete() {} }), abort() {} };
    queueMicrotask(() => tx.oncomplete?.());
    return tx;
  } };
  store.data.settings.activeVehicleId = 'v1';
  store.data.vehicles = [{ id: 'v1', currentOdometer: 1500 }];
  store.data.logs = [
    { id: 'l1', vehicleId: 'v1', type: 'fuel', odometer: 1000 },
    { id: 'l2', vehicleId: 'v1', type: 'fuel', odometer: 1500 },
  ];
  return store;
}

function installImportDb(store, { fail = false } = {}) {
  let transactions = 0;
  store.db = {
    transaction(names, mode) {
      transactions += 1;
      assert.deepEqual(Array.from(names), ['vehicles', 'logs', 'settings']);
      assert.equal(mode, 'readwrite');
      const tx = {
        error: fail ? new Error('simulated import failure') : null,
        objectStore() {
          return { clear() {}, put() {} };
        },
      };
      queueMicrotask(() => {
        if (fail) tx.onabort?.();
        else tx.oncomplete?.();
      });
      return tx;
    },
  };
  return () => transactions;
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

test('overwrite import commits vehicles, logs, and settings in one transaction', async () => {
  const store = await createStore();
  const transactionCount = installImportDb(store);
  await store.importData({
    vehicles: [{ id: 'v2', currentOdometer: 200 }],
    logs: [{ id: 'n1', vehicleId: 'v2', type: 'fuel', odometer: 200 }],
    settings: { activeVehicleId: 'v2', currency: 'AUD ' },
  }, { overwrite: true });
  assert.equal(transactionCount(), 1);
  assert.equal(store.data.vehicles[0].id, 'v2');
  assert.equal(store.data.logs[0].id, 'n1');
  assert.equal(store.data.settings.activeVehicleId, 'v2');
  assert.equal(store._bulkImporting, false);
});

test('failed import leaves in-memory data unchanged and resets bulk state', async () => {
  const store = await createStore();
  const before = JSON.stringify(store.data);
  installImportDb(store, { fail: true });
  await assert.rejects(() => store.importData({
    vehicles: [{ id: 'v2' }],
    logs: [],
    settings: { activeVehicleId: 'v2' },
  }, { overwrite: true }), /simulated import failure/);
  assert.equal(JSON.stringify(store.data), before);
  assert.equal(store._bulkImporting, false);
});

test('failed atomic log write preserves logs, vehicle odometer and cache', async () => {
  for (const action of ['add', 'update', 'delete']) {
    const store = await createStore();
    const before = JSON.stringify(store.data);
    const version = store._logsVersion;
    store.db.transaction = (names) => {
      assert.deepEqual(Array.from(names), ['logs', 'vehicles']);
      const tx = { error: new Error('write failed'), objectStore: () => ({ put() {}, delete() {} }) };
      queueMicrotask(() => tx.onabort());
      return tx;
    };
    await assert.rejects(() => action === 'delete' ? store.deleteLog('l2') : store[action + 'Log']({ id: action === 'add' ? 'l3' : 'l2', vehicleId: 'v1', odometer: 1700 }), /write failed/);
    assert.equal(JSON.stringify(store.data), before);
    assert.equal(store._logsVersion, version);
  }
});

test('database initialization rejects load failures instead of hanging', async () => {
  let request;
  let closed = false;
  const context = vm.createContext({ console, indexedDB: { open() { request = {}; return request; } } });
  vm.runInContext(await fs.readFile(new URL('../src/store.js', import.meta.url), 'utf8') + '\nglobalThis.s = store;', context);
  context.s.migrateFromLocalStorage = async () => {};
  context.s.loadAllData = async () => { throw new Error('load failed'); };
  const pending = context.s.init();
  await request.onsuccess({ target: { result: { close() { closed = true; } } } });
  await assert.rejects(pending, /load failed/);
  assert.equal(closed, true);
});
