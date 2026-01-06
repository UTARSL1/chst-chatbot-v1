/**
 * Re-sync Faculty of Chinese Studies (FCS)
 * 
 * The previous sync only captured 3 staff from FGO.
 * This will properly sync all departments under FCS.
 */

import { syncStaffDirectory } from './staff-directory';

async function resyncFCS() {
    console.log('='.repeat(60));
    console.log('🔄 Re-syncing Faculty of Chinese Studies (FCS)');
    console.log('='.repeat(60));
    console.log('');
    console.log('Previous sync only captured 3 staff (FGO only)');
    console.log('Expected: ~33 staff across all departments');
    console.log('');

    const startTime = Date.now();

    try {
        const result = await syncStaffDirectory(
            ['FCS'], // Only sync FCS
            (msg: string) => {
                console.log(`[FCS Sync] ${msg}`);
            }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('');
        console.log('='.repeat(60));
        console.log('✅ Re-sync Complete!');
        console.log('='.repeat(60));
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`📊 Status: ${result.status}`);
        console.log(`👥 Total Staff: ${result.totalStaff}`);
        console.log('');
        console.log('Please verify the staff count is now ~33');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('❌ Re-sync Failed!');
        console.error('='.repeat(60));
        console.error('Error:', error);
        console.error('');
        process.exit(1);
    }
}

resyncFCS();
