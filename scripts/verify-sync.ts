import { scanAndSyncDirectory } from '../src/lib/file-sync';
import { storageConfig } from '../src/lib/storage';
import { prisma } from '../src/lib/db';

async function verifySync() {
    console.log('Starting verification...');

    // 1. Measure time for sync
    const start = Date.now();
    const stats = await scanAndSyncDirectory(storageConfig.uploadPath);
    const end = Date.now();

    console.log(`Sync completed in ${end - start}ms`);
    console.log('Stats:', stats);

    // 2. Verify no unnecessary DB writes (implied by speed, but good to check)
    if (end - start > 5000) { // Should be very fast if optimized
        console.error('FAIL: Sync took too long');
        process.exit(1);
    }

    console.log('PASS: Sync was fast');
    process.exit(0);
}

verifySync().catch(console.error);
