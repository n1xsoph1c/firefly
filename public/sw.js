const CACHE_NAME = 'cloud-storage-v6'; // Incremented for bug fixes
const STATIC_CACHE = 'cloud-storage-static-v6';
const DYNAMIC_CACHE = 'cloud-storage-dynamic-v6';
const STREAMING_CACHE = 'cloud-storage-streaming-v1';

// CRITICAL FIX: Only cache truly static assets, NEVER cache HTML pages
// HTML pages reference NextJS chunks that change with each build
const STATIC_FILES = [
  '/manifest.json',
  '/logo.png',
  '/logo-192.png',
  '/logo-512.png',
  '/apple-touch-icon.png',
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v6 (HTML cache removed, NextJS bypass enabled)...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Service Worker: Caching static assets only (no HTML)');
      return cache.addAll(STATIC_FILES);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches and enable immediate control
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v6...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== STREAMING_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Enable immediate control of all clients (important for iOS)
      return self.clients.claim();
    })
  );
});

// Fetch event - advanced caching strategies for PWA
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external URLs and chrome-extension
  if (url.origin !== location.origin || url.protocol === 'chrome-extension:') return;

  // CRITICAL FIX: NEVER cache NextJS internal files - they change with each build
  if (url.pathname.startsWith('/_next/')) {
    console.log('Service Worker: Bypassing NextJS internal file (network only):', url.pathname);
    return; // Let browser handle directly - no caching
  }

  // CRITICAL: Skip ALL streaming, download, and media endpoints completely
  // Let these go directly to the network for optimal performance
  if (url.pathname.includes('/stream') ||
    url.pathname.includes('/download') ||
    url.pathname.includes('/preview') ||
    url.pathname.includes('/api/stream') ||
    url.pathname.includes('/api/files/download') ||
    url.pathname.includes('/api/files/upload') ||
    url.pathname.includes('/chunk') ||
    url.pathname.startsWith('/share/') ||  // Any share link path
    url.pathname.includes('/share/') ||    // Share links with tokens
    url.pathname.startsWith('/api/shared/') || // Shared folder API routes
    url.pathname.startsWith('/internal/') || // Nginx internal paths
    request.headers.get('range') || // Range requests for video streaming
    url.searchParams.has('stream') ||
    url.searchParams.has('download') ||
    url.searchParams.has('preview')) {
    console.log('Service Worker: Bypassing streaming/download request:', url.pathname);
    return; // Let browser handle directly
  }

  // Skip large file requests based on Accept header
  const accept = request.headers.get('accept') || '';
  if (accept.includes('video/') ||
    accept.includes('audio/') ||
    accept.includes('application/octet-stream')) {
    console.log('Service Worker: Bypassing media request by Accept header:', accept);
    return;
  }

  // Skip requests with X-Accel headers (Nginx direct serving)
  if (request.headers.get('x-accel-redirect') ||
    request.headers.get('x-accel-buffering')) {
    console.log('Service Worker: Bypassing X-Accel request');
    return;
  }

  // API requests - network first with cache fallback (except upload/streaming APIs)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(async (cache) => {
        try {
          // Try network first
          const response = await fetch(request);

          // Cache successful responses (except uploads and large responses)
          if (response.ok &&
            !url.pathname.includes('/upload') &&
            !url.pathname.includes('/chunk') &&
            !url.pathname.includes('/stream') &&
            response.headers.get('content-length') &&
            parseInt(response.headers.get('content-length')) < 10 * 1024 * 1024) { // Only cache responses < 10MB
            cache.put(request, response.clone());
          }

          return response;
        } catch (error) {
          // Network failed, try cache
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return offline response for API failures
          return new Response(
            JSON.stringify({
              error: 'Offline - please check your connection',
              offline: true
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })
    );
    return;
  }

  // CRITICAL FIX: Navigation requests (HTML pages) - NETWORK ONLY, NO CACHING
  // Server-rendered pages reference build-specific chunks that must always be fresh
  if (request.mode === 'navigate' || request.destination === 'document') {
    console.log('Service Worker: HTML navigation request - network only (no cache):', url.pathname);
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Only if network completely fails, show offline page from cache
          return caches.match('/manifest.json').then(() => {
            return new Response(
              '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
        })
    );
    return;
  }

  // Static assets (images, manifest) - cache first with background update (stale-while-revalidate)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Update cache in background (stale-while-revalidate)
        fetch(request).then(response => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(request, response);
            });
          }
        }).catch(() => { });

        return cachedResponse;
      }

      return caches.open(STATIC_CACHE).then((cache) => {
        return fetch(request).then((response) => {
          // Cache successful responses for static assets
          if (response.ok && !url.pathname.startsWith('/_next/')) {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => {
          return new Response('Offline', { status: 503 });
        });
      });
    })
  );
});

