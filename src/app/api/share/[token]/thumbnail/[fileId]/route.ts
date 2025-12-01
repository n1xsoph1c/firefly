import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; fileId: string }> }
) {
  try {
    const { token, fileId } = await params;

    // Find the share
    const share = await prisma.share.findUnique({
      where: { token },
      include: {
        user: true,
        file: true,
        folder: {
          include: {
            files: true,
          },
        },
      },
    });

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Check if share is expired
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
    }

    // Check access limits
    if (share.maxAccess && share.accessCount >= share.maxAccess) {
      return NextResponse.json(
        { error: 'Share access limit exceeded' },
        { status: 403 }
      );
    }

    let file;
    if (share.file && share.file.id === fileId) {
      file = share.file;
    } else if (share.folder) {
      file = share.folder.files.find(f => f.id === fileId);
    }

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // For videos, return a placeholder thumbnail or the video stream URL
    if (file.mimeType.startsWith('video/')) {
      // For now, we'll return the video stream URL which browsers can use as a poster
      // In a production environment, you might want to generate actual thumbnails
      const streamUrl = `/api/stream/${token}/${fileId}`;
      
      // Create a simple SVG placeholder for video thumbnails
      const svg = `
        <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)"/>
          <circle cx="600" cy="315" r="60" fill="white" opacity="0.9"/>
          <polygon points="580,285 580,345 640,315" fill="#4F46E5"/>
          <text x="600" y="400" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="white">${file.originalName}</text>
          <text x="600" y="440" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="white" opacity="0.8">Video • ${Math.round(Number(file.size) / (1024 * 1024))} MB</text>
        </svg>
      `;

      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // For images, redirect to the stream endpoint
    if (file.mimeType.startsWith('image/')) {
      return NextResponse.redirect(
        new URL(`/api/stream/${token}/${fileId}`, request.url)
      );
    }

    // For other files, return a generic thumbnail
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#F3F4F6"/>
        <text x="600" y="300" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#374151">📄</text>
        <text x="600" y="360" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#111827">${file.originalName}</text>
        <text x="600" y="390" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="#6B7280">${Math.round(Number(file.size) / 1024)} KB</text>
      </svg>
    `;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Thumbnail error:', error);
    return NextResponse.json(
      { error: 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}