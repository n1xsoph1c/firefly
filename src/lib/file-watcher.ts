import chokidar from 'chokidar';
import path from 'path';
import { storageConfig } from './storage';
import {
    syncFile,
    syncFolder,
    handleFileDelete,
    handleFolderDelete,
    scanAndSyncDirectory,
} from './file-sync';
import fs from 'fs/promises';

const SYNC_STATE_FILE = path.join(process.cwd(), '.sync-state.json');
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

interface SyncState {
    lastSyncTime: number;
}

async function getLastSyncTime(): Promise<number> {
    try {
        const data = await fs.readFile(SYNC_STATE_FILE, 'utf-8');
        const state: SyncState = JSON.parse(data);
        return state.lastSyncTime || 0;
    } catch {
        return 0;
    }
}

async function updateLastSyncTime(): Promise<void> {
    try {
        const state: SyncState = { lastSyncTime: Date.now() };
        await fs.writeFile(SYNC_STATE_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
        console.error('[FileWatcher] Failed to save sync state:', error);
    }
}

/**
 * File Watcher Service
 * Watches UPLOAD_PATH for file system changes and syncs to database
 */

let watcher: chokidar.FSWatcher | null = null;
let isInitialized = false;

// Debounce timers for file operations
const debounceTimers = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_DELAY = 1000; // 1 second

/**
 * Debounce function to prevent rapid-fire syncs during bulk operations (like rsync)
 */
function debounce(key: string, callback: () => void, delay: number = DEBOUNCE_DELAY) {
    // Clear existing timer
    const existingTimer = debounceTimers.get(key);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
        debounceTimers.delete(key);
        callback();
    }, delay);

    debounceTimers.set(key, timer);
}

/**
 * Check if path should be ignored
 */
function shouldIgnorePath(filePath: string): boolean {
    const relativePath = path.relative(storageConfig.uploadPath, filePath);
    const segments = relativePath.split(path.sep);

    // Ignore hidden files and system files
    if (segments.some(seg => seg.startsWith('.'))) {
        return true;
    }

    // Ignore upload artifact directories
    if (segments[0] === 'chunks' || segments[0] === 'files' || segments[0] === 'folders') {
        return true;
    }

    // Ignore common temporary files
    const fileName = path.basename(filePath);
    if (
        fileName === 'Thumbs.db' ||
        fileName === '.DS_Store' ||
        fileName.endsWith('.tmp') ||
        fileName.endsWith('.temp') ||
        fileName.startsWith('~')
    ) {
        return true;
    }

    return false;
}

/**
 * Start the file watcher
 */
export async function startFileWatcher(): Promise<void> {
    if (isInitialized) {
        console.log('[FileWatcher] Already initialized');
        return;
    }

    console.log('[FileWatcher] Starting file watcher...');
    console.log(`[FileWatcher] Watching directory: ${storageConfig.uploadPath}`);

    // Perform initial sync of existing files
    if (!isInitialized) {
        const lastSyncTime = await getLastSyncTime();
        const timeSinceLastSync = Date.now() - lastSyncTime;

        if (timeSinceLastSync < SYNC_INTERVAL_MS) {
            console.log(`[FileWatcher] Skipping initial sync (last sync was ${(timeSinceLastSync / 1000 / 60).toFixed(1)} minutes ago)`);
        } else {
            console.log('[FileWatcher] Running initial sync...');
            try {
                const stats = await scanAndSyncDirectory(storageConfig.uploadPath);
                console.log('[FileWatcher] Initial sync complete:');
                console.log(`  - Files added: ${stats.filesAdded}`);
                console.log(`  - Folders created: ${stats.foldersCreated}`);
                console.log(`  - Errors: ${stats.errors}`);

                await updateLastSyncTime();
            } catch (error) {
                console.error('[FileWatcher] Initial sync failed:', error);
            }
        }
    }

    // Initialize chokidar watcher
    watcher = chokidar.watch(storageConfig.uploadPath, {
        ignored: (filePath: string) => shouldIgnorePath(filePath),
        persistent: true,
        ignoreInitial: true, // Don't trigger events for existing files (we already synced them)
        awaitWriteFinish: {
            stabilityThreshold: 2000, // Wait for file to be stable for 2 seconds
            pollInterval: 100,
        },
        depth: undefined, // Watch all subdirectories
    });

    // Handle file addition
    watcher.on('add', (filePath: string) => {
        debounce(`add:${filePath}`, () => {
            console.log(`[FileWatcher] File added: ${filePath}`);
            syncFile(filePath).catch(error => {
                console.error(`[FileWatcher] Error syncing file ${filePath}:`, error);
            });
        });
    });

    // Handle directory addition
    watcher.on('addDir', (dirPath: string) => {
        // Skip root directory
        if (dirPath === storageConfig.uploadPath) {
            return;
        }

        debounce(`addDir:${dirPath}`, () => {
            console.log(`[FileWatcher] Directory added: ${dirPath}`);
            syncFolder(dirPath).catch(error => {
                console.error(`[FileWatcher] Error syncing folder ${dirPath}:`, error);
            });
        });
    });

    // Handle file deletion
    watcher.on('unlink', (filePath: string) => {
        debounce(`unlink:${filePath}`, () => {
            console.log(`[FileWatcher] File deleted: ${filePath}`);
            handleFileDelete(filePath).catch(error => {
                console.error(`[FileWatcher] Error handling file deletion ${filePath}:`, error);
            });
        });
    });

    // Handle directory deletion
    watcher.on('unlinkDir', (dirPath: string) => {
        debounce(`unlinkDir:${dirPath}`, () => {
            console.log(`[FileWatcher] Directory deleted: ${dirPath}`);
            handleFolderDelete(dirPath).catch(error => {
                console.error(`[FileWatcher] Error handling folder deletion ${dirPath}:`, error);
            });
        });
    });

    // Handle file changes (optional - update metadata if needed)
    watcher.on('change', (filePath: string) => {
        debounce(`change:${filePath}`, () => {
            console.log(`[FileWatcher] File changed: ${filePath}`);
            // For now, we just log changes. You could update file metadata here if needed.
        });
    });

    // Handle errors
    watcher.on('error', (error: Error) => {
        console.error('[FileWatcher] Watcher error:', error);
    });

    // Ready event
    watcher.on('ready', () => {
        console.log('[FileWatcher] ✓ File watcher ready and monitoring changes');
        isInitialized = true;
    });
}

/**
 * Stop the file watcher
 */
export async function stopFileWatcher(): Promise<void> {
    if (!watcher) {
        return;
    }

    console.log('[FileWatcher] Stopping file watcher...');

    // Clear all debounce timers
    debounceTimers.forEach(timer => clearTimeout(timer));
    debounceTimers.clear();

    // Close watcher
    await watcher.close();
    watcher = null;
    isInitialized = false;

    console.log('[FileWatcher] ✓ File watcher stopped');
}

/**
 * Check if file watcher is running
 */
export function isFileWatcherRunning(): boolean {
    return isInitialized;
}
