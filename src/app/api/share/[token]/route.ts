import { NextRequest, NextResponse } from 'next/server';
import { getShareByToken, incrementShareAccess } from '@/lib/share-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const share = await getShareByToken(token);
    
    if (!share) {
      return NextResponse.json(
        { error: 'Share not found or expired' },
        { status: 404 }
      );
    }

    // Increment access count
    try {
      await incrementShareAccess(share.id);
    } catch (error) {
      // Log but don't fail the request if access count increment fails
      console.warn('Failed to increment share access count:', error);
    }

    // Prepare response data
    const responseData: any = {
      share: {
        id: share.id,
        accessCount: Number(share.accessCount) + 1,
        maxAccess: share.maxAccess ? Number(share.maxAccess) : share.maxAccess,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt,
      },
      user: share.user,
    };

    if (share.file) {
      // Single file share
      responseData.type = 'file';
      responseData.file = {
        id: share.file.id,
        name: share.file.name,
        originalName: share.file.originalName,
        mimeType: share.file.mimeType,
        size: Number(share.file.size),
      };
    } else if (share.folder) {
      // Folder share
      responseData.type = 'folder';
      responseData.folder = {
        id: share.folder.id,
        name: share.folder.name,
        description: share.folder.description,
        files: share.folder.files.map((file: any) => ({
          id: file.id,
          name: file.name,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: Number(file.size),
        })),
        subfolders: share.folder.children.map((subfolder: any) => ({
          id: subfolder.id,
          name: subfolder.name,
          description: subfolder.description,
          fileCount: subfolder.files.length,
        })),
      };
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get share error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve share' },
      { status: 500 }
    );
  }
}