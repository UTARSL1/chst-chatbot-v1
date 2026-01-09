/**
 * Clean and Finalize to Exactly 234 Staff
 * 
 * Removes duplicates and ensures exactly 234 unique staff records
 */

import fs from 'fs';
import path from 'path';

function cleanAndFinalize(): void {
    console.log('='.repeat(80));
    console.log('Cleaning Publication JSON to Exactly 234 Staff');
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

    console.log(`Current records in publication JSON: ${existingResults.length}`);
    console.log();

    // Remove duplicates by email (keep first occurrence)
    const uniqueResults: any[] = [];
    const seenEmails = new Set<string>();

    for (const result of existingResults) {
        if (!seenEmails.has(result.email)) {
            uniqueResults.push(result);
            seenEmails.add(result.email);
        } else {
            console.log(`  Removing duplicate: ${result.name} (${result.email})`);
        }
    }

    console.log();
    console.log(`After removing duplicates: ${uniqueResults.length}`);
    console.log();

    // Get all LKC FES staff emails (excluding FGO and DLMSA)
    const allStaffEmails = new Set<string>();
    const staffByEmail = new Map<string, any>();

    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (lkcfes) {
        const departments = lkcfes.departments || {};

        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            if (deptKey === 'FGO' || deptKey === 'DLMSA') continue;

            const staff = deptData.staff || [];

            for (const member of staff) {
                allStaffEmails.add(member.email);
                staffByEmail.set(member.email, {
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

    console.log(`Total staff in directory (excluding FGO & DLMSA): ${allStaffEmails.size}`);
    console.log();

    // Find missing staff
    const missingEmails: string[] = [];
    for (const email of allStaffEmails) {
        if (!seenEmails.has(email)) {
            missingEmails.push(email);
        }
    }

    console.log(`Missing staff to add: ${missingEmails.length}`);
    console.log();

    // Add missing staff as "Not Available"
    for (const email of missingEmails) {
        const staff = staffByEmail.get(email);
        if (staff) {
            console.log(`  Adding: ${staff.name}`);

            uniqueResults.push({
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
    }

    console.log();
    console.log(`Final total: ${uniqueResults.length}`);
    console.log();

    // Count staff with/without Scopus data
    const withData = uniqueResults.filter(r => r.scopusStatus !== 'Not Available').length;
    const withoutData = uniqueResults.filter(r => r.scopusStatus === 'Not Available').length;

    // Update metadata
    const updatedMetadata = {
        ...publicationData.metadata,
        lastUpdated: new Date().toISOString(),
        totalStaff: uniqueResults.length,
        staffWithScopusData: withData,
        staffWithoutScopusData: withoutData,
    };

    // Save cleaned publication JSON
    fs.writeFileSync(
        'lkcfes-scopus-publications.json',
        JSON.stringify({
            metadata: updatedMetadata,
            results: uniqueResults,
        }, null, 2),
        'utf-8'
    );

    console.log('='.repeat(80));
    console.log('✅ FINALIZATION COMPLETE!');
    console.log('='.repeat(80));
    console.log();
    console.log('Final Statistics:');
    console.log(`  Total staff: ${uniqueResults.length}`);
    console.log(`  With Scopus data: ${withData}`);
    console.log(`  Without Scopus data (Not Available): ${withoutData}`);
    console.log();

    if (uniqueResults.length === 234) {
        console.log('✅ SUCCESS! Exactly 234 records as required!');
    } else {
        console.log(`⚠️  WARNING: Expected 234 but have ${uniqueResults.length}`);
    }

    console.log();
    console.log('✅ Publication JSON saved: lkcfes-scopus-publications.json');
    console.log('='.repeat(80));
}

if (require.main === module) {
    cleanAndFinalize();
}

export { cleanAndFinalize };
