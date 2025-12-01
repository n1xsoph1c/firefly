import { NextResponse } from 'next/server';
import path from 'path';

// X-Accel-Redirect utility for direct file serving through Nginx
// This bypasses Next.js for file streaming, achieving full bandwidth

export interface DirectServeOptions {
  filePath: string;
  filename: string;
  mimeType: string;
  size: number | bigint;
  inline?: boolean; // true for preview/streaming, false for download
  cacheControl?: string;
}

export function createDirectServeResponse(options: DirectServeOptions): NextResponse {
  const {
    filePath,
    filename,
    mimeType,
    size,
    inline = false,
    cacheControl = 'public, max-age=3600'
  } = options;

  // Convert absolute path to internal Nginx path
  // E:\cloud-storage\uploads\files\video.mp4 -> /internal/files/files/video.mp4
  const uploadPath = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
  const relativePath = path.relative(uploadPath, filePath);
  const nginxPath = `/internal/files/${relativePath.replace(/\\/g, '/')}`;
  const debugEnabled = process.env.DEBUG_ACCEL === '1';

  // Debug logging for X-Accel paths (remove after testing)
  if (debugEnabled) {
    console.log('[ACCEL][FULL]', { filePath, uploadPath, relativePath, nginxPath });
  }

  const headers: Record<string, string> = {
    // Always use X-Accel-Redirect
    'X-Accel-Redirect': nginxPath,
    'X-Accel-Buffering': 'no',
    'Content-Type': mimeType || 'application/octet-stream',
    'Content-Length': size.toString(),
    'Accept-Ranges': 'bytes',
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
  };

  // Set appropriate disposition
  if (inline) {
    headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;
  } else {
    headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;
  }

  // Add CORS headers for shared content
  headers['Access-Control-Allow-Origin'] = '*';
  headers['Access-Control-Allow-Headers'] = 'Range, Content-Type';
  headers['Access-Control-Expose-Headers'] = 'Content-Range, Accept-Ranges, Content-Length';

  if (debugEnabled) {
    headers['X-Debug-Accel-Path'] = nginxPath;
    headers['X-Debug-Upload-Root'] = uploadPath;
    headers['X-Debug-Accel-Status'] = 'enabled';
  }

  // Return empty response - Nginx will serve the actual file
  return new NextResponse(null, {
    status: 200,
    headers,
  });
}

export function createDirectRangeResponse(
  options: DirectServeOptions,
  start: number,
  end: number,
  totalSize: number
): NextResponse {
  const {
    filePath,
    filename,
    mimeType,
    inline = false,
    cacheControl = 'public, max-age=3600'
  } = options;

  // Convert absolute path to internal Nginx path
  const uploadPath = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
  const relativePath = path.relative(uploadPath, filePath);
  const nginxPath = `/internal/files/${relativePath.replace(/\\/g, '/')}`;
  const debugEnabled = process.env.DEBUG_ACCEL === '1';
  
  if (debugEnabled) {
    console.log('[ACCEL][RANGE]', { filePath, uploadPath, relativePath, nginxPath, start, end });
  }

  const chunkSize = (end - start) + 1;

  const headers: Record<string, string> = {
    // Always use X-Accel-Redirect
    'X-Accel-Redirect': nginxPath,
    'X-Accel-Buffering': 'no',
    'Content-Type': mimeType || 'application/octet-stream',
    'Content-Range': `bytes ${start}-${end}/${totalSize}`,
    'Content-Length': chunkSize.toString(),
    'Accept-Ranges': 'bytes',
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
  };

  // Set appropriate disposition
  if (inline) {
    headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;
  } else {
    headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;
  }

  // Add CORS headers
  headers['Access-Control-Allow-Origin'] = '*';
  headers['Access-Control-Allow-Headers'] = 'Range, Content-Type';
  headers['Access-Control-Expose-Headers'] = 'Content-Range, Accept-Ranges, Content-Length';

  if (debugEnabled) {
    headers['X-Debug-Accel-Path'] = nginxPath;
    headers['X-Debug-Upload-Root'] = uploadPath;
    headers['X-Debug-Accel-Status'] = 'enabled';
  }

  // Return 206 Partial Content - Nginx will serve the actual range
  return new NextResponse(null, {
    status: 206,
    headers,
  });
}

// Check if we should use direct serving (production with Nginx)
export function shouldUseDirectServing(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.USE_NGINX_DIRECT_SERVE === 'true';
}

// Fallback to Node.js streaming for development
export function createFallbackResponse(options: DirectServeOptions): NextResponse {
  const { getAbsoluteFilePath, createFileStream } = require('@/lib/storage');
  const filePath = options.filePath;
  
  const fileStream = createFileStream(filePath);
  
  const headers: Record<string, string> = {
    'Content-Type': options.mimeType || 'application/octet-stream',
    'Content-Length': options.size.toString(),
    'Accept-Ranges': 'bytes',
    'Cache-Control': options.cacheControl || 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  };

  if (options.inline) {
    headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeURIComponent(options.filename)}`;
  } else {
    headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(options.filename)}`;
  }

  return new NextResponse(fileStream, { headers });
}

export function createFallbackRangeResponse(
  options: DirectServeOptions,
  start: number,
  end: number,
  totalSize: number
): NextResponse {
  const { createRangeFileStream } = require('@/lib/storage');
  const filePath = options.filePath;
  
  const fileStream = createRangeFileStream(filePath, start, end);
  const chunkSize = (end - start) + 1;
  
  const headers: Record<string, string> = {
    'Content-Type': options.mimeType || 'application/octet-stream',
    'Content-Range': `bytes ${start}-${end}/${totalSize}`,
    'Content-Length': chunkSize.toString(),
    'Accept-Ranges': 'bytes',
    'Cache-Control': options.cacheControl || 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  };

  if (options.inline) {
    headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeURIComponent(options.filename)}`;
  } else {
    headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(options.filename)}`;
  }

  return new NextResponse(fileStream, {
    status: 206,
    headers,
  });
}