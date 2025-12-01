import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Shared Folder';
    const description = searchParams.get('description') || 'Shared on Firefly ';
    const username = searchParams.get('username') || 'User';
    const fileCount = searchParams.get('files') || '0';

    // For now, return a simple response that can be used to generate OG images
    // You can integrate with services like Vercel OG or implement image generation

    const ogImageUrl = `/api/og/generate?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&username=${encodeURIComponent(username)}&files=${fileCount}`;

    return NextResponse.json({
      ogImageUrl,
      title,
      description,
      username,
      fileCount
    });

  } catch (error) {
    console.error('Error generating OG image data:', error);
    return NextResponse.json({ error: 'Failed to generate OG data' }, { status: 500 });
  }
}