// Background sync for file uploads and data sync
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);

  if (event.tag === 'upload-files') {
    event.waitUntil(uploadPendingFiles());
  } else if (event.tag === 'sync-data') {
    event.waitUntil(syncPendingData());
  }
});

// Handle file uploads in background when connection restored
async function uploadPendingFiles() {
  try {
    console.log('Service Worker: Syncing pending uploads...');
    const pendingUploads = await getPendingUploads();

    for (const upload of pendingUploads) {
      try {
        const formData = new FormData();
        formData.append('file', upload.file);
        formData.append('folderId', upload.folderId || '');

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': upload.authToken ? `Bearer ${upload.authToken}` : ''
          }
        });

        if (response.ok) {
          await removePendingUpload(upload.id);

          // Notify all clients of successful upload
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'UPLOAD_SYNCED',
              filename: upload.filename,
              success: true
            });
          });

          console.log('Service Worker: Successfully synced upload:', upload.filename);
        } else {
          console.error('Service Worker: Upload failed:', response.status, upload.filename);
        }
      } catch (error) {
        console.error('Service Worker: Background upload failed:', error);

        // Notify client of failed upload
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'UPLOAD_FAILED',
            filename: upload.filename,
            error: error.message
          });
        });
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Sync other pending data changes
async function syncPendingData() {
  try {
    console.log('Service Worker: Syncing pending data changes...');
    const pendingData = await getPendingDataChanges();

    for (const change of pendingData) {
      try {
        const response = await fetch(change.endpoint, {
          method: change.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': change.authToken ? `Bearer ${change.authToken}` : ''
          },
          body: JSON.stringify(change.data)
        });

        if (response.ok) {
          await removePendingDataChange(change.id);

          // Notify clients of successful sync
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'DATA_SYNCED',
              changeType: change.type,
              success: true
            });
          });
        }
      } catch (error) {
        console.error('Service Worker: Data sync failed:', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Data sync failed:', error);
  }
}

// Enhanced IndexedDB helpers for offline data management
function getPendingUploads() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CloudStorageDB', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['uploads'], 'readonly');
      const store = transaction.objectStore('uploads');
      const getAll = store.getAll();

      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => reject(getAll.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create uploads store
      if (!db.objectStoreNames.contains('uploads')) {
        const uploadsStore = db.createObjectStore('uploads', { keyPath: 'id', autoIncrement: true });
        uploadsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create data changes store
      if (!db.objectStoreNames.contains('dataChanges')) {
        const dataStore = db.createObjectStore('dataChanges', { keyPath: 'id', autoIncrement: true });
        dataStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create shared files store
      if (!db.objectStoreNames.contains('sharedFiles')) {
        const sharedStore = db.createObjectStore('sharedFiles', { keyPath: 'id', autoIncrement: true });
        sharedStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

function getPendingDataChanges() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CloudStorageDB', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['dataChanges'], 'readonly');
      const store = transaction.objectStore('dataChanges');
      const getAll = store.getAll();

      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => reject(getAll.error);
    };
  });
}

