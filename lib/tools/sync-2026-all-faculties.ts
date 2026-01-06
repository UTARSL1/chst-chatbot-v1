/**
 * Sync 2026 Staff Directory - All Remaining Faculties
 * 
 * This script scrapes fresh staff data for all faculties (except LKC FES which is already done)
 * and updates the main staff_directory.json with complete 2026 data.
 * 
 * Faculties to sync (in order):
 * 1. FEGT - Faculty of Engineering and Green Technology
 * 2. FICT - Faculty of Information and Communication Technology
 * 3. FEd - Faculty of Education
 * 4. FSc - Faculty of Science
 * 5. FCS - Faculty of Creative Industries
 * 6. THP FBF - Teh Hong Piow Faculty of Business and Finance
 * 7. FAS - Faculty of Arts and Social Science
 * 8. FAM - Faculty of Accountancy and Management
 * 9. FCI - Faculty of Chinese Studies
 * 10. MK FMHS - M. Kandiah Faculty of Medicine and Health Sciences
 */

import { syncStaffDirectory } from './staff-directory';

async function sync2026AllFaculties() {
    console.log('='.repeat(80));
    console.log('📅 Syncing 2026 Staff Directory - All Remaining Faculties');
    console.log('='.repeat(80));
    console.log('');
    console.log('📌 Note: LKC FES has already been synced');
    console.log('📌 This will sync all other faculties and update staff_directory.json');
    console.log('');

    const facultiesToSync = [
        'FEGT',     // 1. Faculty of Engineering and Green Technology
        'FICT',     // 2. Faculty of Information and Communication Technology
        'FEd',      // 3. Faculty of Education
        'FSc',      // 4. Faculty of Science
        'FCS',      // 5. Faculty of Creative Industries
        'THP FBF',  // 6. Teh Hong Piow Faculty of Business and Finance
        'FAS',      // 7. Faculty of Arts and Social Science
        'FAM',      // 8. Faculty of Accountancy and Management
        'FCI',      // 9. Faculty of Chinese Studies
        'MK FMHS'   // 10. M. Kandiah Faculty of Medicine and Health Sciences
    ];

    console.log('📋 Faculties to sync:');
    facultiesToSync.forEach((faculty, index) => {
        console.log(`   ${index + 1}. ${faculty}`);
    });
    console.log('');
    console.log('⏱️  Estimated time: 30-45 minutes');
    console.log('');
    console.log('Starting sync in 5 seconds...');
    console.log('Press Ctrl+C to cancel');
    console.log('');

    // Wait 5 seconds before starting
    await new Promise(resolve => setTimeout(resolve, 5000));

    const startTime = Date.now();

    try {
        // Sync all remaining faculties
        const result = await syncStaffDirectory(
            facultiesToSync,
            (msg: string) => {
                console.log(`[Sync] ${msg}`);
            }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const minutes = Math.floor(parseFloat(duration) / 60);
        const seconds = (parseFloat(duration) % 60).toFixed(0);

        console.log('');
        console.log('='.repeat(80));
        console.log('✅ Sync Complete!');
        console.log('='.repeat(80));
        console.log(`⏱️  Duration: ${minutes}m ${seconds}s`);
        console.log(`📊 Status: ${result.status}`);
        console.log(`👥 Total Staff: ${result.totalStaff}`);
        console.log(`➕ Added: ${result.changes.added}`);
        console.log(`🔄 Updated: ${result.changes.updated}`);
        console.log(`➖ Removed: ${result.changes.deleted}`);
        console.log('');
        console.log('📁 Files updated:');
        console.log('   ✓ lib/tools/staff_directory.json (Complete 2026 data)');
        console.log('');
        console.log('🎯 Next steps:');
        console.log('   1. Review changes: git diff lib/tools/staff_directory.json');
        console.log('   2. Run full comparison: npx tsx lib/tools/compare-2025-2026.ts');
        console.log('   3. Test queries with the chatbot');
        console.log('   4. Commit and deploy if satisfied');
        console.log('');
        console.log('📊 Comparison Summary:');
        console.log(`   Total faculties synced: ${facultiesToSync.length + 1} (including LKC FES)`);
        console.log(`   Total staff in 2026: ${result.totalStaff}`);
        console.log('');

    } catch (error) {
        console.error('');
        console.error('❌ Sync Failed!');
        console.error('='.repeat(80));
        console.error('Error:', error);
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('   - Check internet connection');
        console.error('   - Verify UTAR website is accessible');
        console.error('   - Check which faculty failed and retry from there');
        console.error('   - Wait a few minutes and try again');
        console.error('');
        console.error('🔄 To resume from a specific faculty:');
        console.error('   Edit the facultiesToSync array in this file');
        console.error('   Remove faculties that have already been synced');
        console.error('   Run the script again');
        console.error('');
        process.exit(1);
    }
}

// Run the sync
sync2026AllFaculties();
