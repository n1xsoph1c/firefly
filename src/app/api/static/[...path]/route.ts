import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { storageConfig } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = path.join(storageConfig.uploadPath, ...pathSegments);
    
    // Security check: ensure file is within uploads directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadPath = path.resolve(storageConfig.uploadPath);
    
    if (!resolvedPath.startsWith(resolvedUploadPath)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Get file stats
    const stats = fs.statSync(resolvedPath);
    
    // Create file stream
    const fileStream = fs.createReadStream(resolvedPath);
    
    // Convert Node.js stream to ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk: any) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          controller.enqueue(new Uint8Array(buffer));
        });
        
        fileStream.on('end', () => {
          controller.close();
        });
        
        fileStream.on('error', (error) => {
          controller.error(error);
        });
      },
      cancel() {
        fileStream.destroy();
      },
    });
    
    // Determine content type based on file extension
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'X-Content-Type-Options': 'nosniff',
      },
    });
    
  } catch (error) {
    console.error('Static file serving error:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}