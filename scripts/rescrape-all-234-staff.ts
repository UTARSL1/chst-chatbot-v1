/**
 * Re-scrape All 234 Staff from lkcfes-234-staff-final.csv
 * 
 * Reads Scopus IDs from column C and scrapes publications for all staff
 * Completely replaces the existing lkcfes-scopus-publications.json
 */

import fs from 'fs';
import path from 'path';

// Configuration
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';
const RATE_LIMIT_DELAY_MS = 500;
const MAX_RETRIES = 3;
const YEARS_TO_SCRAPE = [2023, 2024, 2025];
const CSV_PATH = path.join(process.cwd(), 'lkcfes-234-staff-final.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'lkcfes-scopus-publications.json');

interface CSVStaff {
    name: string;
    email: string;
    scopusId: string;
    department: string;
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
    designation: string;
    scopusAuthorId: string;
    scopusUrl: string;
    publications: PublicationData[];
    totalPublications: number;
    hIndex: number;
    citationCount: number;
}

function parseCSV(csvContent: string): CSVStaff[] {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    const staff: CSVStaff[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by comma, handling potential quotes
        const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));

        // Sanitize name: Remove non-breaking spaces, replacement characters, and other artifacts
        let name = columns[0] || '';
        name = name
            .replace(/\u00A0/g, ' ')  // Non-breaking space
            .replace(/�/g, ' ')        // Replacement character
            .replace(/\uFFFD/g, ' ')   // Unicode replacement character
            .replace(/\s+/g, ' ')      // Multiple spaces to single space
            .trim();

        const email = columns[1] || '';
        const scopusId = columns[2] || 'NA';
        const department = columns[3] || '';
        const hasValidId = scopusId !== 'NA' && scopusId !== '' && scopusId.length > 5;

        if (name && email) {
            staff.push({ name, email, scopusId, department, hasValidId });
        }
    }

    return staff;
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

