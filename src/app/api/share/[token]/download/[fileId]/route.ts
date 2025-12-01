import { NextRequest, NextResponse } from 'next/server';
import { getShareByToken, incrementShareAccess } from '@/lib/share-utils';
import { getAbsoluteFilePath, fileExists, getFileStats } from '@/lib/storage';
import { prisma } from '@/lib/db';
import {
  createDirectServeResponse,
  createDirectRangeResponse,
  createFallbackResponse,
  createFallbackRangeResponse,
  shouldUseDirectServing
} from '@/lib/direct-serve';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; fileId: string }> }
) {
  try {
    const { token, fileId } = await params;

    // Try as share token first (most common case)
    const share = await getShareByToken(token);
    
    if (share) {
      // Handle share token
      let file;
      if (share.fileId === fileId) {
        file = share.file;
      } else if (share.folder) {
        file = share.folder.files.find((f: any) => f.id === fileId);
      }

      if (!file) {
        return NextResponse.json(
          { error: 'File not found in share' },
          { status: 404 }
        );
      }

      // Increment share access count
      try {
        await incrementShareAccess(share.id);
      } catch (error) {
        // Log but don't fail the download if access count increment fails
        console.warn('Failed to increment share access count:', error);
      }

      // Get absolute file path and stats
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
        inline: false, // For download (attachment)
        cacheControl: 'no-cache, no-store, must-revalidate'
      };
      
      if (range) {
        // Handle range requests for partial content (resumable downloads)
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        // Always use direct serving with X-Accel-Redirect
        return createDirectRangeResponse(serveOptions, start, end, fileSize);
      } else {
        // Full file download - always use direct serving
        return createDirectServeResponse(serveOptions);
      }
    }
    
    // Fallback: Check if token is a username/slug format for public folders
    if (token.includes('/')) {
      const [username, slug] = token.split('/');
      
      if (!username || !slug) {
        return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
      }

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
          isPublic: true,
          isDeleted: false
        }
      });

      if (!folder) {
        return NextResponse.json({ error: 'Shared folder not found' }, { status: 404 });
      }

      // Find the file in this folder (or subfolders)
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
        }
      });

      if (!file) {
        return NextResponse.json({ error: 'File not found in shared folder' }, { status: 404 });
      }

      // Get absolute file path and stats
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
        inline: false, // For download
        cacheControl: 'no-cache, no-store, must-revalidate'
      };
      
      if (range) {
        // Handle range requests for partial content (resumable downloads)
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        return createDirectRangeResponse(serveOptions, start, end, fileSize);
      } else {
        return createDirectServeResponse(serveOptions);
      }
    }

    // If we get here, token wasn't found
    return NextResponse.json(
      { error: 'Share not found or expired' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Share download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}