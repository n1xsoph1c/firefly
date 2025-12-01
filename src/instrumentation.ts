/**
 * Next.js Instrumentation
 * This file runs once when the server starts
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
    // Only run on server side
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startServices, setupShutdownHandlers } = await import('./lib/startup');

        // Start background services
        await startServices();

        // Setup graceful shutdown
        setupShutdownHandlers();
    }
}
