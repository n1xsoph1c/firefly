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
    if (!payload || !payload.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get total counts
    const [totalFiles, totalFolders, totalShares] = await Promise.all([
      prisma.file.count(),
      prisma.folder.count(),
      prisma.share.count({ where: { isActive: true } }),
    ]);

    // Get total storage size
    const sizeResult = await prisma.file.aggregate({
      _sum: {
        size: true,
      },
    });
    const totalSize = Number(sizeResult._sum.size || 0);

    // Get files by type
    const files = await prisma.file.findMany({
      select: {
        mimeType: true,
      },
    });

    const filesByType: Record<string, number> = {};
    files.forEach((file: any) => {
      filesByType[file.mimeType] = (filesByType[file.mimeType] || 0) + 1;
    });

    // Get recent uploads (last 10)
    const recentUploads = await prisma.file.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        size: true,
        mimeType: true,
        createdAt: true,
      },
    });

    // Convert BigInt fields to numbers for JSON serialization
    const serializedRecentUploads = recentUploads.map((file: any) => ({
      ...file,
      size: Number(file.size),
    }));

    return NextResponse.json({
      totalFiles,
      totalFolders,
      totalShares,
      totalSize,
      filesByType,
      recentUploads: serializedRecentUploads,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve stats' },
      { status: 500 }
    );
  }
}