import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import uploadSessionManager from '@/lib/upload-session-manager';

// GET /api/files/upload/status?uploadId=...
// Returns which chunks are already present so client can resume.
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const uploadId = request.nextUrl.searchParams.get('uploadId');
    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId required' }, { status: 400 });
    }
    const session = uploadSessionManager.getSession(uploadId);
    if (!session) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    if (session.userId !== payload.userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      uploadId,
      fileName: session.fileName,
      fileSize: session.fileSize,
      totalChunks: session.totalChunks,
      uploadedChunks: Array.from(session.chunks.values()).sort((a,b)=>a-b)
    });
  } catch (err) {
    console.error('Upload status error', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}