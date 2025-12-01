import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeFilesData } from '@/lib/bigint-utils';

interface PageProps {
  params: Promise<{
    username: string;
    slug: string;
  }>;
}

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const { username, slug } = await params;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, name: true, email: true, username: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find public folder by slug
    const folder = await prisma.folder.findFirst({
      where: {
        userId: user.id,
        slug,
        isPublic: true,
        isDeleted: false
      },
      include: {
        files: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true,
            updatedAt: true,
            filePath: true
          }
        },
        children: {
          where: {
            isDeleted: false,
            isPublic: true // Only show public subfolders
          },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            _count: {
              select: {
                files: { where: { isDeleted: false } }
              }
            }
          }
        }
      }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Public folder not found' }, { status: 404 });
    }

    // Return folder contents
    return NextResponse.json({
      type: 'folder',
      user: {
        name: user.name,
        email: user.email,
        username: user.username
      },
      folder: {
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        description: folder.description,
        files: serializeFilesData(folder.files),
        subfolders: folder.children,
        totalFiles: folder.files.length,
        totalSubfolders: folder.children.length
      }
    });

  } catch (error) {
    console.error('Error accessing public folder:', error);
    return NextResponse.json(
      { error: 'Failed to access public folder' },
      { status: 500 }
    );
  }
}