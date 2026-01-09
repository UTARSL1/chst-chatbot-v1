/**
 * Fix Merge - Add Missing CSV Staff to Publication JSON
 * 
 * Merges the 71-staff CSV results into the main publication JSON
 * by matching on email OR name if email is missing
 */

import fs from 'fs';
import path from 'path';

function fixMerge(): void {
    console.log('='.repeat(80));
    console.log('Fixing Merge: Adding Missing CSV Staff to Publication JSON');
    console.log('='.repeat(80));
    console.log();

    // Load the CSV results
    const csvResults = JSON.parse(
        fs.readFileSync('lkcfes-71-staff-results.json', 'utf-8')
    );

    // Load staff directory to get email mappings
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    // Create name-to-email mapping
    const nameToEmailMap = new Map<string, any>();
    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (lkcfes) {
        const departments = lkcfes.departments || {};

        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            const staff = deptData.staff || [];

            for (const member of staff) {
                nameToEmailMap.set(member.name, {
                    searchId: member.searchId,
                    email: member.email,
                    department: member.department,
                    departmentAcronym: member.departmentAcronym,
                });
            }
        }
    }

    // Update CSV results with correct email/department info
    const updatedCsvResults = csvResults.results.map((result: any) => {
        const staffInfo = nameToEmailMap.get(result.name);

        if (staffInfo) {
            return {
                ...result,
                searchId: staffInfo.searchId,
                email: staffInfo.email,
                department: staffInfo.department,
                departmentAcronym: staffInfo.departmentAcronym,
            };
        }

        return result;
    });

    console.log(`Updated ${updatedCsvResults.length} CSV results with directory info`);
    console.log();

    // Load existing publication data
    const publicationData = JSON.parse(
        fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8')
    );

    const existingResults = publicationData.results;
    const existingEmails = new Set(existingResults.map((r: any) => r.email));

    // Filter out duplicates and staff without emails
    const newResults = updatedCsvResults.filter((r: any) =>
        r.email && r.email.trim() !== '' && !existingEmails.has(r.email)
    );

    console.log(`Existing staff in publication JSON: ${existingResults.length}`);
    console.log(`New staff to add from CSV: ${newResults.length}`);
    console.log(`Duplicates/invalid skipped: ${updatedCsvResults.length - newResults.length}`);
    console.log();

    // Merge results
    const mergedResults = [...existingResults, ...newResults];

    // Recalculate statistics
    const calc2023 = mergedResults.reduce((sum: number, r: any) => {
        const pub = r.publications.find((p: any) => p.year === 2023);
        return sum + (pub?.count || 0);
    }, 0);

    const calc2024 = mergedResults.reduce((sum: number, r: any) => {
        const pub = r.publications.find((p: any) => p.year === 2024);
        return sum + (pub?.count || 0);
    }, 0);

    const calc2025 = mergedResults.reduce((sum: number, r: any) => {
        const pub = r.publications.find((p: any) => p.year === 2025);
        return sum + (pub?.count || 0);
    }, 0);

    const totalPubs = calc2023 + calc2024 + calc2025;
    const avgPerStaff = mergedResults.length > 0 ? totalPubs / mergedResults.length : 0;

    const updatedMetadata = {
        ...publicationData.metadata,
        lastUpdated: new Date().toISOString(),
        totalStaff: mergedResults.length,
        accessibleStaff: mergedResults.length,
        statistics: {
            publications2023: calc2023,
            publications2024: calc2024,
            publications2025: calc2025,
            totalPublications: totalPubs,
            averagePerStaff: parseFloat(avgPerStaff.toFixed(2)),
        },
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

    console.log('✅ Publication JSON updated successfully!');
    console.log();
    console.log('Final Statistics:');
    console.log(`  Total staff: ${mergedResults.length}`);
    console.log(`  Publications 2023: ${calc2023}`);
    console.log(`  Publications 2024: ${calc2024}`);
    console.log(`  Publications 2025: ${calc2025}`);
    console.log(`  Total publications: ${totalPubs}`);
    console.log(`  Average per staff: ${avgPerStaff.toFixed(2)}`);
    console.log();
    console.log('='.repeat(80));
}

if (require.main === module) {
    fixMerge();
}

export { fixMerge };
