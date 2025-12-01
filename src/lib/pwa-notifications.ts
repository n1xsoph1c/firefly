'use client';

import { useState, useEffect } from 'react';

// PWA Push Notifications for iOS Cloud Storage
// Handles offline sync notifications and file sharing alerts

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
}

class PWANotifications {
  private static instance: PWANotifications;
  private registration: ServiceWorkerRegistration | null = null;

  static getInstance(): PWANotifications {
    if (!PWANotifications.instance) {
      PWANotifications.instance = new PWANotifications();
    }
    return PWANotifications.instance;
  }

  // Initialize notifications
  async initialize(): Promise<boolean> {
    try {
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        return false;
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return false;
      }

      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;
      
      // Request notification permission
      const permission = await this.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    try {
      // For iOS PWA, notifications work differently
      if (this.isIOS() && this.isPWA()) {
        // iOS PWA notifications require user gesture
        const permission = await Notification.requestPermission();
        return permission;
      }

      // Standard web notification permission
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  // Check if notifications are supported and permitted
  isSupported(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  // Show local notification
  async showNotification(data: NotificationData): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        console.log('Notifications not supported or permitted');
        return false;
      }

      // Use service worker notification for better iOS support
      if (this.registration) {
        await this.registration.showNotification(data.title, {
          body: data.body,
          icon: data.icon || '/logo-192.png',
          badge: data.badge || '/logo-192.png',
          data: data.data,
          tag: data.tag,
          requireInteraction: data.requireInteraction || false,
          // iOS specific options
          silent: false,
        });
      } else {
        // Fallback to regular notification
        new Notification(data.title, {
          body: data.body,
          icon: data.icon || '/logo-192.png',
          data: data.data,
          tag: data.tag,
          requireInteraction: data.requireInteraction || false,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  // Show upload completion notification
  async notifyUploadComplete(filename: string, fileCount: number = 1): Promise<void> {
    const title = fileCount === 1 
      ? 'Upload Complete' 
      : `${fileCount} Uploads Complete`;
    
    const body = fileCount === 1
      ? `${filename} has been uploaded successfully`
      : `${fileCount} files including ${filename} have been uploaded`;

    await this.showNotification({
      title,
      body,
      icon: '/logo-192.png',
      tag: 'upload-complete',
      data: { type: 'upload-complete', filename, fileCount }
    });
  }

  // Show sync status notification
  async notifySync(status: 'started' | 'complete' | 'failed', details?: string): Promise<void> {
    let title: string;
    let body: string;

    switch (status) {
      case 'started':
        title = 'Syncing...';
        body = 'Uploading queued files in the background';
        break;
      case 'complete':
        title = 'Sync Complete';
        body = details || 'All pending uploads have been processed';
        break;
      case 'failed':
        title = 'Sync Failed';
        body = details || 'Some uploads could not be completed';
        break;
    }

    await this.showNotification({
      title,
      body,
      icon: '/logo-192.png',
      tag: 'sync-status',
      data: { type: 'sync-status', status, details }
    });
  }

  // Show file share notification
  async notifyFileShared(filename: string, shareUrl: string): Promise<void> {
    await this.showNotification({
      title: 'File Shared',
      body: `${filename} is now shared and ready to download`,
      icon: '/logo-192.png',
      tag: 'file-shared',
      requireInteraction: true,
      data: { type: 'file-shared', filename, shareUrl }
    });
  }

  // Show storage quota warning
  async notifyStorageWarning(usagePercent: number): Promise<void> {
    await this.showNotification({
      title: 'Storage Warning',
      body: `Storage is ${usagePercent}% full. Consider deleting old files.`,
      icon: '/logo-192.png',
      tag: 'storage-warning',
      requireInteraction: true,
      data: { type: 'storage-warning', usagePercent }
    });
  }

  // Utility functions
  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  private isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true ||
           document.referrer.includes('android-app://');
  }
}

// Create singleton instance
const pwaNotifications = PWANotifications.getInstance();

// React hook for notifications
export function usePWANotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const initNotifications = async () => {
      const supported = await pwaNotifications.initialize();
      setIsSupported(supported);
      setPermission(Notification.permission);
    };

    initNotifications();

    // Listen for permission changes
    const handlePermissionChange = () => {
      setPermission(Notification.permission);
    };

    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then(permissionStatus => {
        permissionStatus.onchange = handlePermissionChange;
      });
    }
  }, []);

  return {
    isSupported,
    permission,
    requestPermission: () => pwaNotifications.requestPermission(),
    showNotification: (data: NotificationData) => pwaNotifications.showNotification(data),
    notifyUploadComplete: (filename: string, fileCount?: number) => 
      pwaNotifications.notifyUploadComplete(filename, fileCount),
    notifySync: (status: 'started' | 'complete' | 'failed', details?: string) => 
      pwaNotifications.notifySync(status, details),
    notifyFileShared: (filename: string, shareUrl: string) => 
      pwaNotifications.notifyFileShared(filename, shareUrl),
    notifyStorageWarning: (usagePercent: number) => 
      pwaNotifications.notifyStorageWarning(usagePercent)
  };
}

export default pwaNotifications;