import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(
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

    const { prisma } = await import('@/lib/db');

    // Build the breadcrumb path by traversing up the folder hierarchy
    const path = [];
    let currentFolder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: payload.userId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    });

    if (!currentFolder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Add the current folder to the path
    path.unshift({
      id: currentFolder.id,
      name: currentFolder.name,
    });

    // Traverse up the hierarchy
    while (currentFolder?.parentId) {
      const parentFolder: { id: string; name: string; parentId: string | null } | null = await prisma.folder.findFirst({
        where: {
          id: currentFolder.parentId,
          userId: payload.userId,
        },
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      });

      if (parentFolder) {
        path.unshift({
          id: parentFolder.id,
          name: parentFolder.name,
        });
        currentFolder = parentFolder;
      } else {
        break;
      }
    }

    return NextResponse.json({ path });
  } catch (error) {
    console.error('Get folder path error:', error);
    return NextResponse.json(
      { error: 'Failed to get folder path' },
      { status: 500 }
    );
  }
}