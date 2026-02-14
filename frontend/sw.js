/**
 * Service Worker — stale-while-revalidate for static assets, network-first for API.
 *
 * Strategy:
 *   - Static assets: Serve from cache immediately, then update cache in background.
 *     This gives instant loads while ensuring fresh content on next visit.
 *   - API calls: Network first with cache fallback for offline support.
 *   - Navigation: Network first, offline fallback page if network unavailable.
 */

const CACHE_NAME = 'profiteer-v6';

// Core assets to precache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  // CSS
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/pages/dashboard.css',
  './css/pages/analyzer.css',
  './css/pages/trends.css',
  './css/pages/shipments.css',
  './css/pages/arbitrage.css',
  './css/pages/inventory.css',
  './css/pages/deals.css',
  './css/pages/hype.css',
  './css/pages/notifications.css',
  './css/pages/settings.css',
  // Core JS
  './js/app.js',
  './js/router.js',
  './js/lib/chart.min.js',
  // Components
  './js/components/toast.js',
  './js/components/skeleton.js',
  './js/components/modal.js',
  './js/components/chart.js',
  './js/components/card.js',
  './js/components/table.js',
  './js/components/badge.js',
  './js/components/notificationPanel.js',
  // API
  './js/api/client.js',
  './js/api/dashboard.js',
  './js/api/analyzer.js',
  './js/api/arbitrage.js',
  './js/api/inventory.js',
  './js/api/trends.js',
  './js/api/hype.js',
  './js/api/tracking.js',
  './js/api/deals.js',
  './js/api/notifications.js',
  // Pages
  './js/pages/dashboard.js',
  './js/pages/analyzer.js',
  './js/pages/trends.js',
  './js/pages/shipments.js',
  './js/pages/arbitrage.js',
  './js/pages/inventory.js',
  './js/pages/deals.js',
  './js/pages/hype.js',
  './js/pages/notifications.js',
  './js/pages/settings.js',
  // Utils & storage
  './js/utils/constants.js',
  './js/utils/format.js',
  './js/utils/dom.js',
  './js/storage/cache.js',
  './js/storage/models.js',
];

// ── Install ────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  // API calls — network first, cache fallback for offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(event.request));
    return;
  }

  // Navigation requests — network first, offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstWithOffline(event.request));
    return;
  }

  // Static assets — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

/**
 * Stale-while-revalidate: Return cached version immediately,
 * then fetch from network and update the cache in background.
 * This ensures instant loads while keeping content fresh.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Fetch fresh copy in background
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  // Return cached if available, otherwise wait for network
  return cachedResponse || fetchPromise || new Response('Offline', { status: 503 });
}

/**
 * Network first with cache fallback — for API requests.
 * Always try network; on failure, return cached response if available.
 */
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Network first for navigation — show offline page if network fails.
 */
async function networkFirstWithOffline(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline fallback page
    return caches.match('./offline.html') || new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// ── Push Notifications ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Profiteer.io', body: 'New notification', url: '#/notifications' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || data.message,
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/icon-192.png',
    data: { url: data.url || data.link || '#/notifications' },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click ─────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '#/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing window if one is open
      for (const client of windowClients) {
        if (client.url.includes('index.html') && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'navigate', url: targetUrl });
          return;
        }
      }
      // Open new window
      return clients.openWindow(`./index.html${targetUrl}`);
    })
  );
});

// ── Background Sync ────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  // Future: Process queued offline actions (inventory adds, deal submissions, etc.)
  // For now, just notify clients that sync happened
  const allClients = await clients.matchAll();
  allClients.forEach(client => {
    client.postMessage({ type: 'sync-complete' });
  });
}
