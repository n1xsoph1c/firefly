import {
  generateUniqueFilePath,
  saveFileToStorage,
  deleteFileFromStorage,
  getRelativeFilePath,
  getAbsoluteFilePath,
  storageConfig
} from './storage';
import { prisma } from './db';
import crypto from 'crypto';
import path from 'path';

export interface UploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
}

export async function getFolderPath(folderId: string): Promise<string> {
  if (!folderId) return '';

  const path: string[] = [];
  let currentFolderId = folderId;
  let depth = 0;
  const MAX_DEPTH = 20; // Prevent infinite loops from circular references

  while (currentFolderId && depth < MAX_DEPTH) {
    const folder = await prisma.folder.findUnique({
      where: { id: currentFolderId },
      select: { name: true, parentId: true }
    });

    if (!folder) break;

    path.unshift(folder.name);
    currentFolderId = folder.parentId || '';
    depth++;
  }

  if (depth >= MAX_DEPTH) {
    console.error(`Maximum folder depth exceeded for folderId: ${folderId}`);
    throw new Error('Folder hierarchy too deep');
  }

  return path.join('/');
}

export async function generateUniqueKey(originalName: string, folderPath?: string): Promise<string> {
  // Generate absolute path using the storage function
  const absolutePath = generateUniqueFilePath(originalName, folderPath);
  // Return the relative path for database storage
  return getRelativeFilePath(absolutePath);
}

export async function uploadFileToS3(
  buffer: Buffer,
  relativeKey: string,
  mimeType: string
): Promise<string> {
  // This function name is kept for compatibility, but now uses system storage
  // Convert relative key to absolute path
  const absolutePath = path.isAbsolute(relativeKey)
    ? relativeKey
    : path.join(storageConfig.uploadPath, relativeKey);

  await saveFileToStorage(buffer, absolutePath);
  return getRelativeFilePath(absolutePath);
}

export async function deleteFileFromS3(key: string): Promise<void> {
  // This function name is kept for compatibility, but now uses system storage
  const absolutePath = getAbsoluteFilePath(key);
  await deleteFileFromStorage(absolutePath);
}

export async function createFileRecord(
  userId: string,
  originalName: string,
  fileKey: string,
  fileUrl: string, // Not used anymore, kept for compatibility
  mimeType: string,
  size: number,
  folderId?: string,
  description?: string
) {
  return prisma.file.create({
    data: {
      name: originalName.split('.')[0],
      originalName,
      mimeType,
      size: BigInt(size),
      filePath: fileKey, // Store relative file path instead of S3 key
      userId,
      folderId,
      description,
    },
  });
}

export async function deleteFile(fileId: string, userId: string): Promise<boolean> {
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  });

  if (!file) {
    return false;
  }

  try {
    // Delete from file system
    await deleteFileFromS3(file.filePath); // Uses system storage now

    // Delete from database
    await prisma.file.delete({
      where: { id: fileId },
    });

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

export function isValidFileType(mimeType: string): boolean {
  return storageConfig.allowedMimeTypes.includes(mimeType);
}

export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}