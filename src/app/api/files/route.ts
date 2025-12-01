import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { 
  generateUniqueKey, 
  uploadFileToS3, 
  createFileRecord, 
  isValidFileType,
  getFolderPath
} from '@/lib/file-utils';
import { validateFile, sanitizeFilename } from '@/lib/file-validation';
import { storageConfig } from '@/lib/storage';

// Configure route to handle large file uploads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check content length early
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / (1024 * 1024);
      console.log(`Upload request size: ${sizeMB.toFixed(2)} MB`);
      
      // Check against our configured limit (10GB = 10,737,418,240 bytes)
      if (parseInt(contentLength) > storageConfig.maxFileSize) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${storageConfig.maxFileSize / (1024 * 1024 * 1024)}GB` },
          { status: 413 }
        );
      }
    }

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

    // Parse form data with streaming for large files
    let formData: FormData;
    try {
      console.log('Starting FormData parsing...');
      formData = await request.formData();
      console.log('FormData parsing completed successfully');
    } catch (error) {
      console.error('FormData parsing error:', error);
      return NextResponse.json(
        { error: 'Failed to parse form data. File may be too large or network connection interrupted.' },
        { status: 413 }
      );
    }
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Sanitize filename
    const sanitizedName = sanitizeFilename(file.name);

    // Get folder path for S3 if uploading to a folder
    const folderPath = folderId ? await getFolderPath(folderId) : undefined;

    // Generate unique S3 key with folder structure
    const s3Key = await generateUniqueKey(sanitizedName, folderPath);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to file system
    const fileUrl = await uploadFileToS3(buffer, s3Key, file.type); // Actually uses file system now

    // Create database record
    const fileRecord = await createFileRecord(
      payload.userId,
      sanitizedName,
      s3Key,
      fileUrl,
      file.type,
      file.size,
      folderId || undefined,
      description || undefined
    );

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.name,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: Number(fileRecord.size),
        createdAt: fileRecord.createdAt,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
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
    const folderId = searchParams.get('folderId');

    const { prisma } = await import('@/lib/db');
    
    const files = await prisma.file.findMany({
      where: {
        userId: payload.userId,
        folderId: folderId || null,
        isDeleted: false, // Exclude deleted files
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        mimeType: true,
        size: true,
        description: true,
        downloadCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Convert BigInt fields to numbers for JSON serialization
    const serializedFiles = files.map((file: any) => ({
      ...file,
      size: Number(file.size),
      downloadCount: Number(file.downloadCount),
    }));

    return NextResponse.json({ files: serializedFiles });
  } catch (error) {
    console.error('Get files error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve files' },
      { status: 500 }
    );
  }
}