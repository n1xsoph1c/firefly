import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // For system storage, we return the API endpoint for download
    const downloadUrl = `/api/files/${fileId}/download`;

    // Increment download count
    await prisma.file.update({
      where: { id: fileId },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      downloadUrl,
      filename: file.originalName,
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;
    const body = await request.json();
    const { folderId } = body;
    
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

    // Verify file ownership
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: payload.userId,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // If moving to a folder, verify folder ownership
    if (folderId) {
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

    // Update file's folder association
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        folderId: folderId || null, // null moves to root
      },
      include: {
        folder: true,
      },
    });

    return NextResponse.json({
      success: true,
      file: updatedFile,
    });
  } catch (error) {
    console.error('Move file error:', error);
    return NextResponse.json(
      { error: 'Move failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const { deleteFile } = await import('@/lib/file-utils');
    
    const success = await deleteFile(fileId, payload.userId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'File not found or deletion failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500 }
    );
  }
}