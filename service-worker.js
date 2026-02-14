// Service Worker for xPlayer PWA
const APP_SHELL_CACHE_NAME = 'xplayer-app-shell-v1';
const AUDIO_CACHE_NAME = 'mytehran-audio-v1';
const MAX_AUDIO_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit for audio cache

// App shell files - pre-cached for offline use (when internet is completely off)
function getAppShellUrls() {
  const base = self.location.origin + (self.location.pathname.replace(/[^/]*$/, '') || '/');
  return [
    base,
    base + 'index.html',
    base + 'app.js',
    base + 'style.css',
    base + 'manifest.json',
    base + 'icon.svg'
  ];
}

// Install event - pre-cache app shell for offline use
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install - Pre-caching app shell for offline');
  event.waitUntil(
    caches.open(APP_SHELL_CACHE_NAME).then((cache) => {
      const urls = getAppShellUrls();
      return Promise.allSettled(
        urls.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => {
              if (res.ok) cache.put(url, res);
            })
            .catch(() => {})
        )
      );
    }).then(() => {
      // Delete old caches
      return caches.keys();
    }).then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('mytehran-music-')) {
            console.log('Deleting old code cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip service worker for CORS proxy requests - let browser handle them directly
  // These proxies don't support service worker interception and cause CORS errors
  const isCorsProxy = url.hostname.includes('allorigins.win') || 
                      url.hostname.includes('codetabs.com') ||
                      url.hostname.includes('corsproxy') ||
                      url.hostname.includes('corsproxy.io') ||
                      url.hostname.includes('cors-anywhere');
  
  if (isCorsProxy) {
    return; // Let browser handle CORS proxy requests normally
  }
  
  // Skip service worker for code files - let browser handle them directly
  const isCodeFile = url.pathname.match(/\.(html|css|js|json|svg)$/i) || 
                     url.pathname === '/' ||
                     (url.pathname.endsWith('/') && url.hostname === self.location.hostname);
  
  // App shell: network-first, fallback to pre-cached version for offline
  if (isCodeFile && url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(APP_SHELL_CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline: serve from pre-cached app shell
        return caches.open(APP_SHELL_CACHE_NAME).then((cache) => {
          return cache.match(event.request).then((cached) => {
            if (cached) return cached;
            // Fallback: for "/" or root, try index.html
            if (url.pathname === '/' || url.pathname === '') {
              const indexUrl = new URL('index.html', url.origin + '/');
              return cache.match(indexUrl);
            }
            return null;
          });
        }).then((cached) => {
          if (cached) return cached;
          // No cache - show minimal offline message (shouldn't happen if install succeeded)
          return new Response(
            '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>xPlayer</title></head><body style="font-family:sans-serif;padding:20px;text-align:center"><h1>آفلاین</h1><p>لطفاً اتصال اینترنت را روشن کنید و یک‌بار برنامه را با اینترنت باز کنید تا برای استفاده آفلاین آماده شود.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });
      })
    );
    return;
  }
  
  if (isCodeFile) {
    return;
  }
  
  // Check if it's an audio file
  const isAudioFile = url.pathname.match(/\.(mp3|m4a|ogg|wav)$/i) || 
                      url.hostname.includes('dl.mytehranmusic.com') ||
                      url.hostname.includes('mytehranmusic.com') && url.pathname.includes('.mp3');
  
  if (isAudioFile) {
    // Audio elements use Range requests -> server returns 206. Cache API rejects 206.
    // We cache the FULL file (request without Range) to get 200.
    const cacheKey = new Request(event.request.url, { method: 'GET' });
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then((cache) => {
        return cache.match(cacheKey).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((response) => {
            // Cache only 200 (full file). 206 = Range request, cannot cache.
            if (response.status === 200) {
              const responseToCache = response.clone();
              cache.put(cacheKey, responseToCache).then(() => {
                cleanupAudioCache();
              }).catch(() => {});
            } else if (response.status === 206 && !response.bodyUsed) {
              // Range request: fetch full file in background for cache
              fetch(cacheKey).then((fullRes) => {
                if (fullRes.status === 200) {
                  cache.put(cacheKey, fullRes).then(() => {
                    cleanupAudioCache();
                  }).catch(() => {});
                }
              }).catch(() => {});
            }
            return response;
          }).catch(() => {
            return cache.match(cacheKey).then((cached) => {
              if (cached) return cached;
              return new Response('Audio not available offline', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
          });
        });
      })
    );
  } else {
    // For other files (images, etc.), use network first
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store'
      }).catch(() => {
        // Try cache as fallback for non-code files
        return caches.match(event.request);
      })
    );
  }
});

// Clean up audio cache if it gets too large
async function cleanupAudioCache() {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const keys = await cache.keys();
  
  // Estimate cache size (rough calculation)
  let totalSize = 0;
  const entries = [];
  
  for (const key of keys) {
    try {
      const response = await cache.match(key);
      if (response) {
        const cl = response.headers.get('content-length');
        const size = cl ? (parseInt(cl, 10) || 0) : (await response.blob()).size;
        totalSize += size;
        entries.push({ key, size, timestamp: Date.now() });
      }
    } catch (e) {
      entries.push({ key, size: 0, timestamp: Date.now() });
    }
  }
  
  // If cache is too large, remove oldest entries
  if (totalSize > MAX_AUDIO_CACHE_SIZE) {
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest entries until we're under the limit
    for (const entry of entries) {
      if (totalSize <= MAX_AUDIO_CACHE_SIZE * 0.8) break; // Keep it at 80% of max
      await cache.delete(entry.key);
      totalSize -= entry.size;
    }
    
    console.log('Audio cache cleaned up. New size:', totalSize);
  }
}

// Message handler - get cache stats for settings page
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'getCacheStats') {
    const result = { count: 0, size: 0 };
    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const keys = await cache.keys();
      result.count = keys.length;
      for (const request of keys) {
        try {
          const response = await cache.match(request);
          if (response) {
            const cl = response.headers.get('content-length');
            if (cl) {
              result.size += parseInt(cl, 10) || 0;
            } else {
              const blob = await response.blob();
              result.size += blob.size;
            }
          }
        } catch (err) {
          // Opaque response - skip size for this entry
        }
      }
    } catch (e) {
      console.warn('SW: Could not get cache stats:', e);
    }
    event.ports[0].postMessage(result);
  }
});

// Activate event - clean up old code caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all old code caches (keep only audio cache)
          if (cacheName.startsWith('mytehran-music-')) {
            console.log('Deleting old code cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients to ensure they use the new service worker
      return self.clients.claim();
    })
  );
});

