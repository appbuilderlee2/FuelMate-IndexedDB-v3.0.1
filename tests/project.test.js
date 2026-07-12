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
  const files = ['calculations.js', 'translations.js', 'store.js', 'utils.js', 'ui.js', 'main.js'];
  let previous = -1;
  for (const file of files) {
    const index = html.indexOf(file);
    assert.ok(index > previous, `${file} should load after the previous module`);
    previous = index;
  }
});

test('service worker uses its GitHub Pages scope for index caching', async () => {
  const worker = await read('public/sw.js');
  assert.match(worker, /fetch\(urlFor\('index\.html'\)/);
  assert.doesNotMatch(worker, /fetch\('\/index\.html'/);
});

test('Vite config does not expose a Gemini key to the browser', async () => {
  const config = await read('vite.config.ts');
  assert.doesNotMatch(config, /GEMINI_API_KEY|process\.env\.API_KEY/);
});
