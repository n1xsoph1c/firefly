import { NextResponse } from 'next/server';
import path from 'path';
import { createFileStream, createRangeFileStream } from '@/lib/storage';
import { ParsedRange } from './http-range';

export interface BaseServeOptions {
  absolutePath: string;       // Absolute path on disk
  filename: string;          // Original filename
  mimeType: string;          // MIME type (fallback handled earlier)
  size: number;              // Total file size
  inline: boolean;           // Content-Disposition inline vs attachment
  cacheControl: string;      // Cache-Control header value
  cors?: boolean;            // Add CORS headers (*)
}

function buildDisposition(filename: string, inline: boolean) {
  return `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function buildCommonHeaders(opts: BaseServeOptions, partial: boolean, range?: ParsedRange): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': opts.mimeType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': opts.cacheControl,
    'Content-Disposition': buildDisposition(opts.filename, opts.inline),
    'X-Content-Type-Options': 'nosniff'
  };

  if (partial && range) {
    headers['Content-Range'] = `bytes ${range.start}-${range.end}/${range.total}`;
    headers['Content-Length'] = range.size.toString();
  } else if (!partial) {
    headers['Content-Length'] = opts.size.toString();
  }

  if (opts.cors) {
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Headers'] = 'Range, Content-Type';
    headers['Access-Control-Expose-Headers'] = 'Content-Range, Accept-Ranges, Content-Length';
  }

  return headers;
}

function toNginxInternalPath(absolutePath: string): string {
  const uploadPath = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
  const relativePath = path.relative(uploadPath, absolutePath);
  return `/internal/files/${relativePath.replace(/\\/g, '/')}`;
}

export function createAccelFullResponse(opts: BaseServeOptions): NextResponse {
  const headers = buildCommonHeaders(opts, false);
  const debugEnabled = process.env.DEBUG_ACCEL === '1';
  const uploadRoot = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
  const accelPath = toNginxInternalPath(opts.absolutePath);
  
  // Always use X-Accel-Redirect
  headers['X-Accel-Redirect'] = accelPath;
  headers['X-Accel-Buffering'] = 'no';
  
  if (debugEnabled) {
    headers['X-Debug-Accel-Path'] = accelPath;
    headers['X-Debug-Upload-Root'] = uploadRoot;
    headers['X-Debug-Accel-Status'] = 'enabled';
  }
  return new NextResponse(null, { status: 200, headers });
}

export function createAccelRangeResponse(opts: BaseServeOptions, range: ParsedRange): NextResponse {
  const headers = buildCommonHeaders(opts, true, range);
  const debugEnabled = process.env.DEBUG_ACCEL === '1';
  const uploadRoot = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
  const accelPath = toNginxInternalPath(opts.absolutePath);
  
  // Always use X-Accel-Redirect
  headers['X-Accel-Redirect'] = accelPath;
  headers['X-Accel-Buffering'] = 'no';
  
  if (debugEnabled) {
    headers['X-Debug-Accel-Path'] = accelPath;
    headers['X-Debug-Upload-Root'] = uploadRoot;
    headers['X-Debug-Accel-Status'] = 'enabled';
  }
  return new NextResponse(null, { status: 206, headers });
}

export function createNodeFullResponse(opts: BaseServeOptions): NextResponse {
  const headers = buildCommonHeaders(opts, false);
  const stream = createFileStream(opts.absolutePath);
  return new NextResponse(stream as any, { status: 200, headers });
}

export function createNodeRangeResponse(opts: BaseServeOptions, range: ParsedRange): NextResponse {
  const headers = buildCommonHeaders(opts, true, range);
  const stream = createRangeFileStream(opts.absolutePath, range.start, range.end);
  return new NextResponse(stream as any, { status: 206, headers });
}

export function shouldUseAccel(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.USE_NGINX_DIRECT_SERVE === 'true';
}
