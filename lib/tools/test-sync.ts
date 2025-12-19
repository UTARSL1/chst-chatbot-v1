// Test script for staff directory sync - LKC FES only
import { syncStaffDirectory, loadStaffDirectory } from './staff-directory';

async function testSync() {
    console.log('=== Staff Directory Sync Test ===\n');
    console.log('This will scrape LKC FES faculty only (for testing)');
    console.log('Estimated time: 5-10 minutes with 500ms rate limiting\n');

    try {
        // Run sync for LKC FES only
        const result = await syncStaffDirectory(['LKC FES']);

        console.log('\n=== Sync Results ===');
        console.log(`Status: ${result.status}`);
        console.log(`Duration: ${result.duration}`);
        console.log(`Total Staff: ${result.totalStaff}`);
        console.log(`\nChanges:`);
        console.log(`  Added: ${result.changes.added}`);
        console.log(`  Updated: ${result.changes.updated}`);
        console.log(`  Deleted: ${result.changes.deleted}`);
        console.log(`  Unchanged: ${result.changes.unchanged}`);

        if (result.unknownPrefixes && result.unknownPrefixes.length > 0) {
            console.log(`\n⚠️  Unknown SearchId Prefixes Found:`);
            console.log(`  ${result.unknownPrefixes.join(', ')}`);
            console.log(`  Please report these to the user for investigation.`);
        }

        // Load and display summary
        const directory = loadStaffDirectory();
        if (directory) {
            console.log('\n=== Directory Summary ===');
            console.log(`Version: ${directory.version}`);
            console.log(`Last Updated: ${directory.lastUpdated}`);
            console.log(`\nMetadata:`);
            console.log(`  Total Positions: ${directory.metadata.staffCount}`);
            console.log(`  Unique Staff: ${directory.metadata.uniqueStaffCount}`);
            console.log(`  Overlap: ${directory.metadata.staffCount - (directory.metadata.uniqueStaffCount || 0)} (staff in multiple depts)`);
            console.log(`  Full-Time: ${directory.metadata.fullTimeCount}`);
            console.log(`  Adjunct: ${directory.metadata.adjunctCount}`);
            console.log(`  Part-Time: ${directory.metadata.partTimeCount}`);
            console.log(`  Expatriate: ${directory.metadata.expatriateCount}`);
            console.log(`  Emeritus: ${directory.metadata.emeritusCount}`);
            if (directory.metadata.unknownCount && directory.metadata.unknownCount > 0) {
                console.log(`  Unknown: ${directory.metadata.unknownCount}`);
            }
            console.log(`\nFaculties: ${directory.metadata.facultiesCount}`);
            console.log(`Departments: ${directory.metadata.departmentsCount}`);

            // Show department breakdown
            for (const [facultyAcronym, faculty] of Object.entries(directory.faculties)) {
                console.log(`\n${facultyAcronym} (${faculty.staffCount} staff):`);
                for (const [deptAcronym, dept] of Object.entries(faculty.departments)) {
                    console.log(`  - ${deptAcronym}: ${dept.staffCount} staff (${dept.departmentType})`);
                }
            }
        }

        console.log('\n✅ Test completed successfully!');
        console.log(`\nStaff directory saved to: lib/tools/staff_directory.json`);

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Run test
testSync();
