/**
 * Re-scrape Staff with 0 Publications
 * 
 * Identifies staff with 0 total publications and re-scrapes their data
 * Then updates the existing JSON file
 */

import fs from 'fs';
import path from 'path';

// Configuration
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';
const RATE_LIMIT_DELAY_MS = 500;
const MAX_RETRIES = 3;
const YEARS_TO_SCRAPE = [2023, 2024, 2025];
const PUBLICATION_JSON_PATH = path.join(process.cwd(), 'lkcfes-scopus-publications.json');
const CSV_PATH = path.join(process.cwd(), 'lkcfes-234-staff-final.csv');

interface PublicationData {
    year: number;
    count: number;
    success: boolean;
    error?: string;
}

interface StaffResult {
    searchId: string;
    name: string;
    email: string;
    department: string;
    departmentAcronym: string;
    designation?: string;
    scopusAuthorId: string;
    scopusUrl: string;
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

async function rescrapeZeroPublicationStaff(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Re-scraping Staff with 0 Publications');
    console.log('='.repeat(80));
    console.log();

    // Load existing publication data
    console.log(`Reading: ${PUBLICATION_JSON_PATH}`);
    const publicationData = JSON.parse(fs.readFileSync(PUBLICATION_JSON_PATH, 'utf-8'));
    const existingResults: StaffResult[] = publicationData.results;

    // Find staff with 0 total publications and valid Scopus IDs
    const zeroPublicationStaff = existingResults.filter(staff => {
        const hasValidId = staff.scopusAuthorId && staff.scopusAuthorId !== 'NA';
        const hasZeroPublications = staff.totalPublications === 0 ||
            !staff.publications ||
            staff.publications.length === 0 ||
            staff.publications.every(p => p.count === 0);

        return hasValidId && hasZeroPublications;
    });

    console.log(`Total staff in database: ${existingResults.length}`);
    console.log(`Staff with 0 publications (to re-scrape): ${zeroPublicationStaff.length}`);
    console.log();

    if (zeroPublicationStaff.length === 0) {
        console.log('✅ No staff with 0 publications found. Nothing to re-scrape.');
        return;
    }

    // Also load CSV to get any missing staff
    console.log(`Reading CSV: ${CSV_PATH}`);
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const csvLines = csvContent.split('\n').filter(line => line.trim() !== '');

    const csvStaffMap = new Map<string, { name: string; scopusId: string; department: string }>();
    for (let i = 1; i < csvLines.length; i++) {
        const line = csvLines[i].trim();
        if (!line) continue;

        const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        const name = columns[0] || '';
        const email = columns[1] || '';
        const scopusId = columns[2] || 'NA';
        const department = columns[3] || '';

        if (email && scopusId !== 'NA') {
            csvStaffMap.set(email, { name, scopusId, department });
        }
    }

    // Check for staff in CSV but not in JSON
    const existingEmails = new Set(existingResults.map(s => s.email));
    const missingStaff: StaffResult[] = [];

    for (const [email, csvData] of csvStaffMap.entries()) {
        if (!existingEmails.has(email)) {
            console.log(`⚠️  Found in CSV but not in JSON: ${csvData.name} (${email})`);
            missingStaff.push({
                searchId: '',
                name: csvData.name,
                email: email,
                department: '',
                departmentAcronym: csvData.department,
                scopusAuthorId: csvData.scopusId,
                scopusUrl: `https://www.scopus.com/authid/detail.uri?authorId=${csvData.scopusId}`,
                publications: [],
                totalPublications: 0,
            });
        }
    }

    const allToRescrape = [...zeroPublicationStaff, ...missingStaff];
    console.log(`Total to re-scrape: ${allToRescrape.length}`);
    console.log();

    console.log('='.repeat(80));
    console.log('Starting Re-scrape');
    console.log('='.repeat(80));
    console.log();

    const updatedStaff: Map<string, StaffResult> = new Map();
    let successCount = 0;
    let errorCount = 0;

    // Helper function to save progress
    const saveProgress = () => {
        const mergedResults = existingResults.map(staff => {
            const updated = updatedStaff.get(staff.email);
            return updated || staff;
        });

        for (const [email, staff] of updatedStaff.entries()) {
            if (!existingEmails.has(email)) {
                mergedResults.push(staff);
            }
        }

        const totalPubs2023 = mergedResults.reduce((sum, r) => {
            const pub = r.publications?.find(p => p.year === 2023);
            return sum + (pub?.count || 0);
        }, 0);

        const totalPubs2024 = mergedResults.reduce((sum, r) => {
            const pub = r.publications?.find(p => p.year === 2024);
            return sum + (pub?.count || 0);
        }, 0);

        const totalPubs2025 = mergedResults.reduce((sum, r) => {
            const pub = r.publications?.find(p => p.year === 2025);
            return sum + (pub?.count || 0);
        }, 0);

        const totalPubs = totalPubs2023 + totalPubs2024 + totalPubs2025;
        const staffWithScopus = mergedResults.filter(s => s.scopusAuthorId && s.scopusAuthorId !== 'NA').length;
        const avgPerStaff = staffWithScopus > 0 ? totalPubs / staffWithScopus : 0;

        const updatedMetadata = {
            ...publicationData.metadata,
            lastUpdated: new Date().toISOString(),
            totalStaff: mergedResults.length,
            accessibleStaff: staffWithScopus,
            staffWithScopusData: staffWithScopus,
            staffWithoutScopusData: mergedResults.length - staffWithScopus,
            statistics: {
                publications2023: totalPubs2023,
                publications2024: totalPubs2024,
                publications2025: totalPubs2025,
                totalPublications: totalPubs,
                averagePerStaff: parseFloat(avgPerStaff.toFixed(2)),
            },
        };

        fs.writeFileSync(
            PUBLICATION_JSON_PATH,
            JSON.stringify({
                metadata: updatedMetadata,
                results: mergedResults,
            }, null, 2),
            'utf-8'
        );
    };

    for (let i = 0; i < allToRescrape.length; i++) {
        const staff = allToRescrape[i];
        const progress = `[${i + 1}/${allToRescrape.length}]`;

        try {
            console.log(`${progress} ${staff.name}`);
            console.log(`  Email: ${staff.email}`);
            console.log(`  Scopus ID: ${staff.scopusAuthorId}`);
            console.log(`  Querying publications...`);

            const publications: PublicationData[] = [];
            let hasError = false;

            for (const year of YEARS_TO_SCRAPE) {
                const { count, error } = await getScopusPublicationCount(staff.scopusAuthorId, year);

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

            updatedStaff.set(staff.email, {
                ...staff,
                publications,
                totalPublications,
            });

            console.log(`  Total (2023-2025): ${totalPublications} publications`);
            console.log();

            if (hasError) {
                errorCount++;
            } else {
                successCount++;

                // Save progress every 5 successful scrapes
                if (successCount % 5 === 0) {
                    console.log(`💾 Saving progress... (${successCount} successful scrapes)`);
                    saveProgress();
                    console.log(`✅ Progress saved`);
                    console.log();
                }
            }

            if (i < allToRescrape.length - 1) {
                await sleep(RATE_LIMIT_DELAY_MS);
            }
        } catch (error) {
            console.error(`❌ Fatal error processing ${staff.name}:`, error);
            errorCount++;
            // Continue with next staff member
        }
    }

    console.log('='.repeat(80));
    console.log('Re-scraping Summary');
    console.log('='.repeat(80));
    console.log(`Total attempted: ${allToRescrape.length}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log();

    // Final save
    console.log('💾 Saving final results...');
    saveProgress();
    console.log('✅ Updated publication JSON saved');
    console.log();

    console.log('='.repeat(80));
    console.log('✅ RE-SCRAPING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
}

if (require.main === module) {
    rescrapeZeroPublicationStaff()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { rescrapeZeroPublicationStaff };
