// ─────────────────────────────────────────────────────────────
//  Hear – Service Worker  (Cache-first shell + network-first API)
// ─────────────────────────────────────────────────────────────

const SHELL_CACHE  = 'hear-shell-v3';   // bump on every deploy
const IMAGE_CACHE  = 'hear-images-v1';  // album art etc.
const FONT_CACHE   = 'hear-fonts-v1';   // Google Fonts

// The app shell: everything needed to render the UI offline
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
];

// ── INSTALL — pre-cache the app shell ────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

// ── ACTIVATE — purge old caches ──────────────────────────────
self.addEventListener('activate', (e) => {
  const KEEP = [SHELL_CACHE, IMAGE_CACHE, FONT_CACHE];
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH — routing strategy ──────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // 1. JioSaavn API / CDN — always network, never cache (dynamic audio)
  if (
    url.hostname.includes('jiosaavn') ||
    url.hostname.includes('saavncdn') ||
    url.hostname.includes('akamaized') ||
    url.pathname.startsWith('/api')
  ) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // 2. Google Fonts — cache-first with long TTL
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    e.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // 3. Album art / external images — cache-first, fallback gracefully
  if (request.destination === 'image') {
    e.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // 4. App shell (JS, CSS, HTML, icons) — cache-first, revalidate in bg
  e.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});

// ─────────────────────────────────────────────────────────────
//  Strategy helpers
// ─────────────────────────────────────────────────────────────

/** Cache-first: serve from cache, fetch & store if missing */
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

/** Stale-while-revalidate: serve cache instantly, refresh in bg */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached); // network failed — stick with cache

  // Return cached immediately if available, otherwise wait for network
  return cached || fetchPromise;
}
