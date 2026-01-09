/**
 * Update Staff Directory and Scrape Publications for 71 Staff
 * 
 * This script:
 * 1. Updates staff_directory.json with verified Scopus IDs
 * 2. Scrapes publications for staff with valid IDs (skips NA)
 * 3. Merges results into lkcfes-scopus-publications.json
 */

import fs from 'fs';
import path from 'path';

// Verified Scopus IDs for the 71 staff (in order from the list)
const verifiedScopusIds = [
    '4006104220', '57193488361', '57214495023', '56023747100', '13609512600',
    '55612830400', '53667742000', '57207802878', '36085620800', '55904134700',
    '32958218800', '57708546895', '37297146910', '55793279400', '7008518001',
    '57200855700', '57210423928', '36652697900', '7102797370', '57201580284',
    '56015675500', '55927448200', '58962466100', '55914572800', '57937358900',
    'NA', 'NA', '54900105700', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA',
    '57371685100', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA',
    '57202646410', 'NA', '57201011346', '57193720365', '56804045000', '57372696600',
    '15137426100', '57000142000', '57114634400', '35105219200', '57554556900',
    '7402818144', '56042127900', '6005476980'
];

// Configuration
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';
const RATE_LIMIT_DELAY_MS = 500;
const MAX_RETRIES = 3;
const YEARS_TO_SCRAPE = [2023, 2024, 2025];

interface StaffUpdate {
    email: string;
    name: string;
    scopusId: string;
    hasValidId: boolean;
}

interface PublicationData {
    year: number;
    count: number;
    success: boolean;
    error?: string;
}

interface ScrapedResult {
    searchId: string;
    name: string;
    email: string;
    department: string;
    departmentAcronym: string;
    scopusAuthorId: string;
    publications: PublicationData[];
    totalPublications: number;
}

