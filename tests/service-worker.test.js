import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

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
      open: async () => ({ addAll: async () => {}, put: async () => {} }),
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
  assert.equal(background.length, 1);
});
