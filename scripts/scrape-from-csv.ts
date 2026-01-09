/**
 * Scrape Publications from CSV File
 * 
 * Reads verified Scopus IDs from CSV and scrapes publications for the 71 staff
 * Then updates both staff directory and publication JSON
 */

import fs from 'fs';
import path from 'path';

// Configuration
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';
const RATE_LIMIT_DELAY_MS = 500;
const MAX_RETRIES = 3;
const YEARS_TO_SCRAPE = [2023, 2024, 2025];
const CSV_PATH = path.join(process.cwd(), 'data', 'Verified Scopus ID(71).csv');

interface CSVStaff {
    name: string;
    orcid: string;
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

function parseCSV(csvContent: string): CSVStaff[] {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    const staff: CSVStaff[] = [];

    // Skip header row (assuming first row is header)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by comma, handling potential quotes
        const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));

        const name = columns[0] || '';
        const orcid = columns[1] || 'NA';
        const scopusId = columns[2] || 'NA';
        const hasValidId = scopusId !== 'NA' && scopusId !== '';

        if (name) {
            staff.push({ name, orcid, scopusId, hasValidId });
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

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeFromCSV(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Scraping Publications from CSV File');
    console.log('='.repeat(80));
    console.log();

    // Read CSV file
    console.log(`Reading CSV file: ${CSV_PATH}`);
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const csvStaff = parseCSV(csvContent);

    console.log(`Loaded ${csvStaff.length} staff from CSV`);
    console.log();

    // Load staff directory to match names with emails
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    // Create a mapping of name to staff details
    const staffDetailsMap = new Map<string, any>();
    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (lkcfes) {
        const departments = lkcfes.departments || {};

        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            const staff = deptData.staff || [];

            for (const member of staff) {
                staffDetailsMap.set(member.name, member);
            }
        }
    }

    console.log('='.repeat(80));
    console.log('Step 1: Updating Staff Directory with Scopus IDs from CSV');
    console.log('='.repeat(80));
    console.log();

    let updatedCount = 0;

    for (const csvEntry of csvStaff) {
        if (!csvEntry.hasValidId) continue;

        const staffMember = staffDetailsMap.get(csvEntry.name);

        if (staffMember) {
            const newUrl = `https://www.scopus.com/authid/detail.uri?authorId=${csvEntry.scopusId}`;
            staffMember.scopusUrl = newUrl;

            console.log(`✅ Updated: ${csvEntry.name}`);
            console.log(`   Scopus ID: ${csvEntry.scopusId}`);

            updatedCount++;
        } else {
            console.log(`⚠️  Not found in directory: ${csvEntry.name}`);
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
    console.log(`✅ Staff directory saved`);
    console.log();

    console.log('='.repeat(80));
    console.log('Step 2: Scraping Publications');
    console.log('='.repeat(80));
    console.log();

    const staffToScrape = csvStaff.filter(s => s.hasValidId);
    console.log(`Staff to scrape: ${staffToScrape.length}`);
    console.log(`Staff without IDs (NA): ${csvStaff.length - staffToScrape.length}`);
    console.log();

    const scrapedResults: ScrapedResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < staffToScrape.length; i++) {
        const csvEntry = staffToScrape[i];
        const progress = `[${i + 1}/${staffToScrape.length}]`;

        console.log(`${progress} ${csvEntry.name}`);
        console.log(`  Scopus ID: ${csvEntry.scopusId}`);
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

        // Get staff details from directory
        const staffMember = staffDetailsMap.get(csvEntry.name);
        const searchId = staffMember?.searchId || '';
        const email = staffMember?.email || '';
        const department = staffMember?.department || '';
        const departmentAcronym = staffMember?.departmentAcronym || '';

        scrapedResults.push({
            searchId,
            name: csvEntry.name,
            email,
            department,
            departmentAcronym,
            scopusAuthorId: csvEntry.scopusId,
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
        'lkcfes-71-staff-results.json',
        JSON.stringify({
            metadata: {
                scrapedAt: new Date().toISOString(),
                source: 'CSV file: Verified Scopus ID(71).csv',
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
    console.log(`✅ Scraped results saved: lkcfes-71-staff-results.json`);
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

    // Create a set of existing emails to avoid duplicates
    const existingEmails = new Set(existingResults.map((r: any) => r.email));

    // Only add new staff that aren't already in the results
    const newResults = scrapedResults.filter(r => !existingEmails.has(r.email));

    console.log(`Existing staff in publication JSON: ${existingResults.length}`);
    console.log(`New staff to add: ${newResults.length}`);
    console.log(`Duplicates skipped: ${scrapedResults.length - newResults.length}`);
    console.log();

    const mergedResults = [...existingResults, ...newResults];

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
        inaccessibleStaff: csvStaff.length - staffToScrape.length,
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
    console.log(`  Previously in database: ${existingResults.length}`);
    console.log(`  Newly added: ${newResults.length}`);
    console.log(`  Without Scopus IDs (NA): ${csvStaff.length - staffToScrape.length}`);
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
    scrapeFromCSV()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { scrapeFromCSV };
