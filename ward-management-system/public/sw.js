const CACHE_NAME = 'ward-management-v2';
const STATIC_CACHE = 'ward-management-static-v2';
const DYNAMIC_CACHE = 'ward-management-dynamic-v2';
const IMAGE_CACHE = 'ward-management-images-v2';

// Essential URLs to cache immediately
const urlsToCache = [
  '/',
  '/auth/signin',
  '/offline',
  '/manifest.json',
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching essential URLs');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== IMAGE_CACHE &&
              cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Helper function to check if request is for an image
const isImage = (request) => {
  return request.destination === 'image' || 
         request.url.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i);
};

// Helper function to check if request is for API
const isAPI = (request) => {
  return request.url.includes('/api/');
};

// Helper function to check if request is for static assets
const isStaticAsset = (request) => {
  return request.url.includes('/_next/static/') || 
         request.url.includes('/static/');
};

// Network-first strategy for API requests
const networkFirst = async (request) => {
  try {
    const response = await fetch(request);
    // Clone the response
    const responseToCache = response.clone();
    
    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, responseToCache);
    }
    
    return response;
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache, return offline page for navigation
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    
    throw error;
  }
};

// Cache-first strategy for static assets
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    const responseToCache = response.clone();
    
    if (response.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, responseToCache);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache-first failed:', error);
    throw error;
  }
};

// Cache-first strategy for images with longer cache time
const imageCacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    const responseToCache = response.clone();
    
    if (response.status === 200) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, responseToCache);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Image cache failed:', error);
    throw error;
  }
};

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isImage(request)) {
    // Cache-first for images
    event.respondWith(imageCacheFirst(request));
  } else if (isStaticAsset(request)) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(request));
  } else if (isAPI(request)) {
    // Network-first for API calls (always try fresh data)
    event.respondWith(
      fetch(request).catch((error) => {
        console.log('[SW] API request failed:', request.url, error);
        
        // Check if it's a network error (truly offline)
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          // Only return offline response for actual network failures
          return new Response(
            JSON.stringify({ error: 'Offline', offline: true }),
            { 
              headers: { 'Content-Type': 'application/json' },
              status: 503 
            }
          );
        }
        
        // For other errors (like 401, 403, 500, etc.), let them pass through
        // This allows the application to handle authentication and server errors properly
        throw error;
      })
    );
  } else {
    // Network-first for HTML pages
    event.respondWith(networkFirst(request));
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Ward Management System', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle background sync (for future offline form submissions)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  }
});

// Placeholder for syncing reports when back online
async function syncReports() {
  try {
    // This would sync any pending offline reports
    console.log('[SW] Syncing offline reports...');
    // Implementation would go here
  } catch (error) {
    console.error('[SW] Error syncing reports:', error);
  }
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});