import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getFolderPath } from '@/lib/file-utils';
import { ensureUploadDir } from '@/lib/storage';
import path from 'path';

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

    const { name, description, parentId, isPublic, slug } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Validate slug if making public
    if (isPublic && !slug) {
      return NextResponse.json(
        { error: 'URL slug is required for public folders' },
        { status: 400 }
      );
    }

    // Check if slug is unique for this user (if provided)
    if (isPublic && slug) {
      const existingFolder = await prisma.folder.findFirst({
        where: {
          userId: payload.userId,
          slug,
          id: { not: undefined } // Just checking if any folder exists with this slug
        }
      });
      
      if (existingFolder) {
        return NextResponse.json(
          { error: 'This URL slug is already in use. Please choose a different one.' },
          { status: 400 }
        );
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        description,
        parentId,
        userId: payload.userId,
        isPublic: !!isPublic,
        slug: isPublic ? slug : null,
      },
    });

    // Create corresponding folder in file system
    try {
      const folderPath = await getFolderPath(folder.id);
      await ensureUploadDir();
      // Create physical folder structure if needed - folders are created automatically when files are uploaded
    } catch (fsError) {
      console.warn('Failed to prepare folder structure:', fsError);
      // Don't fail the request if folder preparation fails
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
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

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');

    const folders = await prisma.folder.findMany({
      where: {
        userId: payload.userId,
        parentId: parentId || null,
        isDeleted: false, // Exclude deleted folders
      },
      include: {
        _count: {
          select: {
            files: {
              where: { isDeleted: false }
            },
            children: {
              where: { isDeleted: false }
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Get folders error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve folders' },
      { status: 500 }
    );
  }
}