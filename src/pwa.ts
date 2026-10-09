// PWA assets served from the root scope so the service worker can control the whole app.

export const manifest = {
  name: 'AegisAI · Disaster Alerts India',
  short_name: 'AegisAI',
  description: 'Live disaster alerts, weather, earthquakes and nearby emergency help for every Indian state.',
  start_url: '/#/',
  scope: '/',
  display: 'standalone',
  background_color: '#f6f8fb',
  theme_color: '#0f172a',
  icons: [
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
  ],
}

export const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#2563eb"/><path d="M256 92 400 154v102c0 87-61 148-144 174-83-26-144-87-144-174V154z" fill="#fff"/><path d="M256 170v150M256 360v4" stroke="#2563eb" stroke-width="36" stroke-linecap="round"/></svg>`

// Bump VERSION when static files change so clients pick up the new shell.
const VERSION = 'aegis-v7'
export const serviceWorker = `
const VERSION = '${VERSION}'
const SHELL = ['/', '/static/style.css?v=7', '/static/i18n.js?v=1', '/static/core.js?v=6', '/static/notify.js?v=2', '/static/emergency.js?v=1', '/static/app.js?v=5', '/static/map.js?v=5', '/static/help.js?v=5', '/static/guide.js?v=5', '/static/plan.js?v=1', '/static/geo/india-states.json', '/icon.svg', '/manifest.webmanifest',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css']
const API_CACHE = VERSION + '-api'

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { mode: u.startsWith('http') ? 'no-cors' : 'same-origin' })).catch(() => {})))).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== API_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const CDN = /^(unpkg\\.com|cdn\\.jsdelivr\\.net|fonts\\.(googleapis|gstatic)\\.com)$/.test(url.hostname)
  if (url.origin !== location.origin && !CDN) return
  // Live data: network first, fall back to the last good copy when offline
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(API_CACHE).then(c => c.put(req, copy)) }
      return res
    }).catch(() => caches.match(req).then(r => r || new Response(JSON.stringify({ error: 'You are offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))))
    return
  }
  // Page navigations: network first, cached shell offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/')))
    return
  }
  // Static files: cache first, refresh in background
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)) } return res }).catch(() => hit)
    return hit || net
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const target = e.notification.data?.url || '/#/alerts'
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { c.navigate(target).catch(() => {}); return c.focus() }
    return self.clients.openWindow(target)
  }))
})
`