async function getScopusPublicationCount(
    authorId: string,
    year: number,
    retryCount = 0
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

            if (response.status === 429 && retryCount < MAX_RETRIES) {
                console.log(`    ⏳ Rate limited. Waiting 5 seconds before retry ${retryCount + 1}/${MAX_RETRIES}...`);
                await sleep(5000);
                return getScopusPublicationCount(authorId, year, retryCount + 1);
            }

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

async function updateAndScrape(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Updating Staff Directory and Scraping Publications');
    console.log('='.repeat(80));
    console.log();

    // Load inaccessible staff list
    const inaccessibleData = JSON.parse(
        fs.readFileSync('lkcfes-inaccessible-scopus.json', 'utf-8')
    );
    const inaccessibleStaff = inaccessibleData.staff;

    // Load staff directory
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    // Create mapping of email to Scopus ID
    const staffUpdates: StaffUpdate[] = [];

    for (let i = 0; i < inaccessibleStaff.length; i++) {
        const staff = inaccessibleStaff[i];
        const scopusId = verifiedScopusIds[i];
        const hasValidId = scopusId !== 'NA';

        staffUpdates.push({
            email: staff.email,
            name: staff.name,
            scopusId,
            hasValidId,
        });
    }

    console.log('Step 1: Updating Staff Directory');
    console.log('='.repeat(80));

    let updatedCount = 0;
    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (lkcfes) {
        const departments = lkcfes.departments || {};

        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            const staff = deptData.staff || [];

            for (const member of staff) {
                const update = staffUpdates.find(u => u.email === member.email);

                if (update && update.hasValidId) {
                    const newUrl = `https://www.scopus.com/authid/detail.uri?authorId=${update.scopusId}`;
                    member.scopusUrl = newUrl;

                    console.log(`✅ Updated: ${member.name}`);
                    console.log(`   New Scopus ID: ${update.scopusId}`);

                    updatedCount++;
                }
            }
        }
    }

    console.log();
    console.log(`Total Scopus URLs updated: ${updatedCount}`);
    console.log();

    // Save updated staff directory
    fs.writeFileSync(
        staffDirPath,
        JSON.stringify(staffDirectory, null, 2),
        'utf-8'
    );
    console.log(`✅ Staff directory saved: ${staffDirPath}`);
    console.log();

    console.log('='.repeat(80));
    console.log('Step 2: Scraping Publications for Staff with Valid IDs');
    console.log('='.repeat(80));
    console.log();

    const staffToScrape = staffUpdates.filter(u => u.hasValidId);
    console.log(`Staff to scrape: ${staffToScrape.length}`);
    console.log(`Staff without IDs (NA): ${staffUpdates.length - staffToScrape.length}`);
    console.log();

    const scrapedResults: ScrapedResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < staffToScrape.length; i++) {
        const staff = staffToScrape[i];
        const progress = `[${i + 1}/${staffToScrape.length}]`;

        console.log(`${progress} ${staff.name}`);
        console.log(`  Email: ${staff.email}`);
        console.log(`  Scopus ID: ${staff.scopusId}`);
        console.log(`  Querying publications...`);

        const publications: PublicationData[] = [];
        let hasError = false;

        for (const year of YEARS_TO_SCRAPE) {
            const { count, error } = await getScopusPublicationCount(staff.scopusId, year);

            if (error) {
                console.log(`    ${year}: ❌ Error: ${error}`);
                publications.push({ year, count: 0, success: false, error });
                hasError = true;
            } else {
                console.log(`    ${year}: ✅ ${count} publications`);
                publications.push({ year, count, success: true });
            }

            await sleep(RATE_LIMIT_DELAY_MS);
        }

        const totalPublications = publications.reduce((sum, p) => sum + p.count, 0);

        // Find staff details from directory
        let searchId = '';
        let department = '';
        let departmentAcronym = '';

        if (lkcfes) {
            const departments = lkcfes.departments || {};

            for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
                const staffList = deptData.staff || [];
                const member = staffList.find((m: any) => m.email === staff.email);

                if (member) {
                    searchId = member.searchId;
                    department = member.department;
                    departmentAcronym = member.departmentAcronym;
                    break;
                }
            }
        }

        scrapedResults.push({
            searchId,
            name: staff.name,
            email: staff.email,
            department,
            departmentAcronym,
            scopusAuthorId: staff.scopusId,
            publications,
            totalPublications,
        });

        console.log(`  Total (2023-2025): ${totalPublications} publications`);
        console.log();

        if (hasError) {
            errorCount++;
        } else {
            successCount++;
        }

        if (i < staffToScrape.length - 1) {
            await sleep(RATE_LIMIT_DELAY_MS);
        }
    }

    console.log('='.repeat(80));
    console.log('Scraping Summary');
    console.log('='.repeat(80));
    console.log(`Total scraped: ${staffToScrape.length}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log();

    // Calculate statistics
    const totalPubs2023 = scrapedResults.reduce((sum, r) => {
        const pub = r.publications.find(p => p.year === 2023);
        return sum + (pub?.count || 0);
    }, 0);

    const totalPubs2024 = scrapedResults.reduce((sum, r) => {
        const pub = r.publications.find(p => p.year === 2024);
        return sum + (pub?.count || 0);
    }, 0);

    const totalPubs2025 = scrapedResults.reduce((sum, r) => {
        const pub = r.publications.find(p => p.year === 2025);
        return sum + (pub?.count || 0);
    }, 0);

    const totalPubs = totalPubs2023 + totalPubs2024 + totalPubs2025;

    console.log(`Publications found:`);
    console.log(`  2023: ${totalPubs2023}`);
    console.log(`  2024: ${totalPubs2024}`);
    console.log(`  2025: ${totalPubs2025}`);
    console.log(`  Total: ${totalPubs}`);
    console.log();

    // Save scraped results
    fs.writeFileSync(
        'lkcfes-additional-scopus-results.json',
        JSON.stringify({
            metadata: {
                scrapedAt: new Date().toISOString(),
                years: YEARS_TO_SCRAPE,
                totalStaff: staffToScrape.length,
                successCount,
                errorCount,
                statistics: {
                    publications2023: totalPubs2023,
                    publications2024: totalPubs2024,
                    publications2025: totalPubs2025,
                    totalPublications: totalPubs,
                },
            },
            results: scrapedResults,
        }, null, 2),
        'utf-8'
    );
    console.log(`✅ Scraped results saved: lkcfes-additional-scopus-results.json`);
    console.log();

    console.log('='.repeat(80));
    console.log('Step 3: Merging into Main Publication JSON');
    console.log('='.repeat(80));
    console.log();

    // Load existing publication data
    const publicationData = JSON.parse(
        fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8')
    );

    const existingResults = publicationData.results;
    const mergedResults = [...existingResults, ...scrapedResults];

    // Recalculate total statistics
    const grandTotal2023 = publicationData.metadata.statistics.publications2023 + totalPubs2023;
    const grandTotal2024 = publicationData.metadata.statistics.publications2024 + totalPubs2024;
    const grandTotal2025 = publicationData.metadata.statistics.publications2025 + totalPubs2025;
    const grandTotal = grandTotal2023 + grandTotal2024 + grandTotal2025;
    const avgPerStaff = mergedResults.length > 0 ? grandTotal / mergedResults.length : 0;

    const updatedMetadata = {
        ...publicationData.metadata,
        lastUpdated: new Date().toISOString(),
        totalStaff: mergedResults.length,
        accessibleStaff: mergedResults.length,
        inaccessibleStaff: staffUpdates.length - staffToScrape.length,
        statistics: {
            publications2023: grandTotal2023,
            publications2024: grandTotal2024,
            publications2025: grandTotal2025,
            totalPublications: grandTotal,
            averagePerStaff: parseFloat(avgPerStaff.toFixed(2)),
        },
    };

    fs.writeFileSync(
        'lkcfes-scopus-publications.json',
        JSON.stringify({
            metadata: updatedMetadata,
            results: mergedResults,
        }, null, 2),
        'utf-8'
    );

    console.log('✅ Updated publication JSON saved');
    console.log();

    console.log('='.repeat(80));
    console.log('FINAL STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total Staff: ${mergedResults.length}`);
    console.log(`  With Scopus IDs: ${mergedResults.length}`);
    console.log(`  Without Scopus IDs: ${staffUpdates.length - staffToScrape.length}`);
    console.log();
    console.log(`Total Publications (2023-2025): ${grandTotal}`);
    console.log(`  2023: ${grandTotal2023}`);
    console.log(`  2024: ${grandTotal2024}`);
    console.log(`  2025: ${grandTotal2025}`);
    console.log(`  Average per staff: ${avgPerStaff.toFixed(2)}`);
    console.log();
    console.log('='.repeat(80));
    console.log('✅ ALL UPDATES COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
}

if (require.main === module) {
    updateAndScrape()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { updateAndScrape };
