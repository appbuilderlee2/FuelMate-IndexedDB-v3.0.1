import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('vehicle selection renders and resets scroll without waiting for IndexedDB', async () => {
  const calls = [];
  let finish;
  const context = {
    ui: { closeModal() { calls.push('close'); }, render() { calls.push('render'); } },
    store: {
      data: { vehicles: [{ id: 'next' }], settings: {} },
      saveData: () => new Promise(resolve => { finish = resolve; }),
    },
    window: { scrollTo: (x, y) => calls.push([x, y]) },
  };
  vm.runInNewContext(await fs.readFile(new URL('../src/ui/actions/vehicles.js', import.meta.url), 'utf8'), context);
  await context.ui.selectVehicle('missing');
  assert.deepEqual(calls, []);
  const pending = context.ui.selectVehicle('next');
  assert.equal(context.store.data.settings.activeVehicleId, 'next');
  assert.deepEqual(calls, ['close', 'render', [0, 0]]);
  finish();
  await pending;
});