async function getAuthorMetrics(authorId: string): Promise<{ hIndex: number; citationCount: number }> {
    let hIndex = 0;
    let citationCount = 0;
    let start = 0;
    const countPerRequest = 25;
    const maxPages = 4; // Fetch up to 100 top-cited papers

    try {
        for (let page = 0; page < maxPages; page++) {
            const query = `AU-ID(${authorId})`;
            const url = new URL(SCOPUS_SEARCH_ENDPOINT);
            url.searchParams.append('query', query);
            url.searchParams.append('apiKey', SCOPUS_API_KEY);
            url.searchParams.append('count', countPerRequest.toString());
            url.searchParams.append('start', start.toString());
            url.searchParams.append('sort', 'citedby-count');
            url.searchParams.append('httpAccept', 'application/json');

            const response = await fetch(url.toString(), {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                console.log(`    ⚠️ Metrics Error: HTTP ${response.status}`);
                break;
            }

            const data = await response.json();
            const entries = data['search-results']['entry'];

            if (!entries || entries.length === 0) break;

            // Process entries
            entries.forEach((entry: any, index: number) => {
                const globalRank = start + index + 1;
                const citations = parseInt(entry['citedby-count'] || '0');

                citationCount += citations;

                // H-Index Calc
                if (citations >= globalRank) {
                    hIndex = globalRank;
                }
            });

            // If we processed fewer than requested, we are done
            if (entries.length < countPerRequest) break;

            start += countPerRequest;
            await sleep(RATE_LIMIT_DELAY_MS);
        }
    } catch (error) {
        console.error(`    ⚠️ Metrics Exception: ${error}`);
    }

    return { hIndex, citationCount };
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function rescrapeAll234Staff(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Re-scraping All 234 Staff Publications');
    console.log('='.repeat(80));
    console.log();

    // Read CSV file
    console.log(`Reading CSV file: ${CSV_PATH}`);
    if (!fs.existsSync(CSV_PATH)) {
        throw new Error(`CSV file not found: ${CSV_PATH}`);
    }

    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const csvStaff = parseCSV(csvContent);

    console.log(`Loaded ${csvStaff.length} staff from CSV`);
    console.log();

    // Load staff directory to get additional details
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    // Create a mapping of email to staff details
    const staffDetailsMap = new Map<string, any>();
    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (lkcfes) {
        const departments = lkcfes.departments || {};

        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            const staff = deptData.staff || [];

            for (const member of staff) {
                staffDetailsMap.set(member.email, member);
            }
        }
    }

    console.log('='.repeat(80));
    console.log('Scraping Publications');
    console.log('='.repeat(80));
    console.log();

    const staffToScrape = csvStaff.filter(s => s.hasValidId);
    const staffWithoutIds = csvStaff.filter(s => !s.hasValidId);

    console.log(`Staff with valid Scopus IDs: ${staffToScrape.length}`);
    console.log(`Staff without IDs (NA): ${staffWithoutIds.length}`);
    console.log();

    const scrapedResults: ScrapedResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < staffToScrape.length; i++) {
        const csvEntry = staffToScrape[i];
        const progress = `[${i + 1}/${staffToScrape.length}]`;

        console.log(`${progress} ${csvEntry.name}`);
        console.log(`  Email: ${csvEntry.email}`);
        console.log(`  Scopus ID: ${csvEntry.scopusId}`);
        console.log(`  Department: ${csvEntry.department}`);
        console.log(`  Querying publications...`);

        const publications: PublicationData[] = [];
        let hasError = false;

        for (const year of YEARS_TO_SCRAPE) {
            const { count, error } = await getScopusPublicationCount(csvEntry.scopusId, year);

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

        // Get Metrics (H-index, Citations)
        console.log(`    Fetching metrics...`);
        const { hIndex, citationCount } = await getAuthorMetrics(csvEntry.scopusId);
        console.log(`    H-index: ${hIndex}, Citations: ${citationCount}`);

        // Get staff details from directory
        const staffMember = staffDetailsMap.get(csvEntry.email);
        const searchId = staffMember?.searchId || '';
        const designation = staffMember?.designation || '';

        scrapedResults.push({
            searchId,
            name: csvEntry.name,
            email: csvEntry.email,
            department: staffMember?.department || csvEntry.department,
            departmentAcronym: csvEntry.department,
            designation,
            scopusAuthorId: csvEntry.scopusId,
            scopusUrl: `https://www.scopus.com/authid/detail.uri?authorId=${csvEntry.scopusId}`,
            publications,
            totalPublications,
            hIndex,
            citationCount,
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

    // Add staff without Scopus IDs
    for (const csvEntry of staffWithoutIds) {
        const staffMember = staffDetailsMap.get(csvEntry.email);

        scrapedResults.push({
            searchId: staffMember?.searchId || '',
            name: csvEntry.name,
            email: csvEntry.email,
            department: staffMember?.department || csvEntry.department,
            departmentAcronym: csvEntry.department,
            designation: staffMember?.designation || '',
            scopusAuthorId: 'NA',
            scopusUrl: '',
            publications: [],
            totalPublications: 0,
            hIndex: 0,
            citationCount: 0,
        });
    }

    console.log('='.repeat(80));
    console.log('Scraping Summary');
    console.log('='.repeat(80));
    console.log(`Total staff processed: ${csvStaff.length}`);
    console.log(`  With Scopus IDs (scraped): ${staffToScrape.length}`);
    console.log(`    Successful: ${successCount}`);
    console.log(`    Errors: ${errorCount}`);
    console.log(`  Without Scopus IDs (NA): ${staffWithoutIds.length}`);
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
    const avgPerStaff = staffToScrape.length > 0 ? totalPubs / staffToScrape.length : 0;

    console.log(`Publications found:`)
    console.log(`  2023: ${totalPubs2023}`);
    console.log(`  2024: ${totalPubs2024}`);
    console.log(`  2025: ${totalPubs2025}`);
    console.log(`  Total: ${totalPubs}`);
    console.log(`  Average per staff (with IDs): ${avgPerStaff.toFixed(2)}`);
    console.log(`  Total Citations: ${scrapedResults.reduce((s, r) => s + r.citationCount, 0)}`);
    console.log();

    // Save results
    const outputData = {
        metadata: {
            scrapedAt: new Date().toISOString(),
            faculty: 'LKC FES',
            years: YEARS_TO_SCRAPE,
            excludedDepartments: ['DLMSA', 'FGO'],
            totalStaff: csvStaff.length,
            accessibleStaff: staffToScrape.length,
            inaccessibleStaff: staffWithoutIds.length,
            successCount,
            errorCount,
            statistics: {
                publications2023: totalPubs2023,
                publications2024: totalPubs2024,
                publications2025: totalPubs2025,
                totalPublications: totalPubs,
                averagePerStaff: parseFloat(avgPerStaff.toFixed(2)),
            },
            lastUpdated: new Date().toISOString(),
            staffWithScopusData: staffToScrape.length,
            staffWithoutScopusData: staffWithoutIds.length,
        },
        results: scrapedResults,
    };

    fs.writeFileSync(
        OUTPUT_PATH,
        JSON.stringify(outputData, null, 2),
        'utf-8'
    );

    console.log(`✅ Results saved to: ${OUTPUT_PATH}`);
    console.log();

    console.log('='.repeat(80));
    console.log('✅ RE-SCRAPING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
}


// Execute immediately
rescrapeAll234Staff()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });

export { rescrapeAll234Staff };
