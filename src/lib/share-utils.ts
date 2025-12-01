import { prisma } from './db';
import crypto from 'crypto';

export interface CreateShareOptions {
  userId: string;
  fileId?: string;
  folderId?: string;
  expiresAt?: Date;
  maxAccess?: number;
}

export async function createShare(options: CreateShareOptions) {
  const token = crypto.randomBytes(32).toString('hex');

  return prisma.share.create({
    data: {
      token,
      userId: options.userId,
      fileId: options.fileId,
      folderId: options.folderId,
      expiresAt: options.expiresAt,
      maxAccess: options.maxAccess,
    },
  });
}

export async function getShareByToken(token: string) {
  const share = await prisma.share.findUnique({
    where: { token },
    include: {
      file: true,
      folder: {
        include: {
          files: {
            take: 100, // Limit files to prevent DoS
          },
          children: {
            take: 50, // Limit subfolders to prevent DoS
            include: {
              files: {
                take: 20, // Limit nested files
              },
            },
          },
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!share) {
    return null;
  }

  // Check if share is still valid
  if (!share.isActive) {
    return null;
  }

  if (share.expiresAt && new Date() > share.expiresAt) {
    return null;
  }

  // Use transaction to atomically check and increment access count (prevent race condition)
  if (share.maxAccess && share.accessCount >= share.maxAccess) {
    return null;
  }

  return share;
}

export async function incrementShareAccess(shareId: string) {
  try {
    // Use transaction to ensure atomic increment
    return await prisma.$transaction(async (tx) => {
      const share = await tx.share.findUnique({
        where: { id: shareId },
        select: { accessCount: true, maxAccess: true },
      });

      if (!share) {
        return null;
      }

      // Double-check access limit within transaction
      if (share.maxAccess && share.accessCount >= share.maxAccess) {
        return null;
      }

      return await tx.share.update({
        where: { id: shareId },
        data: {
          accessCount: {
            increment: 1,
          },
        },
      });
    });
  } catch (error) {
    // If share is not found, log the error but don't fail the request
    console.warn(`Failed to increment share access count for shareId: ${shareId}`, error);
    return null;
  }
}

export async function revokeShare(shareId: string, userId: string) {
  return prisma.share.updateMany({
    where: {
      id: shareId,
      userId,
    },
    data: {
      isActive: false,
    },
  });
}

export async function getUserShares(userId: string) {
  const shares = await prisma.share.findMany({
    where: { userId },
    include: {
      file: {
        select: {
          name: true,
          originalName: true,
          mimeType: true,
          size: true,
        },
      },
      folder: {
        select: {
          name: true,
          description: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Convert BigInt fields to numbers for JSON serialization
  return shares.map((share: any) => ({
    ...share,
    accessCount: Number(share.accessCount),
    maxAccess: share.maxAccess ? Number(share.maxAccess) : share.maxAccess,
    file: share.file ? {
      ...share.file,
      size: Number(share.file.size),
    } : share.file,
  }));
}

export function generateShareUrl(token: string): string {
  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;

  if (!baseUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('APP_URL or NEXTAUTH_URL must be set in production');
    }
    // Only use fallback in development
    return `http://localhost:3000/share/${token}`;
  }

  return `${baseUrl}/share/${token}`;
}