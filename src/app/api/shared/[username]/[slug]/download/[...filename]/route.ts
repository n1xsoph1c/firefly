import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAbsoluteFilePath, fileExists, getFileStats } from '@/lib/storage';
import {
  createDirectServeResponse,
  createDirectRangeResponse
} from '@/lib/direct-serve';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; slug: string; filename: string[] }> }
) {
  try {
    const { username, slug, filename } = await params;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the public folder
    const folder = await prisma.folder.findFirst({
      where: {
        userId: user.id,
        slug,
        isPublic: true
      }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Shared folder not found' }, { status: 404 });
    }

    // Get the requested filename (join the array back to a string)
    const requestedFilename = filename.join('/');

    // Find the file by original name in this folder (or subfolders)
    const file = await prisma.file.findFirst({
      where: {
        originalName: requestedFilename,
        folder: {
          OR: [
            { id: folder.id },
            { parentId: folder.id }
          ]
        }
      }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found in shared folder' }, { status: 404 });
    }

    // Get absolute file path
    const absolutePath = getAbsoluteFilePath(file.filePath);
    
    // Check if file exists
    if (!await fileExists(absolutePath)) {
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

    const stats = await getFileStats(absolutePath);
    const fileSize = Number(stats.size);
    
    // Handle range requests for resumable downloads
    const range = request.headers.get('range');
    
    // Prepare options for direct serving
    const serveOptions = {
      filePath: absolutePath,
      filename: file.originalName,
      mimeType: file.mimeType || 'application/octet-stream',
      size: fileSize,
      inline: false, // Force download
      cacheControl: 'public, max-age=3600'
    };
    
    if (range) {
      // Handle range requests for partial content
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      return createDirectRangeResponse(serveOptions, start, end, fileSize);
    } else {
      // Full file download
      return createDirectServeResponse(serveOptions);
    }
  } catch (error) {
    console.error('Shared folder download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}