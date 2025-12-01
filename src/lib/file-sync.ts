import fs from 'fs/promises';
import path from 'path';
import { prisma } from './db';
import { storageConfig, getRelativeFilePath } from './storage';
import { detectMimeType } from './mime-detector';

/**
 * File Sync Service
 * Handles syncing file system changes to the database
 */

let defaultUserId: string | null = null;

/**
 * Get the default user ID (admin user) for synced files
 */
async function getDefaultUserId(): Promise<string> {
    if (defaultUserId) {
        return defaultUserId;
    }

    // Find the admin user
    const adminUser = await prisma.user.findFirst({
        where: { isAdmin: true },
        select: { id: true },
    });

    if (!adminUser) {
        throw new Error('No admin user found. Please create an admin user first.');
    }

    defaultUserId = adminUser.id;
    return defaultUserId;
}

/**
 * Get or create folder hierarchy from file system path
 * @param fsPath - File system path relative to UPLOAD_PATH (e.g., "mac/anotherFolder")
 * @param userId - User ID to assign folders to
 * @returns Folder ID of the deepest folder
 */
async function getOrCreateFolderHierarchy(
    fsPath: string,
    userId: string
): Promise<string | null> {
    if (!fsPath || fsPath === '.') {
        return null;
    }

    // Split path into segments
    const segments = fsPath.split(path.sep).filter(s => s && s !== '.');

    if (segments.length === 0) {
        return null;
    }

    let parentId: string | null = null;
    let currentPath = '';

    for (const segment of segments) {
        currentPath = currentPath ? path.join(currentPath, segment) : segment;

        // Check if folder already exists
        let folder = await prisma.folder.findFirst({
            where: {
                userId,
                fsPath: currentPath,
            },
        });

        // Create folder if it doesn't exist
        if (!folder) {
            console.log(`[FileSync] Creating folder: ${currentPath}`);
            folder = await prisma.folder.create({
                data: {
                    name: segment,
                    userId,
                    parentId,
                    fsPath: currentPath,
                    isPublic: false, // Synced folders are private by default
                },
            });
        }

        parentId = folder.id;
    }

    return parentId;
}

/**
 * Sync a file to the database
 * @param absolutePath - Absolute file system path
 */
export async function syncFile(absolutePath: string): Promise<void> {
    try {
        // Get file stats
        const stats = await fs.stat(absolutePath);

        if (!stats.isFile()) {
            return; // Skip if not a file
        }

        // Get relative path from UPLOAD_PATH
        const relativePath = getRelativeFilePath(absolutePath);

        // Check if file already exists in database
        const existingFile = await prisma.file.findUnique({
            where: { filePath: relativePath },
        });

        if (existingFile) {
            console.log(`[FileSync] File already synced: ${relativePath}`);
            return;
        }

        // Get user ID
        const userId = await getDefaultUserId();

        // Extract folder path and file name
        const dirPath = path.dirname(relativePath);
        const fileName = path.basename(absolutePath);
        const nameWithoutExt = path.basename(fileName, path.extname(fileName));

        // Get or create folder hierarchy
        let folderId: string | null = null;
        if (dirPath && dirPath !== '.') {
            folderId = await getOrCreateFolderHierarchy(dirPath, userId);
        }

        // Detect MIME type
        const mimeType = detectMimeType(absolutePath);

        // Create file record
        console.log(`[FileSync] Syncing file: ${relativePath}`);
        await prisma.file.create({
            data: {
                name: nameWithoutExt,
                originalName: fileName,
                mimeType,
                size: BigInt(stats.size),
                filePath: relativePath,
                userId,
                folderId,
                syncSource: 'sync',
                isPublic: false, // Synced files are private by default
            },
        });

        console.log(`[FileSync] ✓ File synced successfully: ${relativePath}`);
    } catch (error) {
        console.error(`[FileSync] Error syncing file ${absolutePath}:`, error);
    }
}

/**
 * Sync a folder to the database
 * @param absolutePath - Absolute folder path
 */
export async function syncFolder(absolutePath: string): Promise<void> {
    try {
        const stats = await fs.stat(absolutePath);

        if (!stats.isDirectory()) {
            return;
        }

        // Get relative path from UPLOAD_PATH
        const relativePath = getRelativeFilePath(absolutePath);

        if (!relativePath || relativePath === '.') {
            return; // Skip root folder
        }

        // Get user ID
        const userId = await getDefaultUserId();

        // Create folder hierarchy
        await getOrCreateFolderHierarchy(relativePath, userId);

        console.log(`[FileSync] ✓ Folder synced: ${relativePath}`);
    } catch (error) {
        console.error(`[FileSync] Error syncing folder ${absolutePath}:`, error);
    }
}

