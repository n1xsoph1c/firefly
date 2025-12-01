import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
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

    // Get user's files to calculate storage usage (excluding deleted files)
    const userFiles = await prisma.file.findMany({
      where: {
        userId: payload.userId,
        isDeleted: false,
      },
      select: {
        size: true,
      },
    });

    // Calculate total storage usage by summing BigInt values
    const usedStorage = userFiles.reduce((total, file) => {
      return total + Number(file.size);
    }, 0);
    
    const fileCount = userFiles.length;

    // Get storage limit from environment or default to 250GB
    const storageLimit = parseInt(process.env.STORAGE_LIMIT_BYTES || '268435456000'); // 250GB default

    // Calculate usage percentage
    const usagePercentage = (usedStorage / storageLimit) * 100;

    // Get folder count (excluding deleted folders)
    const folderCount = await prisma.folder.count({
      where: {
        userId: payload.userId,
        isDeleted: false,
      },
    });

    // Get trash counts
    const trashFiles = await prisma.file.count({
      where: {
        userId: payload.userId,
        isDeleted: true,
      },
    });

    const trashFolders = await prisma.folder.count({
      where: {
        userId: payload.userId,
        isDeleted: true,
      },
    });

    return NextResponse.json({
      usedStorage,
      storageLimit,
      usagePercentage,
      fileCount,
      folderCount,
      trash: {
        files: trashFiles,
        folders: trashFolders,
      },
    });
  } catch (error) {
    console.error('Storage usage error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve storage usage' },
      { status: 500 }
    );
  }
}