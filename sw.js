/* FuelMate Service Worker - app-shell cache for offline install */
const CACHE_NAME = 'fuelmate-cache-v24';

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
];

// Production build replaces this with hashes of the complete release assets.
const RELEASE_HASHES = {"app.css":"be8026357f648200a3f90db0977300ac95c35597d3394a2d68e97fa2defee5e4","icon-192.png":"f5d028d6050e312f36852b26687fb3a55a0aa7af3b80f155df2de2e3f2cb34bb","icon-512.png":"55f75c41ad512bf974188c5c87daa34f27cb221ccdc8712270e63a6854d7ae8e","icon.svg":"c15b2d4c0a80572d89b4faba459c5f9512de9250f379fdec6aa8ab98cabc2ea3","index.html":"f59c1c9997fd24a439682a8fa6dce14712215a7e41f2c06453d7108da5d1bb94","ios-themes.css":"bd7729ab5b4cfc2a7de2df0af7db0d8dc64dbf774f2132817d67d3ad05dc1f84","manifest.webmanifest":"d4680d419a8b494faad1c168abf4540516ce28c1707d77889678afb00a8a506a","material-icons/material-icons.css":"2d9ef2d4a1c2592b8ed155bb03c5a1bd17f3bf23afe9b17d7cba5eefe1d93094","material-icons/material-icons.woff":"fd84f88b497040d4f7d5e8c9f8635aef8d3e706c0fa52e2b6facf14eee87e522","material-icons/material-icons.woff2":"8265f64786397d6b832d1ca0aafdf149ad84e72759fffa9f7272e91a0fb015d1","src/core/calculations.js":"a24297ce205fd8d1011ce86f0a75971cc784ce7dd4e345c64d06b1bf1e77b449","src/core/invoice-ai.js":"ecb75894af0f303ccbed5daf3a43cec2a3f1f7012dbe3feb69fb0e5baec72ef0","src/core/security.js":"e825d007b5321052d693f576eee90610fce9bdf258d46397acd2ce6d1e8db997","src/core/version.js":"5da59533d4310216f5329ac9da42947e994488f1c90dda44bd7ac26482cbc786","src/main.js":"334dd874eeaabf60cda39d0020398989e31334d09ea87660b0c5781664a8eadf","src/store.js":"1b5876d2803aa2b475a91fcaa1f76ac2b6505df9310e07867d1d552305aaa8f3","src/translations.js":"fe15fa9cd08b586f52cb1f08045a1f48e0e9e0b738c8d7a3205c3f7186ded8f5","src/ui/actions/data.js":"709675f56665b6a6f6451486f6dd299576953451f7132e6c23e69dc71613bc7b","src/ui/actions/dialogs.js":"66a265cbab9599390ff4c98aab72be1a9465c7a6024f40c28dbcf74406f9034f","src/ui/actions/fuel.js":"2cda169f8b0ccce5d67c2e270fe0c0bd09c93e86bee374dd8a0e6f9c86bd4a1b","src/ui/actions/invoice.js":"1eac7279bdd0c41a906590d4a8c44d2b32e36001592b348411fc5d106b1bea07","src/ui/actions/maintenance.js":"d06697a056a3da6a67cb23f0198da4ea8d03bba08eb3df6b878248e8e892066b","src/ui/actions/records.js":"2ca65fb8829c5dbb2afea7a37b8b9dd2c5bbc4e8baebbf1cc3d7da8005d2e300","src/ui/actions/vehicles.js":"053997789ea11f369031e4d501dfaef9f1a5d6985b7a1ec81dc8eb7759b5b5c1","src/ui/base.js":"d5416339ff7adb02977d561eaa9cdf767c92ad9d20f14dbe68b0db334c370870","src/ui/events.js":"4d61d2e0b9c005ea958df16efb1b61a67af3e143294c0f58f6b5c0a51db8903e","src/ui/pages/dashboard.js":"949334677ada00eaeb5b1e7ddc7d9a1dc70a676cea31031519e7e1cda7fcd16a","src/ui/pages/records.js":"6b37fd309bba3a1c58a4cee9c8eae50fc2d6ef734e34a9c673ec8238996002cd","src/ui/pages/reminders.js":"a1c467d03bee6af35b8e91ab98dbd1a315c61f38c89daa7aed5b4ac03f4c6484","src/ui/pages/settings.js":"4d6c5ba63bd513e4d33f440766cb884893471ec9b0ad573429afdb28a79f6402","src/ui.js":"023f18e96eb20af7110d47e2a99641dca6471c1fb3871688200e44304e83f304","src/utils.js":"7200e6461f4b11162d0e98de96e99ae1cd605f1e9451ad39f9a68d2b05b797d5"};
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
    return (await cache.match(key)) || Response.error();
  })());
});
