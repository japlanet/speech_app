/*
 * Sound Studio service worker.
 *
 * - The build lists every file of the app here. They are all saved on the first visit, and from
 *   then on the app is always opened from the saved copy: it makes no requests of its own.
 * - A new version is only picked up when the browser itself notices that this file has changed.
 *   It is downloaded in full, then waits until the app next starts (or until a parent taps
 *   "Check for update"), so it never swaps the app out while a child is playing.
 * - All of the japlanet games share one website and so one set of caches: only ever touch our own.
 * - Word lists, recordings, pictures and progress are in IndexedDB and are never touched here.
 */
const PREFIX = "sound-studio-";
const CACHE = PREFIX + "__VERSION__";
const FILES = ["__FILES__"];
const SCOPE = self.registration.scope;

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES.map(f => new Request(new URL(f, SCOPE), { cache: "reload" })))),
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", event => {
  if (event.data === "use-new-version") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(SCOPE)) return;
  const want = request.mode === "navigate" ? SCOPE : request;
  event.respondWith(
    caches.open(CACHE).then(async cache => (await cache.match(want, { ignoreSearch: true, ignoreVary: true })) || fetch(request)),
  );
});
