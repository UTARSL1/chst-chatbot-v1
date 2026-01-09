/**
 * Sync Publication JSON with Edited CSV
 * Updates the publication JSON to match the manually edited CSV file
 */

import fs from 'fs';

function syncPublicationWithCSV(): void {
    console.log('='.repeat(80));
    console.log('Syncing Publication JSON with CSV');
    console.log('='.repeat(80));
    console.log();

    // Load publication JSON
    const publicationData = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

    // Read CSV
    const csvContent = fs.readFileSync('lkcfes-234-staff-final.csv', 'utf-8');
    const lines = csvContent.split('\n').filter(l => l.trim());

    console.log(`CSV lines: ${lines.length - 1} (excluding header)`);
    console.log(`Publication JSON records: ${publicationData.results.length}`);
    console.log();

    let updatedCount = 0;
    let addedCount = 0;

    // Process each CSV line (skip header)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim());

        // Extract fields
        const name = parts[0] || '';
        const email = parts[1] || '';
        const scopusId = parts[2] || 'NA';
        const dept = parts[3] || 'NA';

        // Find in publication JSON by email (or name if no email)
        let pubStaff = null;

        if (email && email !== 'NA') {
            pubStaff = publicationData.results.find((r: any) => r.email === email);
        } else {
            pubStaff = publicationData.results.find((r: any) => r.name === name);
        }

        if (pubStaff) {
            // Update existing record
            let changed = false;

            if (scopusId !== 'NA' && pubStaff.scopusAuthorId !== scopusId) {
                pubStaff.scopusAuthorId = scopusId;
                pubStaff.scopusStatus = 'Available';
                changed = true;
            }

            if (dept !== 'NA' && pubStaff.departmentAcronym !== dept) {
                pubStaff.departmentAcronym = dept;
                changed = true;
            }

            if (email && email !== 'NA' && pubStaff.email !== email) {
                pubStaff.email = email;
                changed = true;
            }

            if (changed) {
                console.log(`✅ Updated: ${name}`);
                updatedCount++;
            }
        } else {
            // Add new record (shouldn't happen, but just in case)
            console.log(`⚠️  Not found in JSON: ${name}`);
        }
    }

    console.log();
    console.log('='.repeat(80));
    console.log(`✅ Updated ${updatedCount} records`);
    console.log('='.repeat(80));
    console.log();

    // Recalculate statistics
    const availableStaff = publicationData.results.filter((r: any) =>
        r.scopusStatus !== 'Not Available' && r.scopusAuthorId !== 'NA'
    );

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

    const notAvailableCount = publicationData.results.filter((r: any) =>
        r.scopusStatus === 'Not Available' || r.scopusAuthorId === 'NA'
    ).length;

    publicationData.metadata.statistics = {
        publications2023: calc2023,
        publications2024: calc2024,
        publications2025: calc2025,
        totalPublications: totalPubs,
        averagePerStaff: parseFloat(avgPerStaff.toFixed(2)),
    };

    publicationData.metadata.staffWithScopusData = availableStaff.length;
    publicationData.metadata.staffWithoutScopusData = notAvailableCount;
    publicationData.metadata.totalStaff = publicationData.results.length;
    publicationData.metadata.lastUpdated = new Date().toISOString();

    // Save
    fs.writeFileSync('lkcfes-scopus-publications.json', JSON.stringify(publicationData, null, 2), 'utf-8');

    console.log('Final Statistics:');
    console.log(`  Total staff: ${publicationData.results.length}`);
    console.log(`  With Scopus data: ${availableStaff.length}`);
    console.log(`  Without Scopus data: ${notAvailableCount}`);
    console.log(`  Publications 2023: ${calc2023}`);
    console.log(`  Publications 2024: ${calc2024}`);
    console.log(`  Publications 2025: ${calc2025}`);
    console.log(`  Total publications: ${totalPubs}`);
    console.log(`  Average per staff: ${avgPerStaff.toFixed(2)}`);
    console.log();
    console.log('✅ Publication JSON synced with CSV!');
    console.log('='.repeat(80));
}

if (require.main === module) {
    syncPublicationWithCSV();
}

export { syncPublicationWithCSV };
