import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('backup reminder is completed only after the user confirms the file was saved', async () => {
  let confirmed = false;
  let writes = 0;
  let downloads = 0;
  const anchor = { click() { downloads += 1; }, remove() {} };
  const context = vm.createContext({
    ui: { render() {} },
    store: {
      data: { vehicles: [], logs: [], settings: { lastBackupDate: null } },
      async saveData() { writes += 1; },
    },
    utils: { t: key => key },
    FuelMateCore: { localDateKey: () => '2026-09-26' },
    Blob, JSON, Date, setTimeout: () => {},
    URL: { createObjectURL: () => 'blob:backup', revokeObjectURL() {} },
    document: { createElement: () => anchor, body: { append() {} } },
    confirm: () => confirmed,
  });
  vm.runInContext(await fs.readFile(new URL('../src/ui/actions/data.js', import.meta.url), 'utf8'), context);
  await context.ui.exportData();
  assert.equal(downloads, 1);
  assert.equal(context.store.data.settings.lastBackupDate, null);
  assert.equal(writes, 0);

  confirmed = true;
  await context.ui.exportData();
  assert.equal(downloads, 2);
  assert.ok(context.store.data.settings.lastBackupDate);
  assert.equal(writes, 1);
});
