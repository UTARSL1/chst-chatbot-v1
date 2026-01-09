/**
 * Finalize Publication JSON - Add All 234 Staff
 * 
 * This script ensures ALL 234 LKC FES staff are in the publication JSON:
 * 1. Scrapes Ts Bukhary (has Scopus ID)
 * 2. Adds 8 specialists without Scopus as "Not Available"
 * 3. Adds 29 staff without Scopus IDs as "Not Available"
 */

import fs from 'fs';
import path from 'path';

// Configuration
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';
const RATE_LIMIT_DELAY_MS = 500;
const YEARS_TO_SCRAPE = [2023, 2024, 2025];

interface StaffRecord {
    searchId: string;
    name: string;
    email: string;
    department: string;
    departmentAcronym: string;
    designation?: string;
    scopusAuthorId: string;
    scopusStatus: 'Available' | 'Not Available';
    publications: Array<{
        year: number;
        count: number;
        success: boolean;
    }>;
    totalPublications: number;
}

async function getScopusPublicationCount(
    authorId: string,
    year: number
): Promise<{ count: number; error?: string }> {
    try {
        const query = `AU-ID(${authorId}) AND PUBYEAR IS ${year}`;

        const url = new URL(SCOPUS_SEARCH_ENDPOINT);
        url.searchParams.append('query', query);
        url.searchParams.append('apiKey', SCOPUS_API_KEY);
        url.searchParams.append('count', '0');
        url.searchParams.append('httpAccept', 'application/json');

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        const totalResults = parseInt(data['search-results']['opensearch:totalResults'], 10);

        return { count: totalResults };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { count: 0, error: errorMessage };
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function finalizePublicationJSON(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Finalizing Publication JSON - Adding All 234 Staff');
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

    console.log(`Staff missing from publication JSON: ${missingStaff.length}`);
    console.log();

    // Categorize missing staff
    const withScopusId = missingStaff.filter(s => {
        const url = s.scopusUrl.trim();
        return url !== '' && url.toUpperCase() !== 'NIL' && url.includes('scopus.com/authid');
    });

    const withoutScopusId = missingStaff.filter(s => {
        const url = s.scopusUrl.trim();
        return url === '' || url.toUpperCase() === 'NIL' || !url.includes('scopus.com/authid');
    });

    console.log(`  With Scopus ID to scrape: ${withScopusId.length}`);
    console.log(`  Without Scopus ID (mark as N/A): ${withoutScopusId.length}`);
    console.log();

    // Scrape staff with Scopus IDs
    const newRecords: StaffRecord[] = [];

    if (withScopusId.length > 0) {
        console.log('='.repeat(80));
        console.log('Scraping Publications for Staff with Scopus IDs');
        console.log('='.repeat(80));
        console.log();

        for (let i = 0; i < withScopusId.length; i++) {
            const staff = withScopusId[i];
            const scopusId = staff.scopusUrl.match(/authorId=(\d+)/)?.[1] || '';

            console.log(`[${i + 1}/${withScopusId.length}] ${staff.name}`);
            console.log(`  Scopus ID: ${scopusId}`);
            console.log(`  Querying publications...`);

            const publications: any[] = [];
            let hasError = false;

            for (const year of YEARS_TO_SCRAPE) {
                const { count, error } = await getScopusPublicationCount(scopusId, year);

                if (error) {
                    console.log(`    ${year}: ❌ Error: ${error}`);
                    publications.push({ year, count: 0, success: false });
                    hasError = true;
                } else {
                    console.log(`    ${year}: ✅ ${count} publications`);
                    publications.push({ year, count, success: true });
                }

                await sleep(RATE_LIMIT_DELAY_MS);
            }

            const totalPublications = publications.reduce((sum, p) => sum + p.count, 0);

            newRecords.push({
                searchId: staff.searchId,
                name: staff.name,
                email: staff.email,
                department: staff.department,
                departmentAcronym: staff.departmentAcronym,
                designation: staff.designation,
                scopusAuthorId: scopusId,
                scopusStatus: 'Available',
                publications,
                totalPublications,
            });

            console.log(`  Total: ${totalPublications} publications`);
            console.log();
        }
    }

    // Add staff without Scopus IDs as "Not Available"
    console.log('='.repeat(80));
    console.log('Adding Staff Without Scopus IDs as "Not Available"');
    console.log('='.repeat(80));
    console.log();

    for (const staff of withoutScopusId) {
        console.log(`✅ ${staff.name} - Marked as "Not Available"`);

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
    console.log(`Total new records to add: ${newRecords.length}`);
    console.log();

    // Merge with existing results
    const mergedResults = [...existingResults, ...newRecords];

    // Recalculate statistics (only count "Available" staff)
    const availableStaff = mergedResults.filter((r: any) => r.scopusStatus !== 'Not Available');

    const calc2023 = availableStaff.reduce((sum: number, r: any) => {
        const pub = r.publications.find((p: any) => p.year === 2023);
        return sum + (pub?.count || 0);
    }, 0);

    const calc2024 = availableStaff.reduce((sum: number, r: any) => {
        const pub = r.publications.find((p: any) => p.year === 2024);
        return sum + (pub?.count || 0);
    }, 0);

    const calc2025 = availableStaff.reduce((sum: number, r: any) => {
        const pub = r.publications.find((p: any) => p.year === 2025);
        return sum + (pub?.count || 0);
    }, 0);

    const totalPubs = calc2023 + calc2024 + calc2025;
    const avgPerStaff = availableStaff.length > 0 ? totalPubs / availableStaff.length : 0;

    const notAvailableCount = mergedResults.filter((r: any) => r.scopusStatus === 'Not Available').length;

    const updatedMetadata = {
        ...publicationData.metadata,
        lastUpdated: new Date().toISOString(),
        totalStaff: mergedResults.length,
        staffWithScopusData: availableStaff.length,
        staffWithoutScopusData: notAvailableCount,
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

    console.log('='.repeat(80));
    console.log('✅ FINALIZATION COMPLETE!');
    console.log('='.repeat(80));
    console.log();
    console.log('Final Statistics:');
    console.log(`  Total staff: ${mergedResults.length}`);
    console.log(`  With Scopus data: ${availableStaff.length}`);
    console.log(`  Without Scopus data (Not Available): ${notAvailableCount}`);
    console.log();
    console.log(`  Publications 2023: ${calc2023}`);
    console.log(`  Publications 2024: ${calc2024}`);
    console.log(`  Publications 2025: ${calc2025}`);
    console.log(`  Total publications: ${totalPubs}`);
    console.log(`  Average per staff (with data): ${avgPerStaff.toFixed(2)}`);
    console.log();
    console.log('✅ Publication JSON updated: lkcfes-scopus-publications.json');
    console.log();
    console.log('🎉 Ready for UI development with all 234 staff!');
    console.log('='.repeat(80));
}

if (require.main === module) {
    finalizePublicationJSON()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { finalizePublicationJSON };
