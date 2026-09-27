/* FuelMate Service Worker - app-shell cache for offline install */
const CACHE_NAME = 'fuelmate-cache-v36';

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
  urlFor('ios-themes.css'),
  urlFor('src/core/security.js'),
  urlFor('src/core/version.js'),
  urlFor('src/core/calculations.js'),
  urlFor('src/core/invoice-ai.js'),
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
  urlFor('src/ui/actions/invoice.js'),
  urlFor('src/ui/actions/records.js'),
  urlFor('src/ui/actions/data.js'),
  urlFor('src/ui/actions/dialogs.js'),
  urlFor('src/main.js'),
  urlFor('material-icons/material-icons.css'),
  urlFor('material-icons/material-icons.woff2'),
  urlFor('material-icons/material-icons.woff'),
  urlFor('vehicle-hatchback.webp'),
  urlFor('vehicle-honda-crv.webp'),
];

// Production build replaces this with hashes of the complete release assets.
const RELEASE_HASHES = {"app.css":"c0ff5af5433318d82faa5dc458a64dd35cde090b6150b917cefbca24d7ef8ce7","icon-192.png":"f5d028d6050e312f36852b26687fb3a55a0aa7af3b80f155df2de2e3f2cb34bb","icon-512.png":"55f75c41ad512bf974188c5c87daa34f27cb221ccdc8712270e63a6854d7ae8e","icon.svg":"c15b2d4c0a80572d89b4faba459c5f9512de9250f379fdec6aa8ab98cabc2ea3","index.html":"c1cfc8daf78f3de282274173d9fbba1a47a9824ebc10cfb8f0066f66606a6d09","ios-themes.css":"bd7729ab5b4cfc2a7de2df0af7db0d8dc64dbf774f2132817d67d3ad05dc1f84","manifest.webmanifest":"d4680d419a8b494faad1c168abf4540516ce28c1707d77889678afb00a8a506a","material-icons/material-icons.css":"2d9ef2d4a1c2592b8ed155bb03c5a1bd17f3bf23afe9b17d7cba5eefe1d93094","material-icons/material-icons.woff":"fd84f88b497040d4f7d5e8c9f8635aef8d3e706c0fa52e2b6facf14eee87e522","material-icons/material-icons.woff2":"8265f64786397d6b832d1ca0aafdf149ad84e72759fffa9f7272e91a0fb015d1","src/core/calculations.js":"68a2dca33f108fdaed7d41c837e62a637eeb7436d6ccc5c169e006b5d854e086","src/core/invoice-ai.js":"304ec94537010c3233d0572260040ad1ae04707c819c2627743b60c7c98b46c5","src/core/security.js":"e825d007b5321052d693f576eee90610fce9bdf258d46397acd2ce6d1e8db997","src/core/version.js":"b9b6d3b7dafa06a5cdb81c95ed5be0a454909139e6f19490e43c6fcb7d55b5ce","src/main.js":"9820a23d3cb52ff0394bde07c64c2932295e08a51608722c9a01c072c60e74d1","src/store.js":"52ef31ae48a4d4f827c103b6efde1356a30d5922ceb211c68668fab588a2e41e","src/translations.js":"aa6d92161c1378fe7e237914d32d0533de687bf20688b238b8180f54d567fd8a","src/ui/actions/data.js":"685ccf1a98eac0089038193504822926ba9e93bcd0b1dc4c550c9e3d7e47c26f","src/ui/actions/dialogs.js":"66a265cbab9599390ff4c98aab72be1a9465c7a6024f40c28dbcf74406f9034f","src/ui/actions/fuel.js":"2614265555a12208059f3f83a17d5d0f87ed5580c457e8cdfa8ecf3dd88a3f73","src/ui/actions/invoice.js":"0a3785603cdb5d2354dc1dcd21692a6a64246779bc94a2479adbe385d2a55564","src/ui/actions/maintenance.js":"d99c8f1ef7066863b1073ca8fd5b023d93eb3c0201caa2a333114fca66a0bb45","src/ui/actions/records.js":"d3bf609da677c8d9598836cc9870a24b67203bd38a793f14ceeb5801b2b8f965","src/ui/actions/vehicles.js":"943714b649789a02e274532fd995c4ac4d6029b6b91657d791f26064aa73e85c","src/ui/base.js":"185b13349cea5e6417d3c965fffe452ca2bc6da62768f95419dc2d10cea265fd","src/ui/events.js":"4d61d2e0b9c005ea958df16efb1b61a67af3e143294c0f58f6b5c0a51db8903e","src/ui/pages/dashboard.js":"92cc6b93b5e207d3ea7262cd1988c2d0cc553e454d8351591c6ac0932d11a718","src/ui/pages/records.js":"93122ba3a701d504348e26d992d9a059340a3f38b91444ed105014bde2429f55","src/ui/pages/reminders.js":"a1c467d03bee6af35b8e91ab98dbd1a315c61f38c89daa7aed5b4ac03f4c6484","src/ui/pages/settings.js":"99ff32f626af5a40a360015ed35f0d014761ccd0f3e3cccd75b007fa03b1fbf6","src/ui.js":"023f18e96eb20af7110d47e2a99641dca6471c1fb3871688200e44304e83f304","src/utils.js":"a80a0c084efbc5db58b0d871d8f9fb3320d69635a0e22820e9c6a034bd174aad","vehicle-hatchback.webp":"634ea5f49e1673295201a44e68784924f44c8beaea8412d9a274f889dc56b80b","vehicle-honda-crv.webp":"251a3173c2653e02ac20f6ab3b9a2acb142739497b1eca5f098ea8decb4710ef"};
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const paths = RELEASE_HASHES ? Object.keys(RELEASE_HASHES) : CORE_ASSETS;
    const entries = await Promise.all(paths.map(async path => {
      const url = RELEASE_HASHES ? urlFor(path) : path;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Incomplete release: ' + url);
      if (RELEASE_HASHES) {
        const bytes = await response.clone().arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        if (hash !== RELEASE_HASHES[path]) throw new Error('Release mismatch: ' + path);
      }
      return [url, response];
    }));
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(entries.map(([url, response]) => cache.put(url, response)));
    // Wait for all old tabs to close. Never take over an open form.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => /^fuelmate-cache-v\d+$/.test(k) && k !== CACHE_NAME).map(k => caches.delete(k)));
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = request.mode === 'navigate' ? urlFor('index.html') : request;
    // A missing asset must never be filled from a different release or with HTML.
    // The release cache is validated as a complete set. Font requests may carry
    // an Origin header that differs from the precache request's Vary header.
    return (await cache.match(key, { ignoreVary: true })) || Response.error();
  })());
});
