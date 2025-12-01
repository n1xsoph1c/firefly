import { NextRequest, NextResponse } from 'next/server';
import { requireUserAuth, getOwnedFileMeta, ensureFileOnDisk } from '@/lib/file-access';
import { parseRangeHeader } from '@/lib/http-range';
import { chooseAdaptiveChunkSize, resolveOpenEndedRange } from '@/lib/transfer-utils';
import {
  createAccelFullResponse,
  createAccelRangeResponse
} from '@/lib/file-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;
    const auth = await requireUserAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const file = await getOwnedFileMeta(fileId, auth.userId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // NO RATE LIMITING FOR STREAMING - 4K video requires many rapid requests
    // YouTube, PornHub, etc. don't rate limit streaming for smooth playback
    // Commenting out rate limiting for optimal streaming performance
    
    /*
    // Rate limiting for streaming requests
    if (!streamRateLimiter.isAllowed(payload.userId, fileId)) {
      const remaining = streamRateLimiter.getRemainingRequests(payload.userId, fileId);
      return NextResponse.json(
        { error: 'Too many requests. Please wait before streaming again.' },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': remaining.toString(),
          }
        }
      );
    }

    // Check connection pool
    const connectionCheck = streamConnectionPool.canConnect(payload.userId, fileId);
    if (!connectionCheck.allowed) {
      return NextResponse.json(
        { error: connectionCheck.reason },
        { status: 429 }
      );
    }

    // Add connection to pool for tracking
    const connectionId = streamConnectionPool.addConnection(payload.userId, fileId);
    */

    const disk = await ensureFileOnDisk(file.filePath);
    if (!disk.exists) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }
    let parsedRange = parseRangeHeader(request.headers.get('range'), file.size, 2 * 1024 * 1024);
    if (parsedRange && /-$/.test(parsedRange.raw.replace(/bytes=/,''))) {
      const adaptive = chooseAdaptiveChunkSize({ fileSize: file.size });
      const { start } = parsedRange;
      const resolved = resolveOpenEndedRange(start, file.size, adaptive);
      parsedRange = { ...parsedRange, end: resolved.end, size: (resolved.end - start) + 1 };
    }
    const baseOpts = {
      absolutePath: disk.absolutePath,
      filename: file.originalName,
      mimeType: file.mimeType || 'application/octet-stream',
      size: file.size,
      inline: true,
      cacheControl: 'public, max-age=3600, stale-while-revalidate=86400',
      cors: true
    } as const;
    // Always use X-Accel-Redirect
    if (parsedRange) {
      return createAccelRangeResponse(baseOpts, parsedRange);
    }
    return createAccelFullResponse(baseOpts);
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'Preview failed' },
      { status: 500 }
    );
  }
}