function removePendingUpload(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CloudStorageDB', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['uploads'], 'readwrite');
      const store = transaction.objectStore('uploads');
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

function removePendingDataChange(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CloudStorageDB', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['dataChanges'], 'readwrite');
      const store = transaction.objectStore('dataChanges');
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Enhanced message handling for PWA features
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SHARE_TARGET':
        // Handle shared files from other apps
        const { files } = event.data;
        event.waitUntil(
          storeSharedFiles(files).then(() => {
            // Notify all clients about shared files
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'SHARED_FILES_RECEIVED',
                  count: files.length
                });
              });
            });
          })
        );
        break;

      case 'QUEUE_UPLOAD':
        // Queue file for background upload
        event.waitUntil(queueFileForUpload(event.data.upload));
        break;

      case 'SYNC_REQUEST':
        // Manual sync request
        event.waitUntil(
          Promise.all([
            uploadPendingFiles(),
            syncPendingData()
          ])
        );
        break;

      case 'CLEAR_CACHE':
        // Clear specific cache
        event.waitUntil(
          caches.delete(event.data.cacheName || DYNAMIC_CACHE)
        );
        break;

      default:
        console.log('Service Worker: Unknown message type:', event.data.type);
    }
  }
});

// Store shared files for processing when app opens
async function storeSharedFiles(files) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CloudStorageDB', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['sharedFiles'], 'readwrite');
      const store = transaction.objectStore('sharedFiles');

      const sharedData = {
        files: files,
        timestamp: Date.now(),
        processed: false
      };

      const addRequest = store.add(sharedData);
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(addRequest.error);
    };
  });
}

// Queue file for background upload
async function queueFileForUpload(uploadData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CloudStorageDB', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['uploads'], 'readwrite');
      const store = transaction.objectStore('uploads');

      const upload = {
        ...uploadData,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending'
      };

      const addRequest = store.add(upload);
      addRequest.onsuccess = () => {
        resolve();

        // Try to register background sync
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
          navigator.serviceWorker.ready.then(registration => {
            return registration.sync.register('upload-files');
          }).catch(err => {
            console.log('Background sync registration failed:', err);
          });
        }
      };
      addRequest.onerror = () => reject(addRequest.error);
    };
  });
}

// Enhanced push notifications with actions
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');

  let notificationData = {
    title: 'Cloud Storage',
    body: 'You have new updates!',
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: 'cloud-storage-notification',
    data: {
      url: '/dashboard',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'View Files',
        icon: '/logo-192.png'
      },
      {
        action: 'sync',
        title: 'Sync Now',
        icon: '/logo-192.png'
      }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = { ...notificationData, ...payload };
    } catch (error) {
      console.error('Failed to parse push notification payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Enhanced notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked:', event.action);

  event.notification.close();

  const handleAction = async () => {
    const clients = await self.clients.matchAll({ type: 'window' });

    switch (event.action) {
      case 'view':
        // Open files view
        const url = event.notification.data?.url || '/dashboard';
        return openUrl(url, clients);

      case 'sync':
        // Trigger background sync
        await Promise.all([
          uploadPendingFiles(),
          syncPendingData()
        ]);

        // Show sync completion notification
        return self.registration.showNotification('Sync Complete', {
          body: 'Your files have been synchronized',
          icon: '/logo-192.png',
          tag: 'sync-complete'
        });

      default:
        // Default action - focus or open app
        return openUrl('/dashboard', clients);
    }
  };

  event.waitUntil(handleAction());
});

// Helper function to open URL or focus existing window
async function openUrl(url, clients) {
  // Check if there's already a window open
  for (const client of clients) {
    if (client.url.includes(url) && 'focus' in client) {
      return client.focus();
    }
  }

  // No existing window found, open new one
  if (self.clients.openWindow) {
    return self.clients.openWindow(url);
  }
}