import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getAbsoluteFilePath, fileExists } from '@/lib/storage';
import { prisma } from '@/lib/db';
import { downloadTokenStore } from '@/lib/download-tokens';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;
    
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

    // Get file record (quick check)
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: payload.userId,
      },
      select: {
        id: true,
        originalName: true,
        filePath: true,
        size: true,
        mimeType: true,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Quick file existence check
    const absolutePath = getAbsoluteFilePath(file.filePath);
    if (!(await fileExists(absolutePath))) {
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

    // Generate download token
    const downloadToken = crypto.randomUUID();
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
    
    console.log('Creating download token:', downloadToken, 'for file:', fileId, 'user:', payload.userId);
    
    downloadTokenStore.set(downloadToken, {
      fileId,
      userId: payload.userId,
      expiresAt,
    });

    console.log('Token store size after creation:', downloadTokenStore.size());

    // Return immediate response with download URL
    return NextResponse.json({
      downloadToken,
      downloadUrl: `/api/files/download-direct/${downloadToken}`,
      filename: file.originalName,
      size: file.size.toString(),
      mimeType: file.mimeType,
      ready: true, // Indicates download is ready
    });

  } catch (error) {
    console.error('Download preparation error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare download' },
      { status: 500 }
    );
  }
}