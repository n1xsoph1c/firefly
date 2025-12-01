'use client';

import { useState, useEffect } from 'react';
import { usePWASync } from '@/lib/pwa-background-sync';
import { Wifi, WifiOff, RefreshCw, Info, Clock, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface PWAStatusProps {
  className?: string;
}

export default function PWAStatus({ className = '' }: PWAStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isPWA, setIsPWA] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  const { 
    getPendingUploads, 
    getPendingDataChanges, 
    triggerSync, 
    isPWA: checkIsPWA, 
    isIOS: checkIsIOS,
    showIOSInstallPrompt 
  } = usePWASync();

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);
    setIsPWA(checkIsPWA());
    setIsIOS(checkIsIOS());

    // Show install prompt for iOS users if not PWA
    if (checkIsIOS() && !checkIsPWA() && !localStorage.getItem('pwa-install-dismissed')) {
      setShowInstallPrompt(true);
    }

    // Listen for online/offline changes
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync(); // Trigger sync when back online
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for background sync events
    const handleUploadSynced = () => updatePendingCounts();
    const handleDataSynced = () => updatePendingCounts();
    const handleUploadFailed = (event: CustomEvent) => {
      console.log('Upload failed:', event.detail);
      updatePendingCounts();
    };

    window.addEventListener('upload-synced', handleUploadSynced);
    window.addEventListener('data-synced', handleDataSynced);
    window.addEventListener('upload-failed', handleUploadFailed as EventListener);

    // Update pending counts initially and periodically
    updatePendingCounts();
    const interval = setInterval(updatePendingCounts, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('upload-synced', handleUploadSynced);
      window.removeEventListener('data-synced', handleDataSynced);
      window.removeEventListener('upload-failed', handleUploadFailed as EventListener);
      clearInterval(interval);
    };
  }, []);

  const updatePendingCounts = async () => {
    try {
      const [uploads, changes] = await Promise.all([
        getPendingUploads(),
        getPendingDataChanges()
      ]);
      setPendingUploads(uploads.length);
      setPendingChanges(changes.length);
    } catch (error) {
      console.error('Failed to update pending counts:', error);
    }
  };

  const handleManualSync = () => {
    triggerSync();
    updatePendingCounts();
  };

  const handleInstallPrompt = () => {
    showIOSInstallPrompt();
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const totalPending = pendingUploads + pendingChanges;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* iOS Install Prompt */}
      {showInstallPrompt && isIOS && !isPWA && (
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-zinc-100">
                <strong>Install Cloud Storage</strong> for the best experience with offline support and faster access.
              </p>
              <div className="mt-3 flex gap-3">
                <Button
                  onClick={handleInstallPrompt}
                  size="sm"
                  variant="primary"
                >
                  Show Instructions
                </Button>
                <Button
                  onClick={dismissInstallPrompt}
                  size="sm"
                  variant="ghost"
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className="text-sm font-medium text-zinc-100">
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {isPWA && (
            <Badge variant="primary" size="sm">PWA</Badge>
          )}
        </div>

        {/* Sync Status */}
        {totalPending > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">
              {totalPending} pending
            </span>
            <button
              onClick={handleManualSync}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-800"
              title="Sync now"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Pending Items Details */}
      {totalPending > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-zinc-200 flex-1">
              {pendingUploads > 0 && (
                <div>{pendingUploads} file{pendingUploads !== 1 ? 's' : ''} queued for upload</div>
              )}
              {pendingChanges > 0 && (
                <div>{pendingChanges} change{pendingChanges !== 1 ? 's' : ''} pending sync</div>
              )}
              <div className="text-xs mt-1 text-amber-400">
                {isOnline ? 'Syncing...' : 'Will sync when online'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Mode Notice */}
      {!isOnline && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-zinc-300 flex-1">
              <div>You're offline - files will be uploaded when connection is restored</div>
              <div className="text-xs mt-1 text-zinc-500">
                You can still browse cached files and queue uploads
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 