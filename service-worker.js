// Service Worker for xPlayer PWA
const APP_SHELL_CACHE_NAME = 'xplayer-app-shell-v1';
const AUDIO_CACHE_NAME = 'mytehran-audio-v1';
const IMAGE_CACHE_NAME = 'xplayer-images-v1';
const MAX_AUDIO_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit for audio cache
const FETCH_TIMEOUT_MS = 3000; // وقتی اینترنت ضعیف/قطع است خیلی زود به کش برگردیم

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
  
  // App shell: کش‌اول؛ اگر نبود با timeout ۳ثانیه شبکه؛ بعد دوباره کش یا صفحه آفلاین
  if (isCodeFile && url.origin === self.location.origin) {
    const req = event.request;
    const cacheKey = url.pathname === '/' || url.pathname === '' ? new URL('index.html', url.origin + '/') : req;
    const offlinePage = new Response(
      '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>xPlayer</title></head><body style="font-family:sans-serif;padding:20px;text-align:center"><h1>آفلاین</h1><p>اتصال اینترنت را روشن کنید و یک‌بار با اینترنت برنامه را باز کنید.</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
    event.respondWith(
      caches.open(APP_SHELL_CACHE_NAME).then((cache) => {
        return cache.match(cacheKey).then((cached) => {
          if (cached) {
            fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); }).catch(() => {});
            return cached;
          }
          return Promise.race([
            fetch(req),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), FETCH_TIMEOUT_MS))
          ]).then((r) => {
            if (r.ok) cache.put(req, r.clone()).catch(() => {});
            return r;
          }).catch(() => cache.match(cacheKey).then((c2) => c2 || cache.match(new URL('index.html', url.origin + '/'))).then((c) => c || offlinePage));
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
            // Cache 200 (full file) or 206 (partial) so we have something for offline and stats
            if (response.status === 200) {
              const responseToCache = response.clone();
              cache.put(cacheKey, responseToCache).then(() => {
                cleanupAudioCache();
              }).catch(() => {});
            } else if (response.status === 206 && !response.bodyUsed) {
              // Cache 206 so entry exists (many servers never return 200 for audio)
              const responseToCache = response.clone();
              cache.put(cacheKey, responseToCache).then(() => {
                cleanupAudioCache();
              }).catch(() => {});
              // Optionally try to get full file in background to replace with 200
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
  }
  // عکس‌ها (کاور آهنگ‌ها): کش‌اول تا آفلاین هم لود بشوند
  const isImageRequest = /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(url.pathname) ||
    event.request.headers.get('Accept')?.includes('image/');
  if (isImageRequest) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok && response.type === 'basic') {
              try {
                cache.put(event.request, response.clone());
              } catch (_) {}
            }
            return response;
          }).catch(() => cache.match(event.request));
        });
      })
    );
    return;
  }
  // سایر درخواست‌ها
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
  );
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
      
      console.log(`[SW Cache Stats] Found ${result.count} cached entries`);
      
      for (const request of keys) {
        try {
          // Get a fresh response for each request
          const response = await cache.match(request);
          if (!response) {
            console.debug(`[SW Cache Stats] No response for: ${request.url}`);
            continue;
          }
          
          let entrySize = 0;
          let sizeFound = false;
          
          // Try content-length header first (doesn't consume body)
          const cl = response.headers.get('content-length');
          if (cl) {
            const size = parseInt(cl, 10);
            if (!isNaN(size) && size > 0) {
              entrySize = size;
              sizeFound = true;
              console.debug(`[SW Cache Stats] Entry ${request.url}: ${entrySize} bytes (from header)`);
            }
          }
          // For 206 Partial Content, get total size from Content-Range (e.g. "bytes 0-12345/123456")
          if (!sizeFound && response.status === 206) {
            const cr = response.headers.get('content-range');
            if (cr) {
              const match = cr.match(/bytes\s+\d+-\d+\/(\d+)/) || cr.match(/bytes\s+\*\/(\d+)/);
              if (match) {
                const total = parseInt(match[1], 10);
                if (!isNaN(total) && total > 0) {
                  entrySize = total;
                  sizeFound = true;
                  console.debug(`[SW Cache Stats] Entry ${request.url}: ${entrySize} bytes (from Content-Range)`);
                }
              }
            }
          }
          // If header didn't work, try to read the body
          if (!sizeFound) {
            try {
              // Clone the response before reading body to avoid consumption
              const clonedResponse = response.clone();
              
              // Try blob first
              if (!clonedResponse.bodyUsed) {
                try {
                  const blob = await clonedResponse.blob();
                  if (blob && blob.size > 0) {
                    entrySize = blob.size;
                    sizeFound = true;
                    console.debug(`[SW Cache Stats] Entry ${request.url}: ${entrySize} bytes (from blob)`);
                  }
                } catch (blobErr) {
                  console.debug(`[SW Cache Stats] Blob failed for ${request.url}:`, blobErr);
                }
              }
              
              // If blob failed, try arrayBuffer
              if (!sizeFound) {
                const freshResponse = await cache.match(request);
                if (freshResponse && !freshResponse.bodyUsed) {
                  try {
                    const arrayBuffer = await freshResponse.arrayBuffer();
                    if (arrayBuffer && arrayBuffer.byteLength > 0) {
                      entrySize = arrayBuffer.byteLength;
                      sizeFound = true;
                      console.debug(`[SW Cache Stats] Entry ${request.url}: ${entrySize} bytes (from arrayBuffer)`);
                    }
                  } catch (arrayBufferErr) {
                    console.debug(`[SW Cache Stats] ArrayBuffer failed for ${request.url}:`, arrayBufferErr);
                  }
                }
              }
            } catch (bodyErr) {
              console.debug(`[SW Cache Stats] Could not read body for ${request.url}:`, bodyErr);
            }
          }
          
          if (sizeFound && entrySize > 0) {
            result.size += entrySize;
          } else {
            console.warn(`[SW Cache Stats] Could not determine size for: ${request.url}`);
          }
        } catch (err) {
          // Opaque response or other error - skip this entry
          console.debug(`[SW Cache Stats] Error processing cache entry: ${request.url}`, err);
        }
      }
      
      console.log(`[SW Cache Stats] Total size calculated: ${result.size} bytes (${(result.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (e) {
      console.warn('[SW Cache Stats] Could not get cache stats:', e);
    }
    
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage(result);
    }
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

