import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Storage configuration
export const storageConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '53687091200'), // 50GB default (increased from 10GB)
  uploadPath: process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads'),
  allowedMimeTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/quicktime',
    'video/x-quicktime', // Additional QuickTime format
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/x-msvideo', // Additional AVI format
    'video/3gpp',      // 3GP format
    'video/x-ms-wmv',  // Additional WMV format
    'video/mp2t',      // MPEG-2 Transport Stream
    'video/x-m4v',     // M4V format
    'application/pdf',
    'image/jpeg',
    'image/jpg',       // Sometimes browsers use .jpg
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',   // SVG images
    // Archive formats
    'application/x-rar-compressed', // RAR files
    'application/vnd.rar',          // RAR (official MIME type)
    'application/x-rar',            // RAR (alternative)
    'application/zip',              // ZIP files
    'application/x-zip-compressed', // ZIP (alternative)
    'application/x-7z-compressed',  // 7z files
    'application/x-tar',            // TAR files
    'application/gzip',             // GZIP files
    'application/x-gzip',           // GZIP (alternative)
  ],
};

// Ensure upload directory exists
export async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(storageConfig.uploadPath);
  } catch {
    await fs.mkdir(storageConfig.uploadPath, { recursive: true });
  }
}

// Strict path validation to prevent traversal attacks
function validatePath(targetPath: string): boolean {
  try {
    // Check for null bytes
    if (targetPath.includes('\0')) {
      console.error('Path contains null byte');
      return false;
    }

    // Normalize and resolve to absolute path
    const normalized = path.normalize(targetPath);
    const resolved = path.resolve(normalized);
    const uploadDir = path.resolve(storageConfig.uploadPath);

    // Ensure the resolved path is within the upload directory
    if (!resolved.startsWith(uploadDir)) {
      console.error(`Path traversal attempt detected: ${targetPath}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Path validation error:', error);
    return false;
  }
}

// Generate unique file path
export function generateUniqueFilePath(originalName: string, folderPath?: string): string {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  const uniqueId = crypto.randomUUID().substring(0, 8);

  const fileName = `${nameWithoutExt}-${uniqueId}${ext}`;

  if (folderPath) {
    // Strictly sanitize folder path to prevent traversal
    const sanitizedFolderPath = folderPath
      .replace(/\0/g, '') // Remove null bytes
      .replace(/\\.\\./g, '') // Remove parent directory references
      .replace(/[^a-zA-Z0-9\-_\/]/g, '') // Allow only safe characters
      .split('/')
      .filter(segment => segment && segment !== '.' && segment !== '..') // Remove empty and dangerous segments
      .join('/');

    // Validate the resulting path doesn't escape upload directory
    const targetPath = path.join(storageConfig.uploadPath, 'folders', sanitizedFolderPath, fileName);

    if (!validatePath(targetPath)) {
      throw new Error('Invalid folder path - potential security violation');
    }

    return targetPath;
  }

  return path.join(storageConfig.uploadPath, 'files', fileName);
}

// Save file to system storage
export async function saveFileToStorage(
  buffer: Buffer,
  filePath: string
): Promise<string> {
  await ensureUploadDir();

  // Validate path before writing
  if (!validatePath(filePath)) {
    throw new Error('Invalid file path - security violation');
  }

  // Ensure directory exists
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  // Write file
  await fs.writeFile(filePath, buffer);

  return filePath;
}

// Delete file from system storage
export async function deleteFileFromStorage(filePath: string): Promise<void> {
  try {
    // Validate path before deleting
    if (!validatePath(filePath)) {
      console.error('Invalid file path for deletion - security violation');
      return;
    }

    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw error if file doesn't exist
  }
}

// Get file from system storage (for small files)
export async function getFileFromStorage(filePath: string): Promise<Buffer> {
  // Validate path before reading
  if (!validatePath(filePath)) {
    throw new Error('Invalid file path - security violation');
  }

  const stats = await fs.stat(filePath);

  // For files larger than 100MB, don't use this function - use streaming instead
  if (stats.size > 100 * 1024 * 1024) {
    throw new Error('File too large for buffer operation. Use streaming instead.');
  }

  return await fs.readFile(filePath);
}

// Create readable stream for files using Node.js streams (optimized for 4K streaming)
export function createFileStream(filePath: string): ReadableStream<Uint8Array> {
  const fs = require('fs');
  const stat = fs.statSync(filePath);
  // Adaptive sizing: larger files get larger internal buffer to reduce syscalls.
  const size = stat.size;
  let highWaterMark = 2 * 1024 * 1024; // default 2MB
  if (size > 20 * 1024 * 1024 * 1024) highWaterMark = 4 * 1024 * 1024; // >20GB -> 4MB
  else if (size > 5 * 1024 * 1024 * 1024) highWaterMark = 3 * 1024 * 1024; // >5GB -> 3MB
  else if (size > 512 * 1024 * 1024) highWaterMark = 2 * 1024 * 1024; // >512MB keep 2MB

  return new ReadableStream({
    start(controller) {
      const nodeStream = fs.createReadStream(filePath, { highWaterMark });

      let isClosed = false;

      nodeStream.on('data', (chunk: Buffer) => {
        if (!isClosed) {
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch (error) {
            if (!isClosed) {
              isClosed = true;
              nodeStream.destroy();
            }
          }
        }
      });

      nodeStream.on('end', () => {
        if (!isClosed) {
          isClosed = true;
          controller.close();
        }
      });

      nodeStream.on('error', (error: Error) => {
        if (!isClosed) {
          isClosed = true;
          controller.error(error);
        }
      });

      nodeStream.on('close', () => {
        if (!isClosed) {
          isClosed = true;
          controller.close();
        }
      });
    },

    cancel() {
      // Cleanup if stream is cancelled
    }
  });
}

// Create readable stream for range requests (partial content) - optimized for 4K
export function createRangeFileStream(filePath: string, start: number, end: number): ReadableStream<Uint8Array> {
  const fs = require('fs');
  const span = (end - start) + 1;
  // Adaptive: choose buffer up to 2MB but not exceeding span for small final chunks
  let highWaterMark = 1 * 1024 * 1024;
  if (span > 3 * 1024 * 1024) highWaterMark = 2 * 1024 * 1024;
  else if (span > 2 * 1024 * 1024) highWaterMark = 1.5 * 1024 * 1024; // ~1.5MB

  return new ReadableStream({
    start(controller) {
      const nodeStream = fs.createReadStream(filePath, {
        start,
        end,
        // Cast to int (node requires integer highWaterMark)
        highWaterMark: Math.floor(highWaterMark),
      });

      let isClosed = false;

      nodeStream.on('data', (chunk: Buffer) => {
        if (!isClosed) {
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch (error) {
            if (!isClosed) {
              isClosed = true;
              nodeStream.destroy();
            }
          }
        }
      });

      nodeStream.on('end', () => {
        if (!isClosed) {
          isClosed = true;
          controller.close();
        }
      });

      nodeStream.on('error', (error: Error) => {
        if (!isClosed) {
          isClosed = true;
          controller.error(error);
        }
      });

      nodeStream.on('close', () => {
        if (!isClosed) {
          isClosed = true;
          controller.close();
        }
      });
    },

    cancel() {
      // Cleanup if stream is cancelled
    }
  });
}

// Check if file exists
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Get file stats
export async function getFileStats(filePath: string) {
  return await fs.stat(filePath);
}

// Convert file path to relative path for storage in database
export function getRelativeFilePath(absolutePath: string): string {
  return path.relative(storageConfig.uploadPath, absolutePath);
}

// Convert relative path to absolute path
export function getAbsoluteFilePath(relativePath: string): string {
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = relativePath.replace(/\\/g, '/');

  // Join with upload path
  const absolutePath = path.join(storageConfig.uploadPath, normalizedPath);

  // Validate the resulting path
  if (!validatePath(absolutePath)) {
    throw new Error('Invalid file path - potential path traversal');
  }

  return absolutePath;
}