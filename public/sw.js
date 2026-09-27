// Eu Levo service worker. Makes the app installable and quick to reopen, without ever serving stale data.
// - Pages (navigations) always come from the network, so a new deploy shows up at once.
//   Offline, the last copy of the app shell is shown and the app says to check the internet.
// - Hashed build files (/assets/…) never change, so they are cached on first use.
// - Anything from another site (Supabase, fonts, OpenStreetMap) and anything but GET is left alone.
const CACHE = 'eulevo-v1'
const SHELL = '/'
const MAX_ASSETS = 80 // each deploy adds new hashed files; keep the cache from growing forever

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function trim(cache) {
  const keys = await cache.keys()
  const extra = keys.length - MAX_ASSETS
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]) // oldest first
}

async function page(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    // Every route serves the same index.html, so one copy is enough.
    if (response.ok) cache.put(SHELL, response.clone())
    return response
  } catch {
    return (await cache.match(SHELL)) ?? Response.error()
  }
}

async function asset(request) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) {
    await cache.put(request, response.clone())
    trim(cache)
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (request.mode === 'navigate') event.respondWith(page(request))
  else if (url.pathname.startsWith('/assets/')) event.respondWith(asset(request))
})
