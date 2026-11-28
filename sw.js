/* FuelMate Service Worker - app-shell cache for offline install */
const CACHE_NAME = 'fuelmate-cache-v49';

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
  urlFor('src/core/native-notifications.js'),
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
  urlFor('src/ui/pages/notifications.js'),
  urlFor('src/ui/pages/records.js'),
  urlFor('src/ui/pages/settings.js'),
  urlFor('src/ui/actions/vehicles.js'),
  urlFor('src/ui/actions/fuel.js'),
  urlFor('src/ui/actions/maintenance.js'),
  urlFor('src/ui/actions/invoice.js'),
  urlFor('src/ui/actions/records.js'),
  urlFor('src/ui/actions/data.js'),
  urlFor('src/ui/actions/dialogs.js'),
  urlFor('src/ui/actions/driving.js'),
  urlFor('src/main.js'),
  urlFor('material-icons/material-icons.css'),
  urlFor('material-icons/material-icons.woff2'),
  urlFor('material-icons/material-icons.woff'),
  urlFor('vehicle-hatchback.webp'),
  urlFor('vehicle-honda-crv.webp'),
];

// Production build replaces this with hashes of the complete release assets.
const RELEASE_HASHES = {"app.css":"b6e92267015dc9fa321ca3985536daea2be6e5db0d95501283a01f14e761c9b8","icon-192.png":"f5d028d6050e312f36852b26687fb3a55a0aa7af3b80f155df2de2e3f2cb34bb","icon-512.png":"55f75c41ad512bf974188c5c87daa34f27cb221ccdc8712270e63a6854d7ae8e","icon.svg":"c15b2d4c0a80572d89b4faba459c5f9512de9250f379fdec6aa8ab98cabc2ea3","index.html":"81b2cf442ef33e79e33550666fb0877b755e480909508e8317586dc93ab5f116","ios-themes.css":"bd7729ab5b4cfc2a7de2df0af7db0d8dc64dbf774f2132817d67d3ad05dc1f84","manifest.webmanifest":"d4680d419a8b494faad1c168abf4540516ce28c1707d77889678afb00a8a506a","material-icons/material-icons.css":"2d9ef2d4a1c2592b8ed155bb03c5a1bd17f3bf23afe9b17d7cba5eefe1d93094","material-icons/material-icons.woff":"fd84f88b497040d4f7d5e8c9f8635aef8d3e706c0fa52e2b6facf14eee87e522","material-icons/material-icons.woff2":"8265f64786397d6b832d1ca0aafdf149ad84e72759fffa9f7272e91a0fb015d1","src/core/calculations.js":"a5cf2e32a2f67d2ffde1cb7897a75b98f62cd7c287cebb4b6675741c8c727d4e","src/core/invoice-ai.js":"304ec94537010c3233d0572260040ad1ae04707c819c2627743b60c7c98b46c5","src/core/native-notifications.js":"752a8a7d8b3e03471c2f355b5a497dd62b57ba164436370d3312ee18676fe632","src/core/security.js":"e825d007b5321052d693f576eee90610fce9bdf258d46397acd2ce6d1e8db997","src/core/version.js":"01ef1157bbf723cbeaa32abf22d9f4701d0b17228c5d17d5cdbdfda07c27f419","src/main.js":"2f487959ee7e9d374e2e695376faf9e0c4b8c1f096263665daa2d782090bb9e4","src/store.js":"f2fe78d58f969d46ed454b94b921ea4de3ad5801fcf5a7b619d460012d0aafc6","src/translations.js":"f5f47eb084eea095f7b474d89f8cf4df87f55484457b9ca3a81dad849d993f06","src/ui/actions/data.js":"1dc6976ce0824c71a73daadf0a7aa3ece8db7b7e3f70b208fc4caf7b4717c28f","src/ui/actions/dialogs.js":"66a265cbab9599390ff4c98aab72be1a9465c7a6024f40c28dbcf74406f9034f","src/ui/actions/driving.js":"46662be249c3ccb7359e48c0940c0900eafdc0d3fbea57614bb8a1b25a99c795","src/ui/actions/fuel.js":"476a3ed858f5a45d3aca64465c20d30e211bed4202d09d5b91e911d4c34df5d6","src/ui/actions/invoice.js":"0a3785603cdb5d2354dc1dcd21692a6a64246779bc94a2479adbe385d2a55564","src/ui/actions/maintenance.js":"63851a799fa8a21be76b3aee11c7e60c09f98b9803fda308bab4d514fa65bffc","src/ui/actions/records.js":"e244bfc81def2dcd338fc2d7803eda2c08685fb96f7f330b2f867dc149708c2e","src/ui/actions/vehicles.js":"c06d243f0ded1dee5392ca8481389b958b8331f457a8cff25cedf87eb9a9a614","src/ui/base.js":"e499d44ad2bf4421a954d1067a55d713c8b92e5092eb0680a40240973feb59bc","src/ui/events.js":"dc00144608a85e8dee545dc89b90fac03ee7926c760f39773086569127afb064","src/ui/pages/dashboard.js":"5acd8b2078e5c03de271b5b5cdd5a1d264601541a953d762060d52be6da0c4dd","src/ui/pages/notifications.js":"f4ba333cb6ff7d7807290918edaf2e7715137a815e47fed7e0b9407c224b2a43","src/ui/pages/records.js":"526e437731d74213e1fce916c7eae41d8cd82e297945632857b2f6e5338d0e8b","src/ui/pages/reminders.js":"e66567ce1852e6e51c6ea76855a1713b510c490d42ff4714d5d95b0bc7952eb6","src/ui/pages/settings.js":"a4b62c4bf7a9dc3c20cadcdfd49beee7f176fe1710489504a8e00ab372af7ee8","src/ui.js":"023f18e96eb20af7110d47e2a99641dca6471c1fb3871688200e44304e83f304","src/utils.js":"103cb7141dfd852af615d9d3a84bb9b13385070cdcb97238b8fd8e2367ab7b77","vehicle-hatchback.webp":"634ea5f49e1673295201a44e68784924f44c8beaea8412d9a274f889dc56b80b","vehicle-honda-crv.webp":"251a3173c2653e02ac20f6ab3b9a2acb142739497b1eca5f098ea8decb4710ef"};
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
