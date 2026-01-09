/**
 * Re-merge CSV Results into Publication JSON
 * This will update staff records with Scopus IDs from the CSV results
 */

import fs from 'fs';
import path from 'path';

function remergeCSVData(): void {
    console.log('='.repeat(80));
    console.log('Re-merging CSV Results with Scopus IDs');
    console.log('='.repeat(80));
    console.log();

    // Load files
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    const publicationData = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));
    const csvResults = JSON.parse(fs.readFileSync('lkcfes-71-staff-results.json', 'utf-8'));

    // Create name-to-email mapping from staff directory
    const nameToEmail = new Map<string, string>();
    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (lkcfes) {
        const departments = lkcfes.departments || {};
        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            if (deptKey === 'FGO' || deptKey === 'DLMSA') continue;

            const staff = deptData.staff || [];
            for (const member of staff) {
                if (member.email) {
                    nameToEmail.set(member.name, member.email);
                }
            }
        }
    }

    console.log(`CSV results to merge: ${csvResults.results.length}`);
    console.log();

    let updatedCount = 0;

    // Update publication data with CSV results
    for (const csvStaff of csvResults.results) {
        const email = nameToEmail.get(csvStaff.name);

        if (!email) {
            console.log(`⚠️  No email found for: ${csvStaff.name}`);
            continue;
        }

        // Find in publication data by email
        const pubStaff = publicationData.results.find((r: any) => r.email === email);

        if (pubStaff) {
            // Update with CSV data
            const oldScopusId = pubStaff.scopusAuthorId;

            pubStaff.scopusAuthorId = csvStaff.scopusAuthorId;
            pubStaff.scopusStatus = 'Available';
            pubStaff.publications = csvStaff.publications;
            pubStaff.totalPublications = csvStaff.totalPublications;

            if (oldScopusId === 'N/A' || !oldScopusId) {
                console.log(`✅ Updated: ${csvStaff.name}`);
                console.log(`   Scopus ID: ${csvStaff.scopusAuthorId}`);
                console.log(`   Publications: ${csvStaff.totalPublications}`);
                updatedCount++;
            }
        } else {
            console.log(`⚠️  Not found in publication JSON: ${csvStaff.name} (${email})`);
        }
    }

    console.log();
    console.log(`Total updated: ${updatedCount}`);
    console.log();

    // Recalculate statistics
    const availableStaff = publicationData.results.filter((r: any) => r.scopusStatus !== 'Not Available');

    const calc2023 = availableStaff.reduce((sum: number, r: any) => {
        const pub = r.publications?.find((p: any) => p.year === 2023);
        return sum + (pub?.count || 0);
    }, 0);

    const calc2024 = availableStaff.reduce((sum: number, r: any) => {
        const pub = r.publications?.find((p: any) => p.year === 2024);
        return sum + (pub?.count || 0);
    }, 0);

    const calc2025 = availableStaff.reduce((sum: number, r: any) => {
        const pub = r.publications?.find((p: any) => p.year === 2025);
        return sum + (pub?.count || 0);
    }, 0);

    const totalPubs = calc2023 + calc2024 + calc2025;
    const avgPerStaff = availableStaff.length > 0 ? totalPubs / availableStaff.length : 0;

    const notAvailableCount = publicationData.results.filter((r: any) => r.scopusStatus === 'Not Available').length;

    publicationData.metadata.statistics = {
        publications2023: calc2023,
        publications2024: calc2024,
        publications2025: calc2025,
        totalPublications: totalPubs,
        averagePerStaff: parseFloat(avgPerStaff.toFixed(2)),
    };

    publicationData.metadata.staffWithScopusData = availableStaff.length;
    publicationData.metadata.staffWithoutScopusData = notAvailableCount;
    publicationData.metadata.lastUpdated = new Date().toISOString();

    // Save
    fs.writeFileSync('lkcfes-scopus-publications.json', JSON.stringify(publicationData, null, 2), 'utf-8');

    console.log('='.repeat(80));
    console.log('✅ MERGE COMPLETE!');
    console.log('='.repeat(80));
    console.log();
    console.log('Updated Statistics:');
    console.log(`  Staff with Scopus data: ${availableStaff.length}`);
    console.log(`  Staff without Scopus data: ${notAvailableCount}`);
    console.log(`  Publications 2023: ${calc2023}`);
    console.log(`  Publications 2024: ${calc2024}`);
    console.log(`  Publications 2025: ${calc2025}`);
    console.log(`  Total: ${totalPubs}`);
    console.log('='.repeat(80));
}

if (require.main === module) {
    remergeCSVData();
}

export { remergeCSVData };
