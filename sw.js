/* FuelMate Service Worker - app-shell cache for offline install */
const CACHE_NAME = 'fuelmate-cache-v29';

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
];

// Production build replaces this with hashes of the complete release assets.
const RELEASE_HASHES = {"app.css":"04f4d3f89cc07554f7fd83b24e8575dd9641d61e8f01161e41fb707f7cee61cf","icon-192.png":"f5d028d6050e312f36852b26687fb3a55a0aa7af3b80f155df2de2e3f2cb34bb","icon-512.png":"55f75c41ad512bf974188c5c87daa34f27cb221ccdc8712270e63a6854d7ae8e","icon.svg":"c15b2d4c0a80572d89b4faba459c5f9512de9250f379fdec6aa8ab98cabc2ea3","index.html":"2d881ed7a3bb9ca906ffd16ba68434de5af2f2bb2f16271c66019a38dad3c7d5","ios-themes.css":"bd7729ab5b4cfc2a7de2df0af7db0d8dc64dbf774f2132817d67d3ad05dc1f84","manifest.webmanifest":"d4680d419a8b494faad1c168abf4540516ce28c1707d77889678afb00a8a506a","material-icons/material-icons.css":"2d9ef2d4a1c2592b8ed155bb03c5a1bd17f3bf23afe9b17d7cba5eefe1d93094","material-icons/material-icons.woff":"fd84f88b497040d4f7d5e8c9f8635aef8d3e706c0fa52e2b6facf14eee87e522","material-icons/material-icons.woff2":"8265f64786397d6b832d1ca0aafdf149ad84e72759fffa9f7272e91a0fb015d1","src/core/calculations.js":"953ab782e2450b1ac6be97de589deea43d5ee69afd370d2fa5073d7a8ab1b88e","src/core/invoice-ai.js":"eee57fde6c901a147f6e97e1527a2c8b6a089cc97cf759d19072dbdcf6371e64","src/core/security.js":"e825d007b5321052d693f576eee90610fce9bdf258d46397acd2ce6d1e8db997","src/core/version.js":"852ff0bc113cb80cd0286153696b33f9c4f569a8418d94753d34aa7ccbd94723","src/main.js":"9820a23d3cb52ff0394bde07c64c2932295e08a51608722c9a01c072c60e74d1","src/store.js":"dff252ac9e5c87e17b8f5e28f37fd2901d107402e3098a82f7745fd40932abdf","src/translations.js":"de105b86a447359b75e013cc6867ebbc16cc0ac08ec409af6a8aac1b09851831","src/ui/actions/data.js":"709675f56665b6a6f6451486f6dd299576953451f7132e6c23e69dc71613bc7b","src/ui/actions/dialogs.js":"66a265cbab9599390ff4c98aab72be1a9465c7a6024f40c28dbcf74406f9034f","src/ui/actions/fuel.js":"2cda169f8b0ccce5d67c2e270fe0c0bd09c93e86bee374dd8a0e6f9c86bd4a1b","src/ui/actions/invoice.js":"01c65467a75965994cc0076a70de563c02e5c9bf6ec289b219c25aac7f2a6842","src/ui/actions/maintenance.js":"9b3ee13480ab4ed14d75377e29e822a7aa29fe9527774c73dfcc788c368fdc41","src/ui/actions/records.js":"2ca65fb8829c5dbb2afea7a37b8b9dd2c5bbc4e8baebbf1cc3d7da8005d2e300","src/ui/actions/vehicles.js":"053997789ea11f369031e4d501dfaef9f1a5d6985b7a1ec81dc8eb7759b5b5c1","src/ui/base.js":"626c3627c5c0ac335451bbd9e7791ab572c58689b7ac0d2d1a4b9892e39b9929","src/ui/events.js":"4d61d2e0b9c005ea958df16efb1b61a67af3e143294c0f58f6b5c0a51db8903e","src/ui/pages/dashboard.js":"62996b3351a062d9d6b595590fd0e80cc88712cc9b4c8648a3f292867fb9b014","src/ui/pages/records.js":"6b37fd309bba3a1c58a4cee9c8eae50fc2d6ef734e34a9c673ec8238996002cd","src/ui/pages/reminders.js":"a1c467d03bee6af35b8e91ab98dbd1a315c61f38c89daa7aed5b4ac03f4c6484","src/ui/pages/settings.js":"5a01dadcc8bc3d8047971bbe85e24f5edf46487fc4440e55615b32476078e425","src/ui.js":"023f18e96eb20af7110d47e2a99641dca6471c1fb3871688200e44304e83f304","src/utils.js":"e5192a04506ae9ea26f04b19bfe8fe6430884f3f0d36b04796d569b94a2898db","vehicle-hatchback.webp":"75020db86efc7a92823bb89b24fa1bd7b92186e123f0ebe14c2a9daf54f530d8"};
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
