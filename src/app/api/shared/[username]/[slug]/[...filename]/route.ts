import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeFilesData } from '@/lib/bigint-utils';
import { getAbsoluteFilePath, fileExists, getFileStats } from '@/lib/storage';
import {
  createDirectServeResponse,
  createDirectRangeResponse
} from '@/lib/direct-serve';

interface PageProps {
  params: Promise<{
    username: string;
    slug: string;
    filename?: string[];
  }>;
}

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const { username, slug, filename } = await params;

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

    // If filename is specified, try to find the specific file
    if (filename && filename.length > 0) {
      const requestedFilename = filename.join('/');
      const file = folder.files.find(f => 
        f.originalName === decodeURIComponent(requestedFilename) || 
        f.name === requestedFilename
      );

      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      // Check if this is a request for file content (image/video preview)
      const url = new URL(request.url);
      const acceptHeader = request.headers.get('accept') || '';
      const isContentRequest = acceptHeader.includes('image/') || 
                             acceptHeader.includes('video/') ||
                             acceptHeader.includes('application/pdf') ||
                             file.mimeType.startsWith('image/') ||
                             file.mimeType.startsWith('video/');

      if (isContentRequest) {
        // Serve file content directly
        const absolutePath = getAbsoluteFilePath(file.filePath);
        
        if (!await fileExists(absolutePath)) {
          return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
        }

        const stats = await getFileStats(absolutePath);
        const fileSize = Number(stats.size);
        
        const range = request.headers.get('range');
        
        const serveOptions = {
          filePath: absolutePath,
          filename: file.originalName,
          mimeType: file.mimeType || 'application/octet-stream',
          size: fileSize,
          inline: true, // Display inline for preview
          cacheControl: 'public, max-age=3600'
        };
        
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          return createDirectRangeResponse(serveOptions, start, end, fileSize);
        } else {
          return createDirectServeResponse(serveOptions);
        }
      }

      // Return file metadata

      return NextResponse.json({
        type: 'file',
        user: {
          name: user.name,
          email: user.email,
          username: user.username
        },
        folder: {
          name: folder.name,
          slug: folder.slug,
          description: folder.description
        },
        file: {
          ...file,
          size: Number(file.size) // Convert BigInt to number
        }
      });
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