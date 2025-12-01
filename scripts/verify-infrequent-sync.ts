import { startFileWatcher, stopFileWatcher } from '../src/lib/file-watcher';
import fs from 'fs/promises';
import path from 'path';

const SYNC_STATE_FILE = path.join(process.cwd(), '.sync-state.json');

async function verifyInfrequentSync() {
    console.log('Starting verification...');

    // 1. Clear state file
    try {
        await fs.unlink(SYNC_STATE_FILE);
    } catch { }

    // 2. First run - should sync
    console.log('\n--- First Run (Should Sync) ---');
    await startFileWatcher();
    await stopFileWatcher();

    // 3. Check if state file exists
    try {
        const state = JSON.parse(await fs.readFile(SYNC_STATE_FILE, 'utf-8'));
        console.log('State file created:', state);
        if (!state.lastSyncTime) throw new Error('No lastSyncTime in state file');
    } catch (error) {
        console.error('FAIL: State file not created or invalid', error);
        process.exit(1);
    }

    // 4. Second run - should SKIP sync
    console.log('\n--- Second Run (Should SKIP Sync) ---');
    // We can't easily capture console output here without hooking stdout, 
    // but we can check if the state file timestamp changed (it shouldn't if skipped)

    const stateBefore = JSON.parse(await fs.readFile(SYNC_STATE_FILE, 'utf-8'));
    await startFileWatcher();
    await stopFileWatcher();
    const stateAfter = JSON.parse(await fs.readFile(SYNC_STATE_FILE, 'utf-8'));

    if (stateBefore.lastSyncTime !== stateAfter.lastSyncTime) {
        console.error('FAIL: Sync ran again (timestamp updated)');
        process.exit(1);
    } else {
        console.log('PASS: Sync was skipped (timestamp unchanged)');
    }

    process.exit(0);
}

verifyInfrequentSync().catch(console.error);
