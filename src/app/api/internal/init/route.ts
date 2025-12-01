import { NextRequest, NextResponse } from 'next/server';
import { startServices, isServicesStarted } from '@/lib/startup';

/**
 * Internal API route to initialize file watcher
 * This ensures the file watcher starts even if instrumentation doesn't work
 */
export async function GET(request: NextRequest) {
    try {
        if (!isServicesStarted()) {
            console.log('[Init API] Starting file watcher services...');
            await startServices();
            return NextResponse.json({
                success: true,
                message: 'File watcher services started successfully'
            });
        }

        return NextResponse.json({
            success: true,
            message: 'File watcher services already running'
        });
    } catch (error) {
        console.error('[Init API] Error starting services:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to start file watcher services'
        }, { status: 500 });
    }
}
