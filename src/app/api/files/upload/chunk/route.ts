import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import { storageConfig } from '@/lib/storage';
import uploadSessionManager from '@/lib/upload-session-manager';
import { Readable } from 'stream';
import { createWriteStream } from 'fs';

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

    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);

    if (!chunk || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate chunk index bounds (prevent negative index or out-of-range attacks)
    if (chunkIndex < 0 || chunkIndex >= totalChunks || totalChunks < 1 || totalChunks > 10000) {
      return NextResponse.json(
        { error: 'Invalid chunk index or total chunks' },
        { status: 400 }
      );
    }

    // Validate chunk size (max 100MB per chunk to prevent DoS)
    const maxChunkSize = 100 * 1024 * 1024; // 100MB
    if (chunk.size > maxChunkSize || chunk.size < 1) {
      return NextResponse.json(
        { error: 'Invalid chunk size. Maximum is 100MB.' },
        { status: 413 }
      );
    }

    // Get upload session
    const session = uploadSessionManager.getSession(uploadId);
    if (!session) {
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      );
    }

    // Verify user owns this upload
    if (session.userId !== payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Create chunks directory
    const chunksDir = path.join(storageConfig.uploadPath, 'chunks', uploadId);
    await fs.mkdir(chunksDir, { recursive: true });

    // Save chunk
    const chunkPath = path.join(chunksDir, `chunk-${chunkIndex}`);
    // Stream the uploaded chunk to disk to avoid buffering large files fully in memory.
    // File from FormData (Web API File) -> ArrayBuffer read still required by Next runtime currently.
    // Future optimization: when Edge/runtime supports streaming form-data parts, pipe directly.
    const arrayBuf = await chunk.arrayBuffer();
    const nodeReadable = Readable.from(Buffer.from(arrayBuf));
    await new Promise<void>((resolve, reject) => {
      const ws = createWriteStream(chunkPath, { flags: 'w' });
      nodeReadable.pipe(ws);
      ws.on('finish', resolve);
      ws.on('error', reject);
      nodeReadable.on('error', reject);
    });

    // Mark chunk as received
    uploadSessionManager.addChunk(uploadId, chunkIndex);

    return NextResponse.json({
      success: true,
      receivedChunks: session.chunks.size,
      totalChunks: session.totalChunks,
      // Provide hint for client adaptive parallelism if desired later
      recommendedParallel: 4
    });
  } catch (error) {
    console.error('Chunk upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload chunk' },
      { status: 500 }
    );
  }
}