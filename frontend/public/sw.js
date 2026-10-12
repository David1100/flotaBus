/* flotaBus worker: deliberately small and conservative around session data. */
const CACHE_VERSION = 'flotabus-public-v1';
const PUBLIC_CACHE = CACHE_VERSION;
const PUBLIC_NAVIGATION = new Set(['/', '/login']);
const SAFE_ASSET = /^\/(?:_astro\/|icons\/|manifest\.webmanifest$)/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PUBLIC_CACHE).then((cache) => cache.addAll([
      '/manifest.webmanifest',
      '/icons/icon-192.svg',
      '/icons/icon-512.svg'
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== PUBLIC_CACHE && key.startsWith('flotabus-public-'))
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

function isPublicNavigation(request, url) {
  return request.method === 'GET' && request.mode === 'navigate' &&
    url.origin === self.location.origin && PUBLIC_NAVIGATION.has(url.pathname);
}

function isSafeAsset(request, url) {
  return request.method === 'GET' && url.origin === self.location.origin &&
    SAFE_ASSET.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No API, auth, admin, cross-origin, or mutating request ever reaches a cache.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth') ||
      url.pathname.startsWith('/admin') || !['GET', 'HEAD'].includes(request.method)) return;

  if (isPublicNavigation(request, url)) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          void caches.open(PUBLIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  if (isSafeAsset(request, url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          void caches.open(PUBLIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      const url = new URL(client.url);
      if (url.pathname === target || url.pathname.startsWith(target)) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
