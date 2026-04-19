const STATIC_CACHE = 'checkout-static-v1';
const PRODUCT_CACHE = 'checkout-products-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== PRODUCT_CACHE)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

const isProductRequest = (request) => {
  return request.url.includes('fakestoreapi.com/products');
};

const productCacheStrategy = async (request) => {
  const cache = await caches.open(PRODUCT_CACHE);
  const cachedResponse = await cache.match(request);
  const networkPromise = fetch(request)
    .then((networkResponse) => {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    })
    .catch(() => null);

  if (cachedResponse) {
    networkPromise.catch(() => null);
    return cachedResponse;
  }

  const networkResponse = await networkPromise;

  if (networkResponse) {
    return networkResponse;
  }

  return new Response(JSON.stringify([]), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

const appShellStrategy = async (request) => {
  const cache = await caches.open(STATIC_CACHE);

  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return cache.match('/index.html');
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  if (isProductRequest(request)) {
    event.respondWith(productCacheStrategy(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(appShellStrategy(request));
  }
});
