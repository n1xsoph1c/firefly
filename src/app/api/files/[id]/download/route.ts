import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserAuth, getOwnedFileMeta, ensureFileOnDisk } from '@/lib/file-access';
import { parseRangeHeader } from '@/lib/http-range';
import { chooseAdaptiveChunkSize, resolveOpenEndedRange } from '@/lib/transfer-utils';
import {
  createAccelFullResponse,
  createAccelRangeResponse,
  createNodeFullResponse,
  createNodeRangeResponse,
  shouldUseAccel
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

    const disk = await ensureFileOnDisk(file.filePath);
    if (!disk.exists) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    // Increment download count asynchronously
    prisma.file.update({
      where: { id: fileId },
      data: { downloadCount: { increment: 1 } }
    }).catch(console.error);

    const rangeHeader = request.headers.get('range');
    let parsedRange = parseRangeHeader(rangeHeader, file.size, 2 * 1024 * 1024);
    if (parsedRange && /-$/.test(parsedRange.raw.replace(/bytes=/,''))) {
      // Client specified open-ended range (e.g., bytes=START-). Recompute with adaptive size.
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
      inline: false,
      cacheControl: 'no-cache, no-store, must-revalidate',
      cors: true
    } as const;

    // Always use X-Accel-Redirect
    if (parsedRange) {
      return createAccelRangeResponse(baseOpts, parsedRange);
    }
    return createAccelFullResponse(baseOpts);
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}