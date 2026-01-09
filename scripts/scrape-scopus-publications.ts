/**
 * Scopus Publication Scraper
 * 
 * This script scrapes publication counts from Scopus for staff members
 * who have Scopus author IDs in the staff directory.
 * 
 * Usage:
 *   npx tsx scripts/scrape-scopus-publications.ts --year 2025
 *   npx tsx scripts/scrape-scopus-publications.ts --year 2025 --faculty "LKC FES"
 *   npx tsx scripts/scrape-scopus-publications.ts --year 2025 --output results.json
 */

import fs from 'fs';
import path from 'path';

// Configuration
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';
const RATE_LIMIT_DELAY_MS = 500; // 2 requests per second to be safe
const MAX_RETRIES = 3;

interface StaffMember {
    searchId: string;
    name: string;
    email: string;
    faculty: string;
    facultyAcronym: string;
    department: string;
    departmentAcronym: string;
    scopusUrl: string;
    googleScholarUrl?: string;
    orcidUrl?: string;
}

interface PublicationResult {
    searchId: string;
    name: string;
    email: string;
    faculty: string;
    department: string;
    scopusAuthorId: string;
    year: number;
    publicationCount: number;
    success: boolean;
    error?: string;
}

interface ScopusApiResponse {
    'search-results': {
        'opensearch:totalResults': string;
        'opensearch:startIndex': string;
        'opensearch:itemsPerPage': string;
    };
}

/**
 * Extract Scopus Author ID from Scopus URL
 */
