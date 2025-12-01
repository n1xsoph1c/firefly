import { NextRequest, NextResponse } from 'next/server';
import { getShareByToken } from '@/lib/share-utils';
import { getAbsoluteFilePath, fileExists, getFileStats } from '@/lib/storage';
import {
  createDirectServeResponse,
  createDirectRangeResponse
} from '@/lib/direct-serve';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; fileId: string }> }
) {
  try {
    const { token, fileId } = await params;

    // Get share by token
    const share = await getShareByToken(token);
    
    if (!share) {
      return NextResponse.json(
        { error: 'Share not found or expired' },
        { status: 404 }
      );
    }

    let file = null;

    // Check if this is a file share or folder share
    if (share.file && share.file.id === fileId) {
      // Direct file share
      file = share.file;
    } else if (share.folder) {
      // Find file in shared folder
      file = share.folder.files.find((f: any) => f.id === fileId);
      
      // If not found in main folder, check subfolders
      if (!file) {
        for (const subfolder of share.folder.children || []) {
          file = subfolder.files.find((f: any) => f.id === fileId);
          if (file) break;
        }
      }
    }

    if (!file) {
      return NextResponse.json(
        { error: 'File not found in share' },
        { status: 404 }
      );
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
    const fileSize = Number(stats.size);
    
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
    console.error('Share stream error:', error);
    return NextResponse.json(
      { error: 'Streaming failed' },
      { status: 500 }
    );
  }
}