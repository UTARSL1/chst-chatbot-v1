/**
 * Sync 2026 Staff Directory - LKC FES Only
 * 
 * This script scrapes fresh staff data for LKC FES from UTAR website
 * and updates the main staff_directory.json with 2026 data.
 * 
 * The legacy 2025 data is preserved in staff_directory_legacy_2025.json
 * for historical comparisons.
 */

import { syncStaffDirectory } from './staff-directory';

async function sync2026LKCFESData() {
    console.log('='.repeat(60));
    console.log('📅 Syncing 2026 Staff Directory - LKC FES');
    console.log('='.repeat(60));
    console.log('');
    console.log('📌 Note: Legacy 2025 data is preserved in staff_directory_legacy_2025.json');
    console.log('📌 This will update staff_directory.json with fresh 2026 data');
    console.log('');

    const startTime = Date.now();

    try {
        // Sync only LKC FES
        const result = await syncStaffDirectory(
            ['LKC FES'], // Only sync LKC FES
            (msg: string) => {
                console.log(`[LKC FES Sync] ${msg}`);
            }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('');
        console.log('='.repeat(60));
        console.log('✅ Sync Complete!');
        console.log('='.repeat(60));
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`📊 Status: ${result.status}`);
        console.log(`👥 Total Staff: ${result.totalStaff}`);
        console.log(`➕ Added: ${result.added}`);
        console.log(`🔄 Updated: ${result.updated}`);
        console.log(`➖ Removed: ${result.removed}`);
        console.log('');
        console.log('📁 Files updated:');
        console.log('   ✓ lib/tools/staff_directory.json (2026 data)');
        console.log('   ✓ lib/tools/staff_directory_legacy_2025.json (archived)');
        console.log('');
        console.log('🎯 Next steps:');
        console.log('   1. Review changes: git diff lib/tools/staff_directory.json');
        console.log('   2. Test comparison queries');
        console.log('   3. Proceed with other faculties if satisfied');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('❌ Sync Failed!');
        console.error('='.repeat(60));
        console.error('Error:', error);
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('   - Check internet connection');
        console.error('   - Verify UTAR website is accessible');
        console.error('   - Wait a few minutes and try again');
        console.error('');
        process.exit(1);
    }
}

// Run the sync
sync2026LKCFESData();