/**
 * Handle file deletion
 * @param absolutePath - Absolute file path
 */
export async function handleFileDelete(absolutePath: string): Promise<void> {
    try {
        const relativePath = getRelativeFilePath(absolutePath);

        // Find file in database
        const file = await prisma.file.findUnique({
            where: { filePath: relativePath },
        });

        if (!file) {
            return; // File not in database
        }

        // Hard delete as per user requirement
        console.log(`[FileSync] Deleting file from database: ${relativePath}`);
        await prisma.file.delete({
            where: { id: file.id },
        });

        console.log(`[FileSync] ✓ File deleted: ${relativePath}`);
    } catch (error) {
        console.error(`[FileSync] Error deleting file ${absolutePath}:`, error);
    }
}

/**
 * Handle folder deletion
 * @param absolutePath - Absolute folder path
 */
export async function handleFolderDelete(absolutePath: string): Promise<void> {
    try {
        const relativePath = getRelativeFilePath(absolutePath);

        if (!relativePath || relativePath === '.') {
            return;
        }

        const userId = await getDefaultUserId();

        // Find folder in database
        const folder = await prisma.folder.findFirst({
            where: {
                userId,
                fsPath: relativePath,
            },
        });

        if (!folder) {
            return; // Folder not in database
        }

        // Hard delete folder and its contents (cascade will handle files)
        console.log(`[FileSync] Deleting folder from database: ${relativePath}`);
        await prisma.folder.delete({
            where: { id: folder.id },
        });

        console.log(`[FileSync] ✓ Folder deleted: ${relativePath}`);
    } catch (error) {
        console.error(`[FileSync] Error deleting folder ${absolutePath}:`, error);
    }
}

/**
 * Recursively scan and sync a directory
 * @param dirPath - Absolute directory path
 */
/**
 * Recursively scan and sync a directory
 * @param dirPath - Absolute directory path
 */
export async function scanAndSyncDirectory(dirPath: string): Promise<{
    filesAdded: number;
    foldersCreated: number;
    errors: number;
}> {
    const stats = {
        filesAdded: 0,
        foldersCreated: 0,
        errors: 0,
    };

    try {
        // Optimization: Fetch all existing files AND folders in the database for this directory tree
        // This prevents N+1 queries for every file and folder
        const relativePath = getRelativeFilePath(dirPath);

        const [existingFiles, existingFolders] = await Promise.all([
            prisma.file.findMany({
                where: {
                    filePath: {
                        startsWith: relativePath === '.' ? '' : relativePath
                    }
                },
                select: { filePath: true }
            }),
            prisma.folder.findMany({
                where: {
                    fsPath: {
                        startsWith: relativePath === '.' ? '' : relativePath
                    }
                },
                select: { fsPath: true }
            })
        ]);

        const existingFileSet = new Set(existingFiles.map(f => f.filePath));
        const existingFolderSet = new Set(existingFolders.map(f => f.fsPath));

        console.log(`[FileSync] Found ${existingFiles.length} existing files and ${existingFolders.length} existing folders in DB for ${relativePath}`);

        // Helper function for recursive scanning
        async function scan(currentPath: string) {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);

                // Skip system files and upload artifacts
                if (
                    entry.name.startsWith('.') ||
                    entry.name === 'chunks' ||
                    entry.name === 'files' ||
                    entry.name === 'folders'
                ) {
                    continue;
                }

                try {
                    if (entry.isDirectory()) {
                        const folderRelativePath = getRelativeFilePath(fullPath);

                        // Only sync if not already in database
                        if (!existingFolderSet.has(folderRelativePath)) {
                            await syncFolder(fullPath);
                            stats.foldersCreated++;
                        } else {
                            // Silent skip
                        }

                        // Recursively scan subdirectories
                        await scan(fullPath);
                    } else if (entry.isFile()) {
                        const fileRelativePath = getRelativeFilePath(fullPath);

                        // Only sync if not already in database
                        if (!existingFileSet.has(fileRelativePath)) {
                            await syncFile(fullPath);
                            stats.filesAdded++;
                        } else {
                            // Silent skip
                        }
                    }
                } catch (error) {
                    console.error(`[FileSync] Error processing ${fullPath}:`, error);
                    stats.errors++;
                }
            }
        }

        await scan(dirPath);

    } catch (error) {
        console.error(`[FileSync] Error scanning directory ${dirPath}:`, error);
        stats.errors++;
    }

    return stats;
}
