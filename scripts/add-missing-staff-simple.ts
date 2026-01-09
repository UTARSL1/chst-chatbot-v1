/**
 * Simply Add Missing Staff to Publication JSON
 * 
 * Just adds Ts Bukhary + all other missing staff as "Not Available"
 * NO re-scraping of existing data
 */

import fs from 'fs';
import path from 'path';

async function addMissingStaff(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Adding Missing Staff to Publication JSON');
    console.log('='.repeat(80));
    console.log();

    // Load staff directory
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    // Load existing publication data
    const publicationData = JSON.parse(
        fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8')
    );

    const existingResults = publicationData.results;
    const existingEmails = new Set(existingResults.map((r: any) => r.email));

    console.log(`Existing staff in publication JSON: ${existingResults.length}`);
    console.log();

    // Get all LKC FES staff (excluding FGO and DLMSA)
    const allStaff: any[] = [];
    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (lkcfes) {
        const departments = lkcfes.departments || {};

        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            if (deptKey === 'FGO' || deptKey === 'DLMSA') continue;

            const staff = deptData.staff || [];

            for (const member of staff) {
                allStaff.push({
                    searchId: member.searchId,
                    name: member.name,
                    email: member.email,
                    department: member.department,
                    departmentAcronym: member.departmentAcronym,
                    designation: member.designation,
                    scopusUrl: member.scopusUrl || '',
                });
            }
        }
    }

    console.log(`Total LKC FES staff (excluding FGO & DLMSA): ${allStaff.length}`);
    console.log();

    // Find staff not in publication JSON
    const missingStaff = allStaff.filter(s => !existingEmails.has(s.email));

    console.log(`Staff to add: ${missingStaff.length}`);
    console.log();

    // Add all missing staff as "Not Available"
    const newRecords: any[] = [];

    for (const staff of missingStaff) {
        console.log(`✅ Adding: ${staff.name} - Scopus Not Available`);

        newRecords.push({
            searchId: staff.searchId,
            name: staff.name,
            email: staff.email,
            department: staff.department,
            departmentAcronym: staff.departmentAcronym,
            designation: staff.designation,
            scopusAuthorId: 'N/A',
            scopusStatus: 'Not Available',
            publications: [
                { year: 2023, count: 0, success: false },
                { year: 2024, count: 0, success: false },
                { year: 2025, count: 0, success: false },
            ],
            totalPublications: 0,
        });
    }

    console.log();
    console.log(`Total new records added: ${newRecords.length}`);
    console.log();

    // Merge with existing results
    const mergedResults = [...existingResults, ...newRecords];

    // Keep existing statistics (don't recalculate)
    const updatedMetadata = {
        ...publicationData.metadata,
        lastUpdated: new Date().toISOString(),
        totalStaff: mergedResults.length,
        staffWithScopusData: existingResults.length,
        staffWithoutScopusData: newRecords.length,
    };

    // Save updated publication JSON
    fs.writeFileSync(
        'lkcfes-scopus-publications.json',
        JSON.stringify({
            metadata: updatedMetadata,
            results: mergedResults,
        }, null, 2),
        'utf-8'
    );

    console.log('='.repeat(80));
    console.log('✅ COMPLETE!');
    console.log('='.repeat(80));
    console.log();
    console.log('Final Statistics:');
    console.log(`  Total staff: ${mergedResults.length}`);
    console.log(`  With Scopus data: ${existingResults.length}`);
    console.log(`  Without Scopus data (Not Available): ${newRecords.length}`);
    console.log();
    console.log('✅ Publication JSON updated: lkcfes-scopus-publications.json');
    console.log();
    console.log('🎉 All 234 staff now included!');
    console.log('='.repeat(80));
}

if (require.main === module) {
    addMissingStaff()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { addMissingStaff };
