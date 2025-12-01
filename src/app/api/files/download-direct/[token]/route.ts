import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { consumeDownloadToken, ensureFileOnDisk } from '@/lib/file-access';
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
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    const { file, error } = await consumeDownloadToken(token);
    if (!file) {
      return NextResponse.json({ error: error || 'Invalid token' }, { status: 401 });
    }

    const disk = await ensureFileOnDisk(file.filePath);
    if (!disk.exists) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    // Increment download count async
    prisma.file.update({
      where: { id: file.id },
      data: { downloadCount: { increment: 1 } }
    }).catch(console.error);

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
      inline: false,
      cacheControl: 'no-cache, no-store, must-revalidate',
      cors: true
    } as const;
    const useAccel = shouldUseAccel();
    if (parsedRange) {
      return useAccel ? createAccelRangeResponse(baseOpts, parsedRange) : createNodeRangeResponse(baseOpts, parsedRange);
    }
    return useAccel ? createAccelFullResponse(baseOpts) : createNodeFullResponse(baseOpts);
    
  } catch (error) {
    console.error('Direct download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}