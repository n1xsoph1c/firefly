import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getAbsoluteFilePath } from '@/lib/storage';
import { prisma } from '@/lib/db';
import path from 'path';

export async function GET(
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

    // Get file record
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
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get absolute file path
    const absolutePath = getAbsoluteFilePath(file.filePath);
    
    // Generate a temporary direct download URL (for development/local serving)
    // In production, you might want to use signed URLs with your CDN
    const relativePath = path.relative(process.cwd(), absolutePath);
    const directUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    
    // Increment download count asynchronously
    prisma.file.update({
      where: { id: fileId },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    }).catch(console.error);
    
    // Return direct URL for client-side download
    return NextResponse.json({
      downloadUrl: directUrl,
      filename: file.originalName,
      size: file.size.toString(),
    });
    
  } catch (error) {
    console.error('Direct download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}