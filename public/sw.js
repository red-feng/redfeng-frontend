const CACHE_NAME = "redfeng-app-shell-v2"
const OFFLINE_URL = "/offline"
const ASSETS_TO_CACHE = [OFFLINE_URL, "/redfeng-favicon.png", "/icons/icon-192.png", "/icons/icon-512.png"]

function shouldBypassCache(requestUrl) {
  if (requestUrl.origin !== self.location.origin) return true

  if (requestUrl.pathname.startsWith("/api/")) return true
  if (requestUrl.pathname.startsWith("/merchant/chat")) return true
  if (requestUrl.pathname.startsWith("/chat")) return true
  if (requestUrl.pathname.startsWith("/_next/data/")) return true

  return false
}

function shouldCacheRequest(request) {
  const requestUrl = new URL(request.url)
  if (shouldBypassCache(requestUrl)) return false

  if (requestUrl.pathname.startsWith("/_next/static/")) return true
  if (requestUrl.pathname.startsWith("/icons/")) return true
  if (requestUrl.pathname === "/redfeng-favicon.png") return true
  if (requestUrl.pathname === OFFLINE_URL) return true

  return false
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) return

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedResponse = await caches.match(OFFLINE_URL)
        return cachedResponse || Response.error()
      }),
    )
    return
  }

  if (!shouldCacheRequest(event.request)) {
    event.respondWith(fetch(event.request))
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse
          }

          const responseClone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
          return networkResponse
        })
        .catch(() => caches.match("/redfeng-favicon.png"))
    }),
  )
})
