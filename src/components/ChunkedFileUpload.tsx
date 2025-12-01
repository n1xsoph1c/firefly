'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, HardDrive } from 'lucide-react';
import { usePWASync } from '@/lib/pwa-background-sync';
import { useFileTransfer, TransferProgress } from '@/hooks/useFileTransfer';
import { Progress } from './ui';

interface ChunkedFileUploadProps {
  currentFolderId: string | null;
  onFileUploaded: () => void;
}

const DEFAULT_CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks

export default function ChunkedFileUpload({ currentFolderId, onFileUploaded }: ChunkedFileUploadProps) {
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [error, setError] = useState('');
  const [resumed, setResumed] = useState(false);
  const [resumeInfo, setResumeInfo] = useState<string>('');
  const [uploadId, setUploadId] = useState<string | undefined>(undefined);
  const { uploadFile, uploading, lastError } = useFileTransfer();
  const lastUpdateTimeRef = useRef<number>(0);

  const { queueUpload, isPWA } = usePWASync();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}min ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.round(seconds % 60);
      return `${hours}h ${mins}min ${secs}s`;
    }
  };

  const handleProgress = (p: TransferProgress) => {
    // Throttle progress updates to ~60fps max for smooth animation
    const now = Date.now();
    if (now - lastUpdateTimeRef.current >= 16) { // ~60fps
      setProgress(p);
      lastUpdateTimeRef.current = now;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Check if offline and use PWA background sync
    if (!navigator.onLine) {
      try {
        const result = await queueUpload(file, currentFolderId || undefined);
        if (result.queued) {
          // queued file tracking removed in unified hook refactor
          setError('');
          // Show success message for queued upload
          const successMessage = `${file.name} queued for upload when online`;
          console.log(successMessage);
          onFileUploaded(); // Refresh UI to show queued state
          return;
        }
      } catch (err) {
        console.error('Failed to queue upload:', err);
        setError('Failed to queue file for upload. Please try again.');
        return;
      }
    }

    setError('');
    setProgress(null);
    setResumed(false);
    setResumeInfo('');
    try {
      const result = await uploadFile(file, {
        folderId: currentFolderId || undefined,
        chunked: true,
        chunkSize: DEFAULT_CHUNK_SIZE,
        resumeUploadId: uploadId,
        onProgress: handleProgress,
        onResumeDetected: info => {
          setResumed(true);
          setResumeInfo(`Resumed: ${info.uploadedChunks.length}/${info.totalChunks} chunks already uploaded`);
        }
      });
      if (result.uploadId) setUploadId(result.uploadId);
      onFileUploaded();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  }, [currentFolderId, onFileUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 60 * 1024 * 1024 * 1024, // 60GB
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-4 lg:p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-violet-500 bg-violet-500/10 scale-[1.02]'
            : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-violet-500/20 flex items-center justify-center animate-pulse">
              <Upload className="h-6 w-6 text-violet-400" />
            </div>
            <div className="text-sm text-zinc-300 font-medium">{resumed ? 'Resuming upload...' : 'Uploading your file...'}</div>
            <Progress 
              value={progress?.percent ?? 0} 
              label={`${(progress?.percent ?? 0).toFixed(1)}%`}
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{formatBytes(progress?.bytesSent || 0)} / {formatBytes(progress?.bytesTotal || 0)}</span>
            </div>
            {progress && progress.speedBps > 0 && (
              <div className="text-xs text-zinc-400 space-y-1">
                <div className="flex justify-between items-center">
                  <span>Speed: {formatSpeed(progress.speedBps)}</span>
                  {progress.etaSeconds && (
                    <span className="text-violet-400 font-medium">ETA: {formatTime(progress.etaSeconds)}</span>
                  )}
                </div>
                {resumeInfo && <div className="text-amber-400">{resumeInfo}</div>}
                <div className="text-xs text-zinc-500 mt-1">
                  Uploading in chunks for optimal performance...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 lg:w-16 h-12 lg:h-16 mx-auto rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Upload className="h-6 lg:h-8 w-6 lg:w-8 text-zinc-400" />
            </div>
            <div className="text-base lg:text-lg font-medium text-zinc-100">
              {isDragActive ? 'Drop your file here' : 'Drag files here'}
            </div>
            <div className="text-sm text-zinc-400">
              {isDragActive ? (
                <p>Release to upload</p>
              ) : (
                <p>
                  or{' '}
                  <span className="text-violet-400 font-medium">browse to choose a file</span>
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
              <FileIcon className="h-4 w-4" />
              <span className="text-center">Videos, images, documents, archives up to 20GB • Large files uploaded in 100MB chunks</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-400 text-sm text-center p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
} 