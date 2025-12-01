import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserAuth } from '@/lib/file-access';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Toggle folder public/private status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireUserAuth(request);

    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { isPublic, slug } = await request.json();

    // Verify folder ownership
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        userId: auth.userId,
        isDeleted: false
      }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Generate slug if making public and slug not provided
    let finalSlug = slug;
    if (isPublic && !finalSlug) {
      finalSlug = generateSlug(folder.name);

      // Check if slug already exists for this user
      const existingSlug = await prisma.folder.findFirst({
        where: {
          userId: auth.userId,
          slug: finalSlug,
          id: { not: id }
        }
      });

      if (existingSlug) {
        finalSlug = `${finalSlug}-${Date.now()}`;
      }
    }

    // Update folder
    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        isPublic,
        slug: isPublic ? finalSlug : null
      },
      include: {
        user: {
          select: {
            username: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Generate public URL if folder is now public
    const publicUrl = isPublic && updatedFolder.user.username
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/shared/${updatedFolder.user.username}/${finalSlug}`
      : null;

    return NextResponse.json({
      success: true,
      folder: updatedFolder,
      publicUrl
    });

  } catch (error) {
    console.error('Error toggling folder visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update folder visibility' },
      { status: 500 }
    );
  }
}

// Get folder public status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireUserAuth(request);

    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const folder = await prisma.folder.findFirst({
      where: {
        id,
        userId: auth.userId,
        isDeleted: false
      },
      include: {
        user: {
          select: {
            username: true,
            name: true
          }
        }
      }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const publicUrl = folder.isPublic && folder.user.username && folder.slug
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/shared/${folder.user.username}/${folder.slug}`
      : null;

    return NextResponse.json({
      isPublic: folder.isPublic,
      slug: folder.slug,
      publicUrl
    });

  } catch (error) {
    console.error('Error getting folder status:', error);
    return NextResponse.json(
      { error: 'Failed to get folder status' },
      { status: 500 }
    );
  }
}