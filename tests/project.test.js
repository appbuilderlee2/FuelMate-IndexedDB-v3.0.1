import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const read = (path) => fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('production shell has no runtime CDN dependencies', async () => {
  const html = await read('index.html');
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com|fonts\.googleapis\.com/);
});

test('application is split into ordered source files', async () => {
  const html = await read('index.html');
  const files = ['security.js', 'version.js', 'calculations.js', 'translations.js', 'store.js', 'utils.js', 'ui.js', 'main.js'];
  let previous = -1;
  for (const file of files) {
    const index = html.indexOf(file);
    assert.ok(index > previous, `${file} should load after the previous module`);
    previous = index;
  }
});

test('static build copies every classic application script', async () => {
  const copyScript = await read('scripts/copy-static-js.mjs');
  const html = await read('index.html');
  const files = ['core/security.js', 'core/version.js', 'core/calculations.js', 'translations.js', 'store.js', 'utils.js', 'ui.js', 'main.js'];
  for (const file of files) {
    assert.match(copyScript, new RegExp(file.replace('.', '\\.')));
    assert.match(html, new RegExp(`src/${file.replace('.', '\\.')}`));
  }
});

test('Tailwind scans styles used by split JavaScript UI templates', async () => {
  const config = await read('tailwind.config.js');
  const generator = await read('scripts/generate-tailwind-safelist.mjs');
  const stylesheet = await read('styles/tailwind.css');
  assert.match(config, /\.\/src\/\*\*\/\*\.js/);
  assert.match(generator, /collectSourceFiles/);
  assert.match(generator, /entry\.name\.endsWith\('\.js'\)/);
  assert.match(stylesheet, /@import "tailwindcss"/);
  assert.match(stylesheet, /@source "\.\.\/src\/\*\*\/\*\.js"/);
});

test('service worker uses its GitHub Pages scope for index caching', async () => {
  const worker = await read('public/sw.js');
  assert.match(worker, /fetch\(urlFor\('index\.html'\)/);
  assert.doesNotMatch(worker, /fetch\('\/index\.html'/);
});

test('service worker precaches every runtime application script', async () => {
  const worker = await read('public/sw.js');
  const files = ['core/security.js', 'core/version.js', 'core/calculations.js', 'translations.js', 'store.js', 'utils.js', 'ui.js', 'main.js'];
  for (const file of files) assert.match(worker, new RegExp(`src/${file.replace('.', '\\.')}`));
});

test('Vite config does not expose a Gemini key to the browser', async () => {
  const config = await read('vite.config.ts');
  assert.doesNotMatch(config, /GEMINI_API_KEY|process\.env\.API_KEY/);
});

test('package, runtime, settings page, and README versions stay synchronized', async () => {
  const packageJson = JSON.parse(await read('package.json'));
  const versionSource = await read('src/core/version.js');
  const uiSource = await read('src/ui.js');
  const readme = await read('README.md');
  const versionMatch = versionSource.match(/current:\s*'([^']+)'/);
  assert.ok(versionMatch, 'runtime version should be declared');
  assert.equal(versionMatch[1], packageJson.version);
  assert.match(uiSource, /data-app-version/);
  assert.match(uiSource, /FuelMateVersion\.current/);
  assert.match(readme, new RegExp(`^# FuelMate IndexedDB v${packageJson.version.replaceAll('.', '\\.')}`, 'm'));
});
