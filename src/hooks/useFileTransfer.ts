"use client";
/**
 * High-performance file transfer hook
 * - Adaptive chunked upload (parallelizable future extension)
 * - Streaming single-part upload with progress
 * - Streaming download with Range resume & progress
 * - Abort support to cancel active transfers
 */
import { useCallback, useRef, useState } from 'react';

export interface TransferProgress {
  bytesSent: number;
  bytesTotal: number;
  percent: number;
  speedBps: number; // moving average maybe later
  etaSeconds: number | null;
}

interface UploadOptions {
  folderId?: string | null;
  description?: string;
  onProgress?: (p: TransferProgress) => void;
  signal?: AbortSignal;
  chunked?: boolean; // force chunk logic
  chunkSize?: number; // override default
  resumeUploadId?: string; // existing upload session to resume
  onResumeDetected?: (info: { uploadId: string; uploadedChunks: number[]; totalChunks: number }) => void;
}

interface DownloadOptions {
  fileName?: string;        // override
  token?: string;           // direct download token (one-time)
  onProgress?: (p: TransferProgress) => void;
  signal?: AbortSignal;
  resume?: boolean;         // attempt resume using Range
  resumeBytes?: number;     // start offset if known
}

interface StreamVideoOptions {
  startByte?: number;
  onProgress?: (p: TransferProgress) => void;
  signal?: AbortSignal;
  mimeType?: string;
  shareToken?: string;
  fileName?: string; // used only for diagnostics
}

interface UseFileTransferReturn {
  uploadFile: (file: File, opts?: UploadOptions) => Promise<{ uploadId?: string }>;
  downloadFile: (fileId: string, opts?: DownloadOptions) => Promise<{ bytesDownloaded: number }>;
  streamVideo: (fileId: string, videoEl: HTMLVideoElement, opts?: StreamVideoOptions) => Promise<void>;
  downloading: boolean;
  uploading: boolean;
  streaming: boolean;
  lastError: string | null;
  abortAll: () => void;
}

// Threshold above which we switch to chunked strategy automatically
const DEFAULT_CHUNK_THRESHOLD = 512 * 1024 * 1024; // 512MB
const DEFAULT_CHUNK_SIZE = 100 * 1024 * 1024; // 100MB (aligned with backend chunk route)

