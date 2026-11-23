import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const read = path => fs.readFile(new URL('../' + path, import.meta.url), 'utf8');

for (const [protocol, available, expected] of [
  ['capacitor:', true, false],
  ['https:', true, true],
  ['https:', false, false],
]) {
  test(`service worker gate: ${protocol}, API ${available}`, async () => {
    const source = await read('src/main.js');
    const gate = source.match(/if \((location\.protocol[^\n]+)\) \{\n\s*window.addEventListener\('load', async/);
    assert.ok(gate);
    assert.equal(vm.runInNewContext(gate[1], {
      location: { protocol },
      navigator: available ? { serviceWorker: {} } : {},
    }), expected);
  });
}

test('native origin and build remain separate from GitHub Pages', async () => {
  const config = await read('capacitor.config.ts');
  assert.match(config, /iosScheme: 'capacitor', hostname: 'localhost'/);
  assert.doesNotMatch(config, /url:/);
  assert.match(await read('vite.config.ts'), /mode === 'ios' \? '\.\/' : '\/FuelMate-IndexedDB-v3\.0\.1\/'/);
  const pkg = JSON.parse(await read('package.json'));
  assert.match(pkg.scripts['build:ios'], /--mode ios.*seal-release.*cap sync ios/);
  assert.equal(pkg.scripts.build, 'vite build && node scripts/seal-release.mjs');
});
