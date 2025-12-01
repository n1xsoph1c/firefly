import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { createShare, getUserShares, generateShareUrl } from '@/lib/share-utils';

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

    const { fileId, folderId, expiresAt, maxAccess } = await request.json();

    if (!fileId && !folderId) {
      return NextResponse.json(
        { error: 'Either fileId or folderId is required' },
        { status: 400 }
      );
    }

    const share = await createShare({
      userId: payload.userId,
      fileId,
      folderId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxAccess,
    });

    const shareUrl = generateShareUrl(share.token);

    return NextResponse.json({
      share: {
        id: share.id,
        token: share.token,
        shareUrl,
        expiresAt: share.expiresAt,
        maxAccess: share.maxAccess ? Number(share.maxAccess) : share.maxAccess,
        accessCount: Number(share.accessCount),
        createdAt: share.createdAt,
      },
    });
  } catch (error) {
    console.error('Create share error:', error);
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    );
  }
}

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

    const shares = await getUserShares(payload.userId);

    const sharesWithUrls = shares.map((share: any) => ({
      ...share,
      shareUrl: generateShareUrl(share.token),
    }));

    return NextResponse.json({ shares: sharesWithUrls });
  } catch (error) {
    console.error('Get shares error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve shares' },
      { status: 500 }
    );
  }
}