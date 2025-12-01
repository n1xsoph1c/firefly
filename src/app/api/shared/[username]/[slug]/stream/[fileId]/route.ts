import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAbsoluteFilePath, fileExists, getFileStats } from '@/lib/storage';
import {
  createDirectServeResponse,
  createDirectRangeResponse
} from '@/lib/direct-serve';

interface StreamParams {
  params: Promise<{
    username: string;
    slug: string;
    fileId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: StreamParams) {
  try {
    const { username, slug, fileId } = await params;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find public folder by slug
    const folder = await prisma.folder.findFirst({
      where: {
        userId: user.id,
        slug,
        isPublic: true,
        isDeleted: false
      }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Public folder not found' }, { status: 404 });
    }

    // Find the file in this folder or its subfolders
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        isDeleted: false,
        OR: [
          { folderId: folder.id },
          {
            folder: {
              parentId: folder.id,
              isDeleted: false,
              isPublic: true
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        mimeType: true,
        size: true,
        filePath: true
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

    // Get file stats
    const stats = await getFileStats(absolutePath);
    const fileSize = Number(file.size);
    
    // Handle range requests for video streaming
    const range = request.headers.get('range');
    
    // Prepare options for direct serving
    const serveOptions = {
      filePath: absolutePath,
      filename: file.originalName,
      mimeType: file.mimeType || 'application/octet-stream',
      size: fileSize,
      inline: true, // For streaming/preview
      cacheControl: 'public, max-age=3600'
    };
    
    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      // Use larger chunks for better performance
      let end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + (8 * 1024 * 1024), fileSize - 1);
      
      // Don't exceed file size
      end = Math.min(end, fileSize - 1);

      return createDirectRangeResponse(serveOptions, start, end, fileSize);
    } else {
      return createDirectServeResponse(serveOptions);
    }
  } catch (error) {
    console.error('Shared folder stream error:', error);
    return NextResponse.json(
      { error: 'Streaming failed' },
      { status: 500 }
    );
  }
}