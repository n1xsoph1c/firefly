import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';
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

    const body = await request.json();
    const { fileName, fileSize, mimeType, totalChunks, folderId } = body;

    // Validate input
    if (!fileName || !fileSize || !mimeType || !totalChunks) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate fileName doesn't contain path separators
    if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('\0')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Validate totalChunks bounds (prevent DoS)
    if (totalChunks < 1 || totalChunks > 10000) {
      return NextResponse.json(
        { error: 'Invalid chunk count. Must be between 1 and 10000.' },
        { status: 400 }
      );
    }

    // Check file size limit
    const maxSize = 60 * 1024 * 1024 * 1024; // 60GB
    if (fileSize > maxSize || fileSize < 1) {
      return NextResponse.json(
        { error: 'File too large. Maximum file size is 60GB.' },
        { status: 413 }
      );
    }

    // If uploading to a folder, verify folder ownership (IDOR protection)
    if (folderId) {
      const { prisma } = await import('@/lib/db');
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: payload.userId,
        },
      });

      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }
    }

    // Check user storage quota
    const { prisma } = await import('@/lib/db');
    const userFiles = await prisma.file.findMany({
      where: { userId: payload.userId },
      select: { size: true },
    });

    const currentUsage = userFiles.reduce((sum, file) => sum + Number(file.size), 0);
    const storageLimit = parseInt(process.env.STORAGE_LIMIT_BYTES || '268435456000'); // 250GB default

    if (currentUsage + fileSize > storageLimit) {
      return NextResponse.json(
        { error: 'Storage quota exceeded' },
        { status: 507 } // Insufficient Storage
      );
    }

    // Generate unique upload ID
    const uploadId = crypto.randomUUID();

    // Store upload session
    uploadSessionManager.createSession(uploadId, {
      uploadId,
      fileName,
      fileSize,
      mimeType,
      totalChunks,
      folderId,
      userId: payload.userId,
    });

    return NextResponse.json({ uploadId });
  } catch (error) {
    console.error('Upload init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize upload' },
      { status: 500 }
    );
  }
}