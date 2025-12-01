import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileIds, folderId } = body;
    
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

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'File IDs are required' },
        { status: 400 }
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

    // Verify all files belong to the user
    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId: payload.userId,
      },
    });

    if (files.length !== fileIds.length) {
      return NextResponse.json(
        { error: 'Some files not found' },
        { status: 404 }
      );
    }

    // Move all files
    const updatedFiles = await prisma.file.updateMany({
      where: {
        id: { in: fileIds },
        userId: payload.userId,
      },
      data: {
        folderId: folderId || null, // null moves to root
      },
    });

    return NextResponse.json({
      success: true,
      movedCount: updatedFiles.count,
    });
  } catch (error) {
    console.error('Bulk move files error:', error);
    return NextResponse.json(
      { error: 'Move failed' },
      { status: 500 }
    );
  }
}