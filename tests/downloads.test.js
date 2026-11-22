import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../src/utils.js', import.meta.url), 'utf8');
function load(extra) {
  return vm.runInNewContext(source + '\nutils;', { ...extra });
}

test('web export clicks a download and releases the object URL', async () => {
  const calls = [];
  const anchor = { click() { calls.push(this.download); }, remove() {} };
  const utils = load({
    document: { createElement: () => anchor, body: { append() {} } },
    URL: { createObjectURL: () => 'blob:export', revokeObjectURL: url => calls.push(url) },
    setTimeout: fn => fn(),
  });
  assert.equal(await utils.downloadBlob(new Blob(['test']), 'test.csv'), 'test.csv');
  assert.deepEqual(calls, ['test.csv', 'blob:export']);
});

for (const content of ['備份', '']) {
  test(`native export shares a cached file (${content || 'empty'})`, async () => {
    const calls = [];
    const utils = load({
      FileReader: class {
        readAsDataURL() { this.result = 'data:text/plain;base64,' + Buffer.from(content).toString('base64'); this.onload(); }
      },
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          Filesystem: { async writeFile(options) { calls.push(JSON.parse(JSON.stringify(options))); return { uri: 'file:///cache/test.json' }; } },
          Share: { async share(options) { calls.push(JSON.parse(JSON.stringify(options))); } },
        },
      },
    });
    await utils.downloadBlob(new Blob([content]), 'test.json');
    assert.deepEqual(calls, [
      { path: 'test.json', data: Buffer.from(content).toString('base64'), directory: 'CACHE' },
      { files: ['file:///cache/test.json'] },
    ]);
  });
}

test('native write errors propagate without opening the share sheet', async () => {
  const utils = load({
    FileReader: class { readAsDataURL() { this.result = 'data:;base64,'; this.onload(); } },
    Capacitor: {
      isNativePlatform: () => true,
      Plugins: {
        Filesystem: { async writeFile() { throw new Error('disk full'); } },
        Share: { share() { assert.fail('must not share after a failed write'); } },
      },
    },
  });
  await assert.rejects(utils.downloadBlob(new Blob(), 'test.json'), /disk full/);
});