function extractScopusAuthorId(scopusUrl: string): string | null {
    if (!scopusUrl) return null;

    // Match patterns like:
    // https://www.scopus.com/authid/detail.uri?authorId=37012425700
    // https://www-scopus-com.libezp2.utar.edu.my/authid/detail.uri?authorId=55648453400
    const match = scopusUrl.match(/authorId=(\d+)/);
    return match ? match[1] : null;
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
        // Construct query: AU-ID(authorId) AND PUBYEAR IS year
        const query = `AU-ID(${authorId}) AND PUBYEAR IS ${year}`;

        const url = new URL(SCOPUS_SEARCH_ENDPOINT);
        url.searchParams.append('query', query);
        url.searchParams.append('apiKey', SCOPUS_API_KEY);
        url.searchParams.append('count', '0'); // We only need the total count
        url.searchParams.append('httpAccept', 'application/json');

        console.log(`  Querying Scopus for Author ID ${authorId}, Year ${year}...`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();

            // Handle rate limiting
            if (response.status === 429 && retryCount < MAX_RETRIES) {
                console.log(`  Rate limited. Waiting 5 seconds before retry ${retryCount + 1}/${MAX_RETRIES}...`);
                await sleep(5000);
                return getScopusPublicationCount(authorId, year, retryCount + 1);
            }

            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data: ScopusApiResponse = await response.json();
        const totalResults = parseInt(data['search-results']['opensearch:totalResults'], 10);

        return { count: totalResults };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  Error querying Scopus: ${errorMessage}`);
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
 * Load staff directory
 */
function loadStaffDirectory(): any {
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const data = fs.readFileSync(staffDirPath, 'utf-8');
    return JSON.parse(data);
}

/**
 * Extract all staff members with Scopus URLs
 */
function extractStaffWithScopus(staffDirectory: any, facultyFilter?: string): StaffMember[] {
    const staffMembers: StaffMember[] = [];

    const faculties = staffDirectory.faculties || {};

    for (const [facultyKey, facultyData] of Object.entries(faculties) as [string, any][]) {
        // Apply faculty filter if specified
        if (facultyFilter && facultyKey !== facultyFilter) {
            continue;
        }

        const departments = facultyData.departments || {};

        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            const staff = deptData.staff || [];

            for (const member of staff) {
                if (member.scopusUrl && member.scopusUrl.trim() !== '') {
                    staffMembers.push({
                        searchId: member.searchId,
                        name: member.name,
                        email: member.email,
                        faculty: member.faculty,
                        facultyAcronym: member.facultyAcronym,
                        department: member.department,
                        departmentAcronym: member.departmentAcronym,
                        scopusUrl: member.scopusUrl,
                        googleScholarUrl: member.googleScholarUrl,
                        orcidUrl: member.orcidUrl,
                    });
                }
            }
        }
    }

    return staffMembers;
}

/**
 * Main scraping function
 */
async function scrapeScopusPublications(
    year: number,
    facultyFilter?: string,
    outputFile?: string
): Promise<void> {
    console.log('='.repeat(80));
    console.log('Scopus Publication Scraper');
    console.log('='.repeat(80));
    console.log(`Year: ${year}`);
    console.log(`Faculty Filter: ${facultyFilter || 'All faculties'}`);
    console.log(`Output File: ${outputFile || 'Console only'}`);
    console.log('='.repeat(80));
    console.log();

    // Load staff directory
    console.log('Loading staff directory...');
    const staffDirectory = loadStaffDirectory();

    // Extract staff with Scopus URLs
    const staffMembers = extractStaffWithScopus(staffDirectory, facultyFilter);
    console.log(`Found ${staffMembers.length} staff members with Scopus profiles`);
    console.log();

    // Process each staff member
    const results: PublicationResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < staffMembers.length; i++) {
        const member = staffMembers[i];
        const progress = `[${i + 1}/${staffMembers.length}]`;

        console.log(`${progress} ${member.name} (${member.email})`);
        console.log(`  Faculty: ${member.facultyAcronym}, Department: ${member.departmentAcronym}`);

        // Extract Scopus Author ID
        const authorId = extractScopusAuthorId(member.scopusUrl);

        if (!authorId) {
            console.log(`  ⚠️  Could not extract Scopus Author ID from: ${member.scopusUrl}`);
            results.push({
                searchId: member.searchId,
                name: member.name,
                email: member.email,
                faculty: member.facultyAcronym,
                department: member.departmentAcronym,
                scopusAuthorId: '',
                year,
                publicationCount: 0,
                success: false,
                error: 'Could not extract Author ID from URL',
            });
            errorCount++;
            console.log();
            continue;
        }

        console.log(`  Scopus Author ID: ${authorId}`);

        // Query Scopus API
        const { count, error } = await getScopusPublicationCount(authorId, year);

        if (error) {
            console.log(`  ❌ Error: ${error}`);
            results.push({
                searchId: member.searchId,
                name: member.name,
                email: member.email,
                faculty: member.facultyAcronym,
                department: member.departmentAcronym,
                scopusAuthorId: authorId,
                year,
                publicationCount: 0,
                success: false,
                error,
            });
            errorCount++;
        } else {
            console.log(`  ✅ Publications in ${year}: ${count}`);
            results.push({
                searchId: member.searchId,
                name: member.name,
                email: member.email,
                faculty: member.facultyAcronym,
                department: member.departmentAcronym,
                scopusAuthorId: authorId,
                year,
                publicationCount: count,
                success: true,
            });
            successCount++;
        }

        console.log();

        // Rate limiting: wait before next request
        if (i < staffMembers.length - 1) {
            await sleep(RATE_LIMIT_DELAY_MS);
        }
    }

    // Summary
    console.log('='.repeat(80));
    console.log('Summary');
    console.log('='.repeat(80));
    console.log(`Total staff processed: ${staffMembers.length}`);
    console.log(`Successful queries: ${successCount}`);
    console.log(`Failed queries: ${errorCount}`);
    console.log();

    // Calculate statistics
    const totalPublications = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.publicationCount, 0);

    const avgPublications = successCount > 0
        ? (totalPublications / successCount).toFixed(2)
        : '0';

    console.log(`Total publications in ${year}: ${totalPublications}`);
    console.log(`Average publications per staff: ${avgPublications}`);
    console.log();

    // Top publishers
    const topPublishers = results
        .filter(r => r.success && r.publicationCount > 0)
        .sort((a, b) => b.publicationCount - a.publicationCount)
        .slice(0, 10);

    if (topPublishers.length > 0) {
        console.log('Top 10 Publishers:');
        topPublishers.forEach((r, idx) => {
            console.log(`  ${idx + 1}. ${r.name} (${r.department}): ${r.publicationCount} publications`);
        });
        console.log();
    }

    // Save results if output file specified
    if (outputFile) {
        const outputPath = path.join(process.cwd(), outputFile);
        const outputData = {
            metadata: {
                scrapedAt: new Date().toISOString(),
                year,
                facultyFilter: facultyFilter || 'all',
                totalStaff: staffMembers.length,
                successCount,
                errorCount,
                totalPublications,
                averagePublications: parseFloat(avgPublications),
            },
            results,
        };

        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
        console.log(`Results saved to: ${outputPath}`);
        console.log();
    }

    console.log('='.repeat(80));
    console.log('Scraping completed!');
    console.log('='.repeat(80));
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    let year = 2025;
    let facultyFilter: string | undefined;
    let outputFile: string | undefined;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--year' && args[i + 1]) {
            year = parseInt(args[i + 1], 10);
            i++;
        } else if (args[i] === '--faculty' && args[i + 1]) {
            facultyFilter = args[i + 1];
            i++;
        } else if (args[i] === '--output' && args[i + 1]) {
            outputFile = args[i + 1];
            i++;
        }
    }

    return { year, facultyFilter, outputFile };
}

// Run the script
if (require.main === module) {
    const { year, facultyFilter, outputFile } = parseArgs();

    scrapeScopusPublications(year, facultyFilter, outputFile)
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { scrapeScopusPublications, extractScopusAuthorId, getScopusPublicationCount };
