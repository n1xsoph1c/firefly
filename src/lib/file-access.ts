import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAbsoluteFilePath, fileExists } from '@/lib/storage';
import { downloadTokenStore } from '@/lib/download-tokens';

export interface AuthResult {
  userId: string;
}

export interface FileRecord {
  id: string;
  originalName: string;
  filePath: string;
  size: number; // as number for convenience
  mimeType: string | null;
  userId?: string; // optional when looked up by token
}

export async function requireUserAuth(request: NextRequest): Promise<AuthResult | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return { userId: payload.userId };
}

export async function getOwnedFileMeta(fileId: string, userId: string): Promise<FileRecord | null> {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId },
    select: { id: true, originalName: true, filePath: true, size: true, mimeType: true }
  });
  if (!file) return null;
  return { ...file, size: Number(file.size) };
}

export interface TokenValidationResult {
  file: FileRecord | null;
  error?: string;
}

export async function consumeDownloadToken(token: string): Promise<TokenValidationResult> {
  const data = downloadTokenStore.get(token);
  if (!data || data.expiresAt < Date.now()) {
    return { file: null, error: 'Invalid or expired download token' };
  }
  // one-time use
  downloadTokenStore.delete(token);
  const file = await prisma.file.findFirst({
    where: { id: data.fileId, userId: data.userId },
    select: { id: true, originalName: true, filePath: true, size: true, mimeType: true }
  });
  if (!file) return { file: null, error: 'File not found' };
  return { file: { ...file, size: Number(file.size) } };
}

export interface DiskCheckResult {
  absolutePath: string;
  exists: boolean;
}

export async function ensureFileOnDisk(relativePath: string): Promise<DiskCheckResult> {
  const absolutePath = getAbsoluteFilePath(relativePath);
  const exists = await fileExists(absolutePath);
  return { absolutePath, exists };
}
