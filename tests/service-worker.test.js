import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('activation preserves other apps caches', async () => {
  const listeners = new Map();
  const removed = [];
  const source = await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  const current = source.match(/const CACHE_NAME = '([^']+)'/)[1];
  vm.runInNewContext(source, {
    URL,
    caches: { keys: async () => ['trail-pocket-v1', 'fuelmate-cache-v20', current], delete: async key => removed.push(key) },
    self: { registration: { scope: 'https://example.test/FuelMate/' }, clients: { claim: async () => {} }, addEventListener: (name, handler) => listeners.set(name, handler) },
  });
  let pending;
  listeners.get('activate')({ waitUntil(promise) { pending = promise; } });
  await pending;
  assert.deepEqual(removed, ['fuelmate-cache-v20']);
});

test('offline navigation returns the cached shell without waiting for the network', async () => {
  const listeners = new Map();
  const cachedResponse = new Response('<main>cached FuelMate</main>', {
    headers: { 'content-type': 'text/html' },
  });
  const context = vm.createContext({
    console,
    URL,
    Response,
    Promise,
    fetch: () => new Promise(() => {}),
    caches: {
      match: async () => cachedResponse.clone(),
      open: async () => ({ match: async () => cachedResponse.clone(), put: async () => {} }),
      keys: async () => [],
      delete: async () => true,
    },
    self: {
      registration: { scope: 'https://example.test/FuelMate/' },
      location: { origin: 'https://example.test' },
      clients: { claim: async () => {}, matchAll: async () => [] },
      skipWaiting: async () => {},
      addEventListener(type, handler) { listeners.set(type, handler); },
    },
  });
  const source = await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  vm.runInContext(source, context);

  let responsePromise;
  const background = [];
  listeners.get('fetch')({
    request: { method: 'GET', mode: 'navigate', url: 'https://example.test/FuelMate/' },
    respondWith(promise) { responsePromise = promise; },
    waitUntil(promise) { background.push(promise); },
  });

  const result = await Promise.race([
    responsePromise.then(response => response.text()),
    new Promise(resolve => setTimeout(() => resolve('timed-out'), 100)),
  ]);
  assert.equal(result, '<main>cached FuelMate</main>');
  assert.equal(background.length, 0);
});

test('mismatched production release is rejected before cache writes', async () => {
  const { webcrypto } = await import('node:crypto');
  const listeners = new Map();
  let writes = 0;
  const source = (await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8')).replace('const RELEASE_HASHES = null;', 'const RELEASE_HASHES = {"index.html":"wrong-hash"};');
  vm.runInNewContext(source, {
    URL, Response, crypto: webcrypto, Uint8Array,
    fetch: async () => new Response('new shell'),
    caches: { open: async () => ({ put() { writes++; } }) },
    self: { registration: { scope: 'https://example.test/FuelMate/' }, addEventListener: (name, handler) => listeners.set(name, handler) },
  });
  let pending;
  listeners.get('install')({ waitUntil(promise) { pending = promise; } });
  await assert.rejects(pending, /Release mismatch/);
  assert.equal(writes, 0);
});
