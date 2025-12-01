import { startFileWatcher, stopFileWatcher } from './file-watcher';

/**
 * Startup Service
 * Initializes file system watching on application start
 */

let isStarted = false;

/**
 * Check if services are started
 */
export function isServicesStarted(): boolean {
    return isStarted;
}

/**
 * Start all background services
 */
export async function startServices(): Promise<void> {
    if (isStarted) {
        console.log('[Startup] Services already started');
        return;
    }

    console.log('[Startup] Starting background services...');

    try {
        // Start file watcher
        await startFileWatcher();

        isStarted = true;
        console.log('[Startup] ✓ All services started successfully');
    } catch (error) {
        console.error('[Startup] Error starting services:', error);
        throw error;
    }
}

/**
 * Stop all background services
 */
export async function stopServices(): Promise<void> {
    if (!isStarted) {
        return;
    }

    console.log('[Startup] Stopping background services...');

    try {
        // Stop file watcher
        await stopFileWatcher();

        isStarted = false;
        console.log('[Startup] ✓ All services stopped');
    } catch (error) {
        console.error('[Startup] Error stopping services:', error);
    }
}

/**
 * Setup graceful shutdown handlers
 */
export function setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
        console.log(`[Startup] Received ${signal}, shutting down gracefully...`);
        await stopServices();
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
