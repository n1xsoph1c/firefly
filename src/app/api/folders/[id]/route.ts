import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    
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

    // Check if folder exists and belongs to user
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: payload.userId,
        isDeleted: false, // Only non-deleted folders
      },
      include: {
        files: {
          where: { isDeleted: false }
        },
        children: {
          where: { isDeleted: false }
        },
      },
    });

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Check if folder is empty
    if (folder.files.length > 0 || folder.children.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder that contains files or subfolders' },
        { status: 400 }
      );
    }

    // Move to trash instead of permanent deletion
    await prisma.folder.update({
      where: { id: folderId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}