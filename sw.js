/* FuelMate Service Worker - app-shell cache for offline install */
const CACHE_NAME = 'fuelmate-cache-v23';

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

// Production build replaces this with hashes of the complete release assets.
const RELEASE_HASHES = {"app.css":"647bd368430c07b313b52824f2db0ee0501f2c3852ed644984a055ae2e9b66bd","icon-192.png":"f5d028d6050e312f36852b26687fb3a55a0aa7af3b80f155df2de2e3f2cb34bb","icon-512.png":"55f75c41ad512bf974188c5c87daa34f27cb221ccdc8712270e63a6854d7ae8e","icon.svg":"c15b2d4c0a80572d89b4faba459c5f9512de9250f379fdec6aa8ab98cabc2ea3","index.html":"a880f922999c089d95be778ec7035628c301314abe62f2486e62431cf84a7bf3","ios-themes.css":"4889c3abf009e91149c68f4c173f7f61bdd6b7ade423fdc64fe025b55cf49864","manifest.webmanifest":"d4680d419a8b494faad1c168abf4540516ce28c1707d77889678afb00a8a506a","material-icons/material-icons.css":"2d9ef2d4a1c2592b8ed155bb03c5a1bd17f3bf23afe9b17d7cba5eefe1d93094","material-icons/material-icons.woff":"fd84f88b497040d4f7d5e8c9f8635aef8d3e706c0fa52e2b6facf14eee87e522","material-icons/material-icons.woff2":"8265f64786397d6b832d1ca0aafdf149ad84e72759fffa9f7272e91a0fb015d1","src/core/calculations.js":"b5701e8fc7dc4b5b9caa29200da186104d4388df2c9f030edd52c036961cd70c","src/core/security.js":"e825d007b5321052d693f576eee90610fce9bdf258d46397acd2ce6d1e8db997","src/core/version.js":"d7f08ed74df4e57240257be441d2990c110d9f0d1efbc1669123e50eaf321d7f","src/main.js":"334dd874eeaabf60cda39d0020398989e31334d09ea87660b0c5781664a8eadf","src/store.js":"f7a51e46091a0159a8cd4406dab76ef7648e7ddb31d43d3be92f6d012ebfd9ee","src/translations.js":"fe15fa9cd08b586f52cb1f08045a1f48e0e9e0b738c8d7a3205c3f7186ded8f5","src/ui/actions/data.js":"709675f56665b6a6f6451486f6dd299576953451f7132e6c23e69dc71613bc7b","src/ui/actions/dialogs.js":"66a265cbab9599390ff4c98aab72be1a9465c7a6024f40c28dbcf74406f9034f","src/ui/actions/fuel.js":"2cda169f8b0ccce5d67c2e270fe0c0bd09c93e86bee374dd8a0e6f9c86bd4a1b","src/ui/actions/maintenance.js":"0b29c6e0e741cc04dd62b0b298db73518efcb9b609f259cf2b815434bff4f7f8","src/ui/actions/records.js":"2ca65fb8829c5dbb2afea7a37b8b9dd2c5bbc4e8baebbf1cc3d7da8005d2e300","src/ui/actions/vehicles.js":"053997789ea11f369031e4d501dfaef9f1a5d6985b7a1ec81dc8eb7759b5b5c1","src/ui/base.js":"d5416339ff7adb02977d561eaa9cdf767c92ad9d20f14dbe68b0db334c370870","src/ui/events.js":"4d61d2e0b9c005ea958df16efb1b61a67af3e143294c0f58f6b5c0a51db8903e","src/ui/pages/dashboard.js":"949334677ada00eaeb5b1e7ddc7d9a1dc70a676cea31031519e7e1cda7fcd16a","src/ui/pages/records.js":"8b49212fa2f130dba552e4f58703602bcf4b92afc76c8499ace410eed17d2061","src/ui/pages/reminders.js":"a1c467d03bee6af35b8e91ab98dbd1a315c61f38c89daa7aed5b4ac03f4c6484","src/ui/pages/settings.js":"119eaae77f4a596ccdccc14975c2195d7dd399dd7c5b393fbba52459a4462005","src/ui.js":"023f18e96eb20af7110d47e2a99641dca6471c1fb3871688200e44304e83f304","src/utils.js":"7200e6461f4b11162d0e98de96e99ae1cd605f1e9451ad39f9a68d2b05b797d5"};
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
