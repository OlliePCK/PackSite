/**
 * The Pack - Service Worker (v2)
 *
 * This site is built by Vite and uses hashed assets under /assets/.
 * The old SW (v1) precached legacy paths (/main.js, /nav.js, /styles.css, /the-pack/*)
 * and could serve stale HTML that referenced removed assets.
 *
 * Strategy:
 * - Navigations (HTML): network-first, fallback to cached /index.html
 * - Hashed assets (/assets/*): cache-first
 * - Never cache HTML responses as assets
 */

const CACHE_VERSION = 'v2';
const HTML_CACHE = `the-pack-html-${CACHE_VERSION}`;
const ASSET_CACHE = `the-pack-assets-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
    // Activate ASAP; we don't precache to avoid locking in old paths.
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((k) => ![HTML_CACHE, ASSET_CACHE].includes(k))
                    .map((k) => caches.delete(k))
            );
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    // Never intercept API or websockets
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;

    // HTML navigations: network-first
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            (async () => {
                try {
                    const fresh = await fetch(request);
                    if (fresh && fresh.ok) {
                        const cache = await caches.open(HTML_CACHE);
                        cache.put('/index.html', fresh.clone());
                    }
                    return fresh;
                } catch {
                    const cache = await caches.open(HTML_CACHE);
                    return (await cache.match('/index.html')) || Response.error();
                }
            })()
        );
        return;
    }

    // Hashed Vite assets: cache-first
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(ASSET_CACHE);
                const cached = await cache.match(request);
                if (cached) return cached;

                const resp = await fetch(request);
                // Avoid caching HTML fallbacks masquerading as assets
                const contentType = resp.headers.get('content-type') || '';
                if (resp.ok && !contentType.includes('text/html')) {
                    cache.put(request, resp.clone());
                }
                return resp;
            })()
        );
        return;
    }
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'New notification from The Pack',
        icon: '/img/pck-192.png',
        badge: '/img/pck-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'The Pack', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url === event.notification.data.url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise, open a new window
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