export function useFileTransfer(): UseFileTransferReturn {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const controllersRef = useRef<AbortController[]>([]);

  const trackController = (c: AbortController) => {
    controllersRef.current.push(c);
  };

  const clearControllers = () => {
    controllersRef.current.forEach(c => c.abort());
    controllersRef.current = [];
  };

  const abortAll = useCallback(() => {
    clearControllers();
    setUploading(false);
    setDownloading(false);
  }, []);

  const uploadFile = useCallback(async (file: File, opts?: UploadOptions) => {
    setLastError(null);
    const { folderId, description, onProgress } = opts || {};
    const forceChunked = opts?.chunked || false;
    const configuredChunkSize = opts?.chunkSize || DEFAULT_CHUNK_SIZE;

    // Decide strategy
    if (forceChunked || file.size >= DEFAULT_CHUNK_THRESHOLD) {
      setUploading(true);
      const startTime = Date.now();
      let uploadId = opts?.resumeUploadId;
      const totalChunks = Math.ceil(file.size / configuredChunkSize);

      let uploadedChunkSet = new Set<number>();

      if (uploadId) {
        // check status
        const statusResp = await fetch(`/api/files/upload/status?uploadId=${encodeURIComponent(uploadId)}`);
        if (statusResp.ok) {
          const statusJson = await statusResp.json();
            if (statusJson.totalChunks === totalChunks && statusJson.fileSize === file.size) {
              uploadedChunkSet = new Set<number>(statusJson.uploadedChunks);
              opts?.onResumeDetected?.({ uploadId, uploadedChunks: statusJson.uploadedChunks, totalChunks });
            } else {
              // mismatch -> start new
              uploadId = undefined;
            }
        } else {
          uploadId = undefined;
        }
      }
      if (!uploadId) {
        const initResp = await fetch('/api/files/upload/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            totalChunks,
            folderId: folderId || undefined
          })
        });
        if (!initResp.ok) {
          setUploading(false);
          setLastError('Failed to initialize upload');
          return { uploadId: undefined };
        }
        const initJson = await initResp.json();
        uploadId = initJson.uploadId;
      }

      let uploadedBytes = Array.from(uploadedChunkSet.values()).reduce((acc, idx) => {
        const start = idx * configuredChunkSize;
        const end = Math.min(start + configuredChunkSize, file.size);
        return acc + (end - start);
      }, 0);

      for (let index = 0; index < totalChunks; index++) {
        if (uploadedChunkSet.has(index)) {
          // already uploaded
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = uploadedBytes / Math.max(elapsed, 0.001);
          const remaining = file.size - uploadedBytes;
          const eta = speed > 0 ? remaining / speed : null;
          onProgress?.({ bytesSent: uploadedBytes, bytesTotal: file.size, percent: (uploadedBytes / file.size) * 100, speedBps: speed, etaSeconds: eta });
          continue;
        }
        const start = index * configuredChunkSize;
        const end = Math.min(start + configuredChunkSize, file.size);
        const chunk = file.slice(start, end);

        const form = new FormData();
        form.append('chunk', chunk);
        form.append('uploadId', uploadId!); // uploadId guaranteed after init
        form.append('chunkIndex', index.toString());
        form.append('totalChunks', totalChunks.toString());

        const controller = new AbortController();
        if (opts?.signal) {
          opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        trackController(controller);

        // Use XHR for real-time chunk upload progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/files/upload/chunk');
          
          // Track progress within this chunk
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              // Calculate total progress: previous chunks + current chunk progress
              const currentChunkProgress = e.loaded;
              const totalUploadedSoFar = uploadedBytes + currentChunkProgress;
              
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = totalUploadedSoFar / Math.max(elapsed, 0.001);
              const remaining = file.size - totalUploadedSoFar;
              const eta = speed > 0 ? remaining / speed : null;
              
              onProgress?.({ 
                bytesSent: totalUploadedSoFar, 
                bytesTotal: file.size, 
                percent: (totalUploadedSoFar / file.size) * 100, 
                speedBps: speed, 
                etaSeconds: eta 
              });
            }
          };
          
          xhr.onerror = () => {
            setLastError(`Chunk ${index + 1} failed`);
            reject(new Error(`Chunk ${index + 1} failed`));
          };
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              setLastError(`Chunk ${index + 1} failed`);
              reject(new Error(`Chunk ${index + 1} failed`));
            }
          };
          
          // Handle abort signal
          if (opts?.signal) {
            opts.signal.addEventListener('abort', () => {
              try { xhr.abort(); } catch {}
            }, { once: true });
          }
          
          xhr.send(form);
        });

        uploadedBytes += chunk.size;
        // Final progress update for this chunk completion
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = uploadedBytes / Math.max(elapsed, 0.001);
        const remaining = file.size - uploadedBytes;
        const eta = speed > 0 ? remaining / speed : null;
        onProgress?.({ bytesSent: uploadedBytes, bytesTotal: file.size, percent: (uploadedBytes / file.size) * 100, speedBps: speed, etaSeconds: eta });
      }

      // FINALIZE
      const finalizeResp = await fetch('/api/files/upload/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId })
      });
      if (!finalizeResp.ok) {
        setUploading(false);
        setLastError('Finalize failed');
        return { uploadId };
      }
      setUploading(false);
      return { uploadId };
    }

    // SIMPLE STREAMING FORM UPLOAD
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    if (folderId) form.append('folderId', folderId);
    if (description) form.append('description', description);

    const startTime = Date.now();

    // Use XHR for granular progress while still sending as streaming multipart
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = e.loaded / Math.max(elapsed, 0.001);
          const remaining = file.size - e.loaded;
          const eta = speed > 0 ? remaining / speed : null;
          onProgress?.({ bytesSent: e.loaded, bytesTotal: file.size, percent: (e.loaded / file.size) * 100, speedBps: speed, etaSeconds: eta });
        }
      };
      xhr.onerror = () => {
        setLastError('Upload failed');
        setUploading(false);
        reject(new Error('Upload failed'));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          setLastError('Upload failed');
          setUploading(false);
          reject(new Error('Upload failed'));
        }
      };
      const controller = new AbortController();
      if (opts?.signal) opts.signal.addEventListener('abort', () => { try { xhr.abort(); } catch {} }, { once: true });
      trackController(controller); // kept for uniform abortAll
      xhr.send(form);
    });
    setUploading(false);
    return { uploadId: undefined };
  }, []);

  const downloadFile = useCallback(async (fileId: string, opts?: DownloadOptions) => {
    setLastError(null);
    setDownloading(true);
    const controller = new AbortController();
    if (opts?.signal) opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
    trackController(controller);

    const baseUrl = opts?.token ? `/api/files/download-direct/${opts.token}` : `/api/files/${fileId}/download`;
    let headers: Record<string,string> = {};
    let startByte = 0;
    if (opts?.resume && (opts.resumeBytes || opts.resumeBytes === 0)) {
      startByte = opts.resumeBytes;
      headers['Range'] = `bytes=${startByte}-`;
    }
    const resp = await fetch(baseUrl, { signal: controller.signal, headers });
    if (!resp.ok) {
      setLastError('Download failed');
      setDownloading(false);
      return { bytesDownloaded: 0 };
    }
    const contentLength = resp.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength) : 0;

    // Stream into a Blob
    const reader = resp.body?.getReader();
    if (!reader) {
      setLastError('No stream');
      setDownloading(false);
      return { bytesDownloaded: 0 };
    }

    const chunks: Uint8Array[] = [];
    let received = 0;
    const start = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (opts?.onProgress && total) {
          const elapsed = (Date.now() - start) / 1000;
          const speed = received / Math.max(elapsed, 0.001);
          const remaining = total - received;
          const eta = speed > 0 ? remaining / speed : null;
          opts.onProgress({ bytesSent: received, bytesTotal: total, percent: (received / total) * 100, speedBps: speed, etaSeconds: eta });
        }
      }
    }

  // Cast to BlobPart[] for TypeScript compatibility
  const blob = new Blob(chunks as BlobPart[]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = opts?.fileName || `file-${fileId}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setDownloading(false);
    return { bytesDownloaded: received };
  }, []);

  const streamVideo = useCallback(async (fileId: string, videoEl: HTMLVideoElement, opts?: StreamVideoOptions) => {
    setLastError(null);
    setStreaming(true);
    const controller = new AbortController();
    if (opts?.signal) opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
    trackController(controller);
    const start = opts?.startByte || 0;
    const shareToken = opts?.shareToken;
    const baseUrl = shareToken ? `/api/stream/${shareToken}/${fileId}` : `/api/files/${fileId}/stream`;
    const headers: Record<string,string> = {};
    if (start > 0) headers['Range'] = `bytes=${start}-`;
    const resp = await fetch(baseUrl, { signal: controller.signal, headers });
    if (!resp.ok || !resp.body) {
      setLastError('Stream failed');
      setStreaming(false);
      return;
    }
    const reader = resp.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    const t0 = Date.now();
    const contentRange = resp.headers.get('content-range');
    let totalBytes = 0;
    if (contentRange) {
      const m = /bytes \d+-\d+\/(\d+)/.exec(contentRange);
      if (m) totalBytes = parseInt(m[1]);
    } else {
      const len = resp.headers.get('content-length');
      if (len) totalBytes = parseInt(len);
    }
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (opts?.onProgress && totalBytes) {
          const elapsed = (Date.now() - t0) / 1000;
          const speed = received / Math.max(elapsed, 0.001);
          const remaining = totalBytes - (start + received);
            const eta = speed > 0 ? remaining / speed : null;
          opts.onProgress({ bytesSent: start + received, bytesTotal: totalBytes, percent: ((start + received) / totalBytes) * 100, speedBps: speed, etaSeconds: eta });
        }
        // Progressive append using MediaSource could be used; for simplicity we accumulate then set.
      }
    }
    // For now, create blob URL and set on video (simple fallback). Advanced: MediaSource Extension incremental.
    const blob = new Blob(chunks as BlobPart[], { type: opts?.mimeType || 'video/mp4' });
    const url = URL.createObjectURL(blob);
    videoEl.src = url;
    videoEl.play().catch(()=>{});
    setStreaming(false);
  }, []);

  return { uploadFile, downloadFile, streamVideo, downloading, uploading, streaming, lastError, abortAll };
}
