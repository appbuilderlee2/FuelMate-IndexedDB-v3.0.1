/* FuelMate Service Worker - app-shell cache for offline install */
const CACHE_NAME = 'fuelmate-cache-v16';

function urlFor(path) {
  return new URL(path, self.registration.scope).toString();
}

const CORE_ASSETS = [
  urlFor('./'),
  urlFor('index.html'),
  urlFor('manifest.webmanifest'),
  urlFor('icon.svg'),
  urlFor('sw.js'),
  urlFor('app.css'),
  urlFor('src/core/security.js'),
  urlFor('src/core/version.js'),
  urlFor('src/core/calculations.js'),
  urlFor('src/translations.js'),
  urlFor('src/store.js'),
  urlFor('src/utils.js'),
  urlFor('src/ui.js'),
  urlFor('src/ui/events.js'),
  urlFor('src/ui/base.js'),
  urlFor('src/ui/pages/dashboard.js'),
  urlFor('src/ui/pages/reminders.js'),
  urlFor('src/ui/pages/records.js'),
  urlFor('src/ui/pages/settings.js'),
  urlFor('src/ui/actions/vehicles.js'),
  urlFor('src/ui/actions/fuel.js'),
  urlFor('src/ui/actions/maintenance.js'),
  urlFor('src/ui/actions/records.js'),
  urlFor('src/ui/actions/data.js'),
  urlFor('src/ui/actions/dialogs.js'),
  urlFor('src/main.js'),
  urlFor('material-icons/material-icons.css'),
  urlFor('material-icons/material-icons.woff2'),
  urlFor('material-icons/material-icons.woff'),
];

function extractSameOriginAssetPaths(htmlText) {
  const matches = htmlText.matchAll(/\b(?:href|src)\s*=\s*"(\/[^"#?]+)"/g);
  const paths = new Set();
  for (const m of matches) {
    const p = m[1];
    if (!p) continue;
    if (p.startsWith('//')) continue;
    if (p.startsWith('/@')) continue;
    paths.add(p);
  }
  return Array.from(paths);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);

      // Best-effort: cache same-origin assets referenced by the current HTML (works for hashed Vite assets too).
      try {
        const res = await fetch(urlFor('index.html'), { cache: 'no-store' });
        if (res.ok) {
          const html = await res.text();
          const assets = extractSameOriginAssetPaths(html);
          await cache.addAll(assets);
        }
      } catch {
        // ignore
      }

      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      await self.clients.claim();
    })(),
  );
});

async function responsesDiffer(cached, fresh) {
  if (!cached || !fresh) return false;
  const cachedEtag = cached.headers.get('etag');
  const freshEtag = fresh.headers.get('etag');
  if (cachedEtag && freshEtag) return cachedEtag !== freshEtag;
  const cachedModified = cached.headers.get('last-modified');
  const freshModified = fresh.headers.get('last-modified');
  if (cachedModified && freshModified) return cachedModified !== freshModified;
  const [cachedText, freshText] = await Promise.all([cached.clone().text(), fresh.clone().text()]);
  return cachedText !== freshText;
}

async function notifyShellUpdated() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  windows.forEach((client) => client.postMessage({ type: 'APP_SHELL_UPDATED' }));
}

async function refreshNavigationShell(request, cached) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (!response?.ok) return null;
    const changed = await responsesDiffer(cached, response);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(urlFor('index.html'), response.clone());
    if (changed) await notifyShellUpdated();
    return response;
  } catch {
    return null;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const indexUrl = urlFor('index.html');

  // Render the cached shell immediately; refresh it in the background when online.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cached = await caches.match(indexUrl);
        const refresh = refreshNavigationShell(request, cached);
        if (cached) {
          event.waitUntil(refresh.then(() => undefined));
          return cached;
        }
        return (await refresh) || Response.error();
      })(),
    );
    return;
  }

  // Cache-first for same-origin; runtime cache opaque CDN assets too.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        if (isSameOrigin) return (await caches.match(indexUrl)) || Response.error();
        return Response.error();
      }
    })(),
  );
});
