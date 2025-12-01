import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserAuth, getOwnedFileMeta, ensureFileOnDisk } from '@/lib/file-access';
import { parseRangeHeader } from '@/lib/http-range';
import { chooseAdaptiveChunkSize, resolveOpenEndedRange } from '@/lib/transfer-utils';
import {
  createAccelRangeResponse,
  createAccelFullResponse
} from '@/lib/file-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fileId = id; // normalize naming
    const auth = await requireUserAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const file = await getOwnedFileMeta(fileId, auth.userId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Only serve video and audio files through this endpoint
    if (!file.mimeType?.startsWith('video/') && !file.mimeType?.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'Not a video or audio file' },
        { status: 400 }
      );
    }

    // NO RATE LIMITING FOR STREAMING - Smooth video playback requires many requests
    // YouTube, Pornhub, etc. don't rate limit streaming for this reason

    const disk = await ensureFileOnDisk(file.filePath);
    if (!disk.exists) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }
    let parsedRange = parseRangeHeader(request.headers.get('range'), file.size, 2 * 1024 * 1024);
    if (parsedRange && /-$/.test(parsedRange.raw.replace(/bytes=/, ''))) {
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
    console.error('Video stream error:', error);
    return NextResponse.json(
      { error: 'Video streaming failed' },
      { status: 500 }
    );
  }
}