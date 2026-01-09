/**
 * Re-scrape Publications with Corrected Scopus IDs
 * 
 * This script re-scrapes publications for the 29 staff members
 * whose Scopus IDs have been manually verified and corrected.
 * 
 * Usage:
 *   npx tsx scripts/rescrape-corrected-ids.ts
 */

import fs from 'fs';

// Configuration
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';
const RATE_LIMIT_DELAY_MS = 500;
const MAX_RETRIES = 3;
const YEARS_TO_SCRAPE = [2023, 2024, 2025];

interface Correction {
    email: string;
    name: string;
    oldScopusId: string;
    newScopusId: string;
    orcid: string;
}

interface PublicationData {
    year: number;
    count: number;
    success: boolean;
    error?: string;
}

interface StaffPublicationResult {
    email: string;
    name: string;
    orcid: string;
    oldScopusId: string;
    newScopusId: string;
    publications: PublicationData[];
    totalPublications: number;
    success: boolean;
    error?: string;
}

/**
 * Query Scopus API for publication count
 */
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

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main re-scraping function
 */
async function rescrapeCorrectedIds(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Re-scraping Publications with Corrected Scopus IDs');
    console.log('='.repeat(80));
    console.log(`Years: ${YEARS_TO_SCRAPE.join(', ')}`);
    console.log('='.repeat(80));
    console.log();

    // Load corrections
    const corrections: Correction[] = JSON.parse(
        fs.readFileSync('scopus-id-corrections.json', 'utf-8')
    );

    console.log(`Loaded ${corrections.length} staff members with corrected IDs`);
    console.log();

    // Identify which IDs actually changed
    const changedIds = corrections.filter(c => c.oldScopusId !== c.newScopusId);
    const unchangedIds = corrections.filter(c => c.oldScopusId === c.newScopusId);

    console.log(`IDs that changed: ${changedIds.length}`);
    console.log(`IDs unchanged: ${unchangedIds.length}`);
    console.log();

    const results: StaffPublicationResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < corrections.length; i++) {
        const staff = corrections[i];
        const progress = `[${i + 1}/${corrections.length}]`;
        const idChanged = staff.oldScopusId !== staff.newScopusId;

        console.log(`${progress} ${staff.name}`);
        console.log(`  Email: ${staff.email}`);
        console.log(`  Old Scopus ID: ${staff.oldScopusId}`);
        console.log(`  New Scopus ID: ${staff.newScopusId} ${idChanged ? '✏️ CHANGED' : '✓ Same'}`);
        console.log(`  Querying with NEW ID...`);

        const publications: PublicationData[] = [];
        let hasError = false;
        let errorMessage = '';

        // Query for each year
        for (const year of YEARS_TO_SCRAPE) {
            const { count, error } = await getScopusPublicationCount(staff.newScopusId, year);

            if (error) {
                console.log(`    ${year}: ❌ Error: ${error}`);
                publications.push({ year, count: 0, success: false, error });
                hasError = true;
                errorMessage = error;
            } else {
                console.log(`    ${year}: ✅ ${count} publications`);
                publications.push({ year, count, success: true });
            }

            await sleep(RATE_LIMIT_DELAY_MS);
        }

        const totalPublications = publications.reduce((sum, p) => sum + p.count, 0);

        const result: StaffPublicationResult = {
            email: staff.email,
            name: staff.name,
            orcid: staff.orcid,
            oldScopusId: staff.oldScopusId,
            newScopusId: staff.newScopusId,
            publications,
            totalPublications,
            success: !hasError,
        };

        if (hasError) {
            result.error = errorMessage;
            errorCount++;
        } else {
            successCount++;
        }

        results.push(result);

        console.log(`  Total (2023-2025): ${totalPublications} publications`);

        if (idChanged && totalPublications > 0) {
            console.log(`  🎉 SUCCESS! Found publications with corrected ID!`);
        } else if (!idChanged && totalPublications === 0) {
            console.log(`  ⚠️  Still 0 publications (ID unchanged, may need further investigation)`);
        }

        console.log();

        if (i < corrections.length - 1) {
            await sleep(RATE_LIMIT_DELAY_MS);
        }
    }

    // Calculate statistics
    const totalPublications2023 = results.reduce((sum, r) => {
        const pub2023 = r.publications.find(p => p.year === 2023);
        return sum + (pub2023?.count || 0);
    }, 0);

    const totalPublications2024 = results.reduce((sum, r) => {
        const pub2024 = r.publications.find(p => p.year === 2024);
        return sum + (pub2024?.count || 0);
    }, 0);

    const totalPublications2025 = results.reduce((sum, r) => {
        const pub2025 = r.publications.find(p => p.year === 2025);
        return sum + (pub2025?.count || 0);
    }, 0);

    const totalPublications = totalPublications2023 + totalPublications2024 + totalPublications2025;

    // Summary
    console.log('='.repeat(80));
    console.log('Summary');
    console.log('='.repeat(80));
    console.log(`Total staff re-scraped: ${corrections.length}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${errorCount}`);
    console.log();
    console.log(`Publications by Year:`);
    console.log(`  2023: ${totalPublications2023} publications`);
    console.log(`  2024: ${totalPublications2024} publications`);
    console.log(`  2025: ${totalPublications2025} publications`);
    console.log(`  Total (2023-2025): ${totalPublications} publications`);
    console.log();

    if (successCount > 0) {
        const avg = (totalPublications / successCount).toFixed(2);
        console.log(`Average publications per staff: ${avg}`);
        console.log();
    }

    // Staff who now have publications
    const nowHavePublications = results.filter(r => r.totalPublications > 0);
    const stillZero = results.filter(r => r.totalPublications === 0);

    console.log(`Staff with publications found: ${nowHavePublications.length}`);
    console.log(`Staff still with 0 publications: ${stillZero.length}`);
    console.log();

    if (stillZero.length > 0) {
        console.log('Staff still with 0 publications:');
        stillZero.forEach(s => {
            console.log(`  - ${s.name} (${s.email})`);
            console.log(`    Scopus ID: ${s.newScopusId}`);
        });
        console.log();
    }

    // Save results
    const outputData = {
        metadata: {
            scrapedAt: new Date().toISOString(),
            years: YEARS_TO_SCRAPE,
            totalStaff: corrections.length,
            successCount,
            errorCount,
            statistics: {
                publications2023: totalPublications2023,
                publications2024: totalPublications2024,
                publications2025: totalPublications2025,
                totalPublications,
                averagePerStaff: successCount > 0 ? parseFloat((totalPublications / successCount).toFixed(2)) : 0,
                staffWithPublications: nowHavePublications.length,
                staffStillZero: stillZero.length,
            },
        },
        results,
    };

    fs.writeFileSync(
        'lkcfes-corrected-scopus-results.json',
        JSON.stringify(outputData, null, 2),
        'utf-8'
    );
    console.log(`✅ Results saved to: lkcfes-corrected-scopus-results.json`);
    console.log();

    console.log('='.repeat(80));
    console.log('Re-scraping completed!');
    console.log('='.repeat(80));
}

// Run the script
if (require.main === module) {
    rescrapeCorrectedIds()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { rescrapeCorrectedIds };
