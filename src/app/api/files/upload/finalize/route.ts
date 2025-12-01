import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { storageConfig, generateUniqueFilePath, getRelativeFilePath } from '@/lib/storage';
import { createFileRecord } from '@/lib/file-utils';
import { sanitizeFilename } from '@/lib/file-validation';
import uploadSessionManager from '@/lib/upload-session-manager';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { uploadId } = await request.json();

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID required' },
        { status: 400 }
      );
    }

    // Get upload session
    const session = uploadSessionManager.getSession(uploadId);
    if (!session) {
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      );
    }

    // Verify user owns this upload
    if (session.userId !== payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if all chunks received
    if (session.chunks.size !== session.totalChunks) {
      return NextResponse.json(
        { error: `Missing chunks. Received ${session.chunks.size}/${session.totalChunks}` },
        { status: 400 }
      );
    }

    // Combine chunks into final file (optimized for performance)
    const chunksDir = path.join(storageConfig.uploadPath, 'chunks', uploadId);
    const sanitizedName = sanitizeFilename(session.fileName);
    
    // Get folder path if uploading to a folder
    let folderPath: string | undefined;
    if (session.folderId) {
      const { getFolderPath } = await import('@/lib/file-utils');
      folderPath = await getFolderPath(session.folderId);
    }

    // Generate final file path
    const finalFilePath = generateUniqueFilePath(sanitizedName, folderPath);
    
    // Ensure target directory exists
    await fs.mkdir(path.dirname(finalFilePath), { recursive: true });

    // High-performance concatenation using streaming pipeline to avoid large memory footprint.
    await new Promise<void>(async (resolve, reject) => {
      const ws = createWriteStream(finalFilePath, { flags: 'w' });
      let index = 0;
      const appendNext = () => {
        if (index >= session.totalChunks) {
          ws.end();
          return;
        }
        const chunkPath = path.join(chunksDir, `chunk-${index}`);
        const rs = createReadStream(chunkPath);
        rs.on('error', reject);
        rs.on('end', () => {
          index++;
          appendNext();
        });
        rs.pipe(ws, { end: false });
      };
      ws.on('error', reject);
      ws.on('finish', () => resolve());
      appendNext();
    });

    // Verify file size
    const stats = await fs.stat(finalFilePath);
    if (stats.size !== session.fileSize) {
      await fs.unlink(finalFilePath); // Clean up
      return NextResponse.json(
        { error: 'File size mismatch' },
        { status: 400 }
      );
    }

    // Create database record
    const relativePath = getRelativeFilePath(finalFilePath);
    const fileRecord = await createFileRecord(
      session.userId,
      sanitizedName,
      relativePath,
      '', // fileUrl not used anymore
      session.mimeType,
      session.fileSize,
      session.folderId,
      undefined // description
    );

    // Clean up chunks asynchronously (don't wait for this)
    const cleanupPromise = fs.rm(chunksDir, { recursive: true }).catch(error => {
      console.warn('Failed to clean up chunks:', error);
    });

    // Remove upload session
    uploadSessionManager.deleteSession(uploadId);

    // Return response immediately, cleanup continues in background
    const response = NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.name,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: Number(fileRecord.size),
        createdAt: fileRecord.createdAt,
      },
    });

    // Ensure cleanup completes but don't block response
    cleanupPromise.finally(() => {
      console.log(`Cleaned up chunks for upload ${uploadId}`);
    });

    return response;
  } catch (error) {
    console.error('Upload finalize error:', error);
    return NextResponse.json(
      { error: 'Failed to finalize upload' },
      { status: 500 }
    );
  }
}