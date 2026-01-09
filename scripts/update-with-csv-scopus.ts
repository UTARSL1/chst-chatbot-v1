/**
 * Properly Update Publication JSON with CSV Scopus IDs
 * Uses email matching from staff directory
 */

import fs from 'fs';
import path from 'path';

function updateWithCSVScopusIDs(): void {
    console.log('='.repeat(80));
    console.log('Updating Publication JSON with CSV Scopus IDs');
    console.log('='.repeat(80));
    console.log();

    // Load files
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    const publicationData = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));
    const csvResults = JSON.parse(fs.readFileSync('lkcfes-71-staff-results.json', 'utf-8'));

    // Create name-to-staff mapping from staff directory
    const staffByName = new Map<string, any>();
    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (lkcfes) {
        const departments = lkcfes.departments || {};
        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            if (deptKey === 'FGO' || deptKey === 'DLMSA') continue;

            const staff = deptData.staff || [];
            for (const member of staff) {
                staffByName.set(member.name, member);
            }
        }
    }

    console.log(`CSV results to process: ${csvResults.results.length}`);
    console.log();

    let updatedCount = 0;
    let notFoundCount = 0;

    // Update publication data with CSV results
    for (const csvStaff of csvResults.results) {
        // Find staff in directory by name
        const dirStaff = staffByName.get(csvStaff.name);

        if (!dirStaff || !dirStaff.email) {
            console.log(`⚠️  No email in directory for: ${csvStaff.name}`);
            notFoundCount++;
            continue;
        }

        const email = dirStaff.email;

        // Find in publication data by email
        const pubStaff = publicationData.results.find((r: any) => r.email === email);

        if (pubStaff) {
            const wasNA = pubStaff.scopusAuthorId === 'N/A' || !pubStaff.scopusAuthorId;

            // Update with CSV data
            pubStaff.scopusAuthorId = csvStaff.scopusAuthorId;
            pubStaff.scopusStatus = 'Available';
            pubStaff.publications = csvStaff.publications;
            pubStaff.totalPublications = csvStaff.totalPublications;

            if (wasNA) {
                console.log(`✅ ${csvStaff.name}`);
                console.log(`   Email: ${email}`);
                console.log(`   Scopus ID: ${csvStaff.scopusAuthorId}`);
                console.log(`   Publications: ${csvStaff.totalPublications}`);
                console.log();
                updatedCount++;
            }
        } else {
            console.log(`⚠️  Not in publication JSON: ${csvStaff.name} (${email})`);
            notFoundCount++;
        }
    }

    console.log('='.repeat(80));
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⚠️  Not found: ${notFoundCount}`);
    console.log('='.repeat(80));
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

    console.log('Updated Statistics:');
    console.log(`  Staff with Scopus data: ${availableStaff.length}`);
    console.log(`  Staff without Scopus data: ${notAvailableCount}`);
    console.log(`  Publications 2023: ${calc2023}`);
    console.log(`  Publications 2024: ${calc2024}`);
    console.log(`  Publications 2025: ${calc2025}`);
    console.log(`  Total: ${totalPubs}`);
    console.log();
    console.log('✅ Publication JSON updated!');
    console.log('='.repeat(80));
}

if (require.main === module) {
    updateWithCSVScopusIDs();
}

export { updateWithCSVScopusIDs };
