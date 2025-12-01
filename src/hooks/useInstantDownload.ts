'use client';

import { useState, useCallback } from 'react';

interface DownloadState {
  isLoading: boolean;
  progress: number;
  error: string | null;
  isDownloading: boolean;
}

interface UseInstantDownloadReturn {
  downloadState: DownloadState;
  downloadFile: (fileId: string) => Promise<void>;
  resetDownload: () => void;
}

export function useInstantDownload(): UseInstantDownloadReturn {
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isLoading: false,
    progress: 0,
    error: null,
    isDownloading: false,
  });

  const downloadFile = useCallback(async (fileId: string) => {
    try {
      // Instant download - no preparation needed
      setDownloadState({
        isLoading: true,
        progress: 50,
        error: null,
        isDownloading: true,
      });

      // Direct download URL
      const downloadUrl = `/api/files/${fileId}/download`;
      
      // Create download link and trigger it
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      
      // Download started
      setDownloadState(prev => ({
        ...prev,
        progress: 100,
      }));
      
      // Trigger the download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      
      // Reset state after a short delay
      setTimeout(() => {
        setDownloadState({
          isLoading: false,
          progress: 0,
          error: null,
          isDownloading: false,
        });
      }, 1000);

    } catch (error) {
      console.error('Download error:', error);
      setDownloadState({
        isLoading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Download failed',
        isDownloading: false,
      });
    }
  }, []);

  const resetDownload = useCallback(() => {
    setDownloadState({
      isLoading: false,
      progress: 0,
      error: null,
      isDownloading: false,
    });
  }, []);

  return {
    downloadState,
    downloadFile,
    resetDownload,
  };
}