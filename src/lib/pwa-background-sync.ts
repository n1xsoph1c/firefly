'use client';

// PWA Background Sync Utilities for iOS Cloud Storage
// Handles offline file uploads and data synchronization

export interface PendingUpload {
  id?: number;
  file: File;
  filename: string;
  folderId?: string;
  authToken?: string;
  timestamp: number;
  retries: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
}

export interface PendingDataChange {
  id?: number;
  type: 'folder-create' | 'folder-delete' | 'file-move' | 'file-delete' | 'share-create';
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: any;
  authToken?: string;
  timestamp: number;
  retries: number;
}

class PWABackgroundSync {
  private dbName = 'CloudStorageDB';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initDB();
      this.registerServiceWorkerListeners();
    }
  }

  // Initialize IndexedDB for offline storage
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create uploads store
        if (!db.objectStoreNames.contains('uploads')) {
          const uploadsStore = db.createObjectStore('uploads', { keyPath: 'id', autoIncrement: true });
          uploadsStore.createIndex('timestamp', 'timestamp', { unique: false });
          uploadsStore.createIndex('status', 'status', { unique: false });
        }

        // Create data changes store
        if (!db.objectStoreNames.contains('dataChanges')) {
          const dataStore = db.createObjectStore('dataChanges', { keyPath: 'id', autoIncrement: true });
          dataStore.createIndex('timestamp', 'timestamp', { unique: false });
          dataStore.createIndex('type', 'type', { unique: false });
        }

        // Create shared files store
        if (!db.objectStoreNames.contains('sharedFiles')) {
          const sharedStore = db.createObjectStore('sharedFiles', { keyPath: 'id', autoIncrement: true });
          sharedStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        this.db = db;
      };
    });
  }

  // Register service worker message listeners
  private registerServiceWorkerListeners() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, ...data } = event.data;

        switch (type) {
          case 'UPLOAD_SYNCED':
            this.handleUploadSynced(data);
            break;
          case 'UPLOAD_FAILED':
            this.handleUploadFailed(data);
            break;
          case 'DATA_SYNCED':
            this.handleDataSynced(data);
            break;
          case 'SHARED_FILES_RECEIVED':
            this.handleSharedFiles(data);
            break;
        }
      });
    }
  }

  // Queue file for background upload when offline
  async queueFileUpload(file: File, folderId?: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('PWA functionality only available in browser');
    }
    const db = await this.initDB();
    const authToken = this.getAuthToken();

    const upload: PendingUpload = {
      file,
      filename: file.name,
      folderId: folderId || '',
      authToken,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['uploads'], 'readwrite');
      const store = transaction.objectStore('uploads');
      const request = store.add(upload);

      request.onsuccess = () => {
        console.log('File queued for background upload:', file.name);
        
        // Try to register background sync
        this.registerBackgroundSync('upload-files');
        
        // If online, try immediate upload
        if (typeof window !== 'undefined' && navigator.onLine) {
          this.triggerSync();
        }
        
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Queue data change for background sync
  async queueDataChange(change: Omit<PendingDataChange, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('PWA functionality only available in browser');
    }
    const db = await this.initDB();
    const authToken = this.getAuthToken();

    const dataChange: PendingDataChange = {
      ...change,
      authToken,
      timestamp: Date.now(),
      retries: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dataChanges'], 'readwrite');
      const store = transaction.objectStore('dataChanges');
      const request = store.add(dataChange);

      request.onsuccess = () => {
        console.log('Data change queued for sync:', change.type);
        
        // Try to register background sync
        this.registerBackgroundSync('sync-data');
        
        // If online, try immediate sync
        if (typeof window !== 'undefined' && navigator.onLine) {
          this.triggerSync();
        }
        
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Get pending uploads for display in UI
  async getPendingUploads(): Promise<PendingUpload[]> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['uploads'], 'readonly');
      const store = transaction.objectStore('uploads');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get pending data changes
  async getPendingDataChanges(): Promise<PendingDataChange[]> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dataChanges'], 'readonly');
      const store = transaction.objectStore('dataChanges');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all pending items (for debugging/admin)
  async clearPendingItems(): Promise<void> {
    const db = await this.initDB();

    const clearStore = (storeName: string) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    };

    await Promise.all([
      clearStore('uploads'),
      clearStore('dataChanges'),
      clearStore('sharedFiles')
    ]);

    console.log('All pending items cleared');
  }

  // Register background sync with service worker
  private async registerBackgroundSync(tag: string): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // TypeScript workaround for sync API
        const syncManager = (registration as any).sync;
        if (syncManager) {
          await syncManager.register(tag);
          console.log('Background sync registered:', tag);
        }
      } catch (error) {
        console.log('Background sync registration failed:', error);
      }
    }
  }

  // Trigger manual sync
  async triggerSync(): Promise<void> {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_REQUEST'
      });
    }
  }

  // Handle successful upload sync from service worker
  private handleUploadSynced(data: { filename: string; success: boolean }) {
    console.log('Upload synced successfully:', data.filename);
    
    // Trigger UI update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('upload-synced', { detail: data }));
    }
  }

  // Handle failed upload from service worker
  private handleUploadFailed(data: { filename: string; error: string }) {
    console.log('Upload failed:', data.filename, data.error);
    
    // Trigger UI update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('upload-failed', { detail: data }));
    }
  }

  // Handle successful data sync from service worker
  private handleDataSynced(data: { changeType: string; success: boolean }) {
    console.log('Data synced successfully:', data.changeType);
    
    // Trigger UI update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('data-synced', { detail: data }));
    }
  }

  // Handle shared files from other apps
  private handleSharedFiles(data: { count: number }) {
    console.log('Shared files received:', data.count);
    
    // Trigger UI update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shared-files-received', { detail: data }));
    }
  }

  // Get authentication token from storage
  private getAuthToken(): string | undefined {
    // Get from cookie or localStorage
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='));
      return authCookie ? authCookie.split('=')[1] : undefined;
    }
    return undefined;
  }

  // Check if app is running as PWA
  isPWA(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    // iOS PWA detection
    if (window.navigator && (window.navigator as any).standalone === true) {
      return true;
    }
    
    // Android PWA detection
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    
    return false;
  }

  // Check if device is iOS
  isIOS(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  // Show iOS install prompt
  showIOSInstallPrompt(): void {
    if (typeof window !== 'undefined' && (window as any).showIOSInstallPrompt) {
      (window as any).showIOSInstallPrompt();
    }
  }
}

// Export singleton instance
export const pwaBackgroundSync = new PWABackgroundSync();

// React hook for using PWA background sync
export function usePWASync() {
  const queueUpload = async (file: File, folderId?: string) => {
    if (typeof window !== 'undefined' && navigator.onLine) {
      // If online, upload immediately
      return uploadFileDirectly(file, folderId);
    } else {
      // If offline, queue for background sync
      await pwaBackgroundSync.queueFileUpload(file, folderId);
      return { queued: true, filename: file.name };
    }
  };

  const queueDataChange = async (change: Omit<PendingDataChange, 'id' | 'timestamp' | 'retries'>) => {
    if (typeof window !== 'undefined' && navigator.onLine) {
      // If online, execute immediately
      return executeDataChangeDirectly(change);
    } else {
      // If offline, queue for sync
      await pwaBackgroundSync.queueDataChange(change);
      return { queued: true, type: change.type };
    }
  };

  return {
    queueUpload,
    queueDataChange,
    triggerSync: () => pwaBackgroundSync.triggerSync(),
    getPendingUploads: () => pwaBackgroundSync.getPendingUploads(),
    getPendingDataChanges: () => pwaBackgroundSync.getPendingDataChanges(),
    clearPendingItems: () => pwaBackgroundSync.clearPendingItems(),
    isPWA: () => pwaBackgroundSync.isPWA(),
    isIOS: () => pwaBackgroundSync.isIOS(),
    showIOSInstallPrompt: () => pwaBackgroundSync.showIOSInstallPrompt()
  };
}

// Helper function to upload file directly
async function uploadFileDirectly(file: File, folderId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) {
    formData.append('folderId', folderId);
  }

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

// Helper function to execute data change directly
async function executeDataChangeDirectly(change: Omit<PendingDataChange, 'id' | 'timestamp' | 'retries'>) {
  const response = await fetch(change.endpoint, {
    method: change.method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(change.data)
  });

  if (!response.ok) {
    throw new Error(`Data change failed: ${response.statusText}`);
  }

  return response.json();
}