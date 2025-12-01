'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, HardDrive } from 'lucide-react';
import { usePWASync } from '@/lib/pwa-background-sync';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import Progress from './ui/Progress';

interface FileUploadProps {
  currentFolderId: string | null;
  onFileUploaded: () => void;
}

export default function FileUpload({ currentFolderId, onFileUploaded }: FileUploadProps) {
  // PWA Background Sync
  const { queueUpload } = usePWASync();
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [error, setError] = useState('');
  const [queuedFiles, setQueuedFiles] = useState<string[]>([]);

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

  const { uploadFile, lastError } = useFileTransfer();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Check if offline and use PWA background sync
    if (!navigator.onLine) {
      try {
        const result = await queueUpload(file, currentFolderId || undefined);
        if (result.queued) {
          setQueuedFiles(prev => [...prev, result.filename]);
          setError('');
          onFileUploaded(); // Refresh UI to show queued state
          return;
        }
      } catch (err) {
        console.error('Failed to queue upload:', err);
        setError('Failed to queue file for upload. Please try again.');
        return;
      }
    }

    // Online upload (existing logic)
    setUploading(true);
    setError('');
    setUploadProgress(0);
    setUploadSpeed(0);
    setUploadedBytes(0);
    setTotalBytes(file.size);
    const uploadStartTime = Date.now();
    setStartTime(uploadStartTime);
    try {
      await uploadFile(file, {
        folderId: currentFolderId || undefined,
        onProgress: (p) => {
          setUploadProgress(p.percent);
          setUploadedBytes(p.bytesSent);
          setUploadSpeed(p.speedBps);
        }
      });
      setUploadProgress(100);
      onFileUploaded();
    } catch (e) {
      setError(lastError || 'Upload failed');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadSpeed(0);
        setUploadedBytes(0);
        setTotalBytes(0);
      }, 2000);
    }
  }, [currentFolderId, onFileUploaded, uploadFile, lastError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 60 * 1024 * 1024 * 1024, // 60GB
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
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
            <div className="text-sm text-zinc-300 font-medium">Uploading your file...</div>
            <Progress 
              value={uploadProgress} 
              label={`${uploadProgress.toFixed(1)}%`}
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}</span>
            </div>
            {uploadSpeed > 0 && (
              <div className="text-xs text-zinc-400">
                Speed: {formatSpeed(uploadSpeed)} • ETA: {formatTime((totalBytes - uploadedBytes) / uploadSpeed)}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Upload className="h-8 w-8 text-zinc-400" />
            </div>
            <div className="text-lg font-medium text-zinc-100">
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
              <span>Videos, images, documents up to 10GB</span>
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