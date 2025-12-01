#!/usr/bin/env bun
/**
 * Manual test script for file watcher
 * Run this to test the file sync functionality
 */

import { startServices } from '../src/lib/startup';

console.log('Starting file watcher test...');

try {
    await startServices();
    console.log('\nFile watcher started successfully!');
    console.log('Watching for file changes...');
    console.log('\nPress Ctrl+C to stop');

    // Keep the process running
    process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        process.exit(0);
    });

    // Keep alive
    await new Promise(() => { });
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}
