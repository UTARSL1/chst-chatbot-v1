/**
 * Search Scopus by Name for Staff Without IDs
 * 
 * This script searches Scopus Author Search API by staff name
 * for the 71 staff members who don't have Scopus IDs in the directory.
 * 
 * Usage:
 *   npx tsx scripts/search-scopus-by-name.ts
 */

import fs from 'fs';

// Configuration
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_AUTHOR_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/author';
const RATE_LIMIT_DELAY_MS = 600; // Slightly slower to avoid rate limits
const MAX_RETRIES = 3;

interface InaccessibleStaff {
    searchId: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    scopusUrl: string;
    reason: string;
}

interface ScopusAuthorResult {
    'dc:identifier': string;
    'preferred-name': {
        surname: string;
        'given-name': string;
    };
    'affiliation-current'?: {
        'affiliation-name': string;
        'affiliation-id': string;
    };
    'document-count': string;
}

interface SearchResult {
    searchId: string;
    name: string;
    email: string;
    department: string;
    foundInScopus: boolean;
    authorIds: string[];
    recommendedId: string | null;
    documentCount: number;
    affiliations: string[];
    status: 'found_single' | 'found_multiple' | 'not_found' | 'error';
    notes: string;
    error?: string;
}

/**
 * Clean staff name for searching
 */
function cleanStaffName(name: string): string {
    let cleaned = name
        .replace(/^(Ir\.?|Prof\.?|Dr\.?|Ts\.?|ChM\.?|Mr\.?|Ms\.?|Mrs\.?|Cik|Sr|Encik|Puan|Ar\.?|IDr\.?)\s+/gi, '')
        .replace(/\s+(Ir\.?|Prof\.?|Dr\.?|Ts\.?|ChM\.?)$/gi, '')
        .replace(/Academician\s+/gi, '')
        .replace(/Emeritus\s+/gi, '')
        .replace(/Tan\s+Sri\s+/gi, '')
        .replace(/Dato'?\s+/gi, '')
        .replace(/Seri\s+/gi, '')
        .trim();

    cleaned = cleaned.replace(/\([^)]*\)/g, '').trim();
    cleaned = cleaned.replace(/\s+@\s+.+$/, '').trim();

    return cleaned;
}

/**
 * Extract surname for searching
 */
function extractSurname(name: string): string {
    const cleaned = cleanStaffName(name);

    // Handle Malaysian naming conventions
    if (cleaned.includes(' a/l ') || cleaned.includes(' a/p ') || cleaned.includes(' s/o ')) {
        const parts = cleaned.split(/\s+(?:a\/l|a\/p|s\/o)\s+/i);
        return parts[0].trim();
    } else if (cleaned.includes(' binti ') || cleaned.includes(' bin ')) {
        const parts = cleaned.split(/\s+(?:binti|bin)\s+/i);
        return parts[1]?.trim() || '';
    } else {
        const parts = cleaned.split(/\s+/);
        return parts[parts.length - 1];
    }
}

/**
 * Search Scopus Author Search API
 */
async function searchScopusByName(
    name: string,
    retryCount = 0
): Promise<{ authors: ScopusAuthorResult[]; error?: string }> {
    try {
        const surname = extractSurname(name);

        if (!surname) {
            return { authors: [], error: 'Could not extract surname from name' };
        }

        // Query: AUTHLAST(surname) AND AFFIL(UTAR)
        const query = `AUTHLAST(${surname}) AND AFFIL(Universiti Tunku Abdul Rahman)`;

        const url = new URL(SCOPUS_AUTHOR_SEARCH_ENDPOINT);
        url.searchParams.append('query', query);
        url.searchParams.append('apiKey', SCOPUS_API_KEY);
        url.searchParams.append('count', '25');
        url.searchParams.append('httpAccept', 'application/json');

        console.log(`    Query: ${query}`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();

            if (response.status === 429 && retryCount < MAX_RETRIES) {
                console.log(`    ⏳ Rate limited. Waiting 10 seconds before retry ${retryCount + 1}/${MAX_RETRIES}...`);
                await sleep(10000);
                return searchScopusByName(name, retryCount + 1);
            }

            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        const totalResults = parseInt(data['search-results']['opensearch:totalResults'], 10);

        if (totalResults === 0 || !data['search-results'].entry) {
            return { authors: [] };
        }

        const utarAuthors = data['search-results'].entry.filter((author: ScopusAuthorResult) => {
            const affiliationName = author['affiliation-current']?.['affiliation-name'] || '';
            return affiliationName.toLowerCase().includes('tunku abdul rahman') ||
                affiliationName.toLowerCase().includes('utar');
        });

        return { authors: utarAuthors };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { authors: [], error: errorMessage };
    }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main search function
 */
async function searchStaffByName(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Scopus Author Search by Name');
    console.log('='.repeat(80));
    console.log('Searching for 71 staff without Scopus IDs...');
    console.log('='.repeat(80));
    console.log();

    // Load inaccessible staff
    const inaccessibleData = JSON.parse(
        fs.readFileSync('lkcfes-inaccessible-scopus.json', 'utf-8')
    );

    const staffList: InaccessibleStaff[] = inaccessibleData.staff;
    console.log(`Loaded ${staffList.length} staff members to search`);
    console.log();

    const results: SearchResult[] = [];
    let foundSingleCount = 0;
    let foundMultipleCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (let i = 0; i < staffList.length; i++) {
        const staff = staffList[i];
        const progress = `[${i + 1}/${staffList.length}]`;

        console.log(`${progress} ${staff.name}`);
        console.log(`  Email: ${staff.email}`);
        console.log(`  Department: ${staff.department || 'N/A'}`);
        console.log(`  Searching Scopus...`);

        const { authors, error } = await searchScopusByName(staff.name);

        if (error) {
            console.log(`  ❌ Error: ${error}`);
            results.push({
                searchId: staff.searchId,
                name: staff.name,
                email: staff.email,
                department: staff.department,
                foundInScopus: false,
                authorIds: [],
                recommendedId: null,
                documentCount: 0,
                affiliations: [],
                status: 'error',
                notes: `Search error: ${error}`,
                error,
            });
            errorCount++;
        } else if (authors.length === 0) {
            console.log(`  ❌ Not found in Scopus`);
            results.push({
                searchId: staff.searchId,
                name: staff.name,
                email: staff.email,
                department: staff.department,
                foundInScopus: false,
                authorIds: [],
                recommendedId: null,
                documentCount: 0,
                affiliations: [],
                status: 'not_found',
                notes: 'No Scopus author profile found at UTAR',
            });
            notFoundCount++;
        } else if (authors.length === 1) {
            const author = authors[0];
            const authorId = author['dc:identifier'].replace('AUTHOR_ID:', '');
            const docCount = parseInt(author['document-count'], 10);
            const affiliation = author['affiliation-current']?.['affiliation-name'] || 'Unknown';

            console.log(`  ✅ Found 1 author:`);
            console.log(`     Scopus ID: ${authorId}`);
            console.log(`     Affiliation: ${affiliation}`);
            console.log(`     Documents: ${docCount}`);

            results.push({
                searchId: staff.searchId,
                name: staff.name,
                email: staff.email,
                department: staff.department,
                foundInScopus: true,
                authorIds: [authorId],
                recommendedId: authorId,
                documentCount: docCount,
                affiliations: [affiliation],
                status: 'found_single',
                notes: `Found single profile with ${docCount} documents`,
            });
            foundSingleCount++;
        } else {
            console.log(`  ⚠️  Found ${authors.length} authors:`);
            const authorIds: string[] = [];
            const affiliations: string[] = [];
            let maxDocCount = 0;
            let recommendedId: string | null = null;

            authors.forEach((author, idx) => {
                const authorId = author['dc:identifier'].replace('AUTHOR_ID:', '');
                const docCount = parseInt(author['document-count'], 10);
                const affiliation = author['affiliation-current']?.['affiliation-name'] || 'Unknown';

                authorIds.push(authorId);
                affiliations.push(affiliation);

                console.log(`     ${idx + 1}. ID: ${authorId} | Docs: ${docCount} | ${affiliation}`);

                if (docCount > maxDocCount) {
                    maxDocCount = docCount;
                    recommendedId = authorId;
                }
            });

            console.log(`  → Recommended: ${recommendedId} (${maxDocCount} docs)`);

            results.push({
                searchId: staff.searchId,
                name: staff.name,
                email: staff.email,
                department: staff.department,
                foundInScopus: true,
                authorIds,
                recommendedId,
                documentCount: maxDocCount,
                affiliations,
                status: 'found_multiple',
                notes: `Found ${authors.length} profiles. Recommended: ${recommendedId} with ${maxDocCount} documents`,
            });
            foundMultipleCount++;
        }

        console.log();

        // Rate limiting
        if (i < staffList.length - 1) {
            await sleep(RATE_LIMIT_DELAY_MS);
        }
    }

    // Summary
    console.log('='.repeat(80));
    console.log('Search Summary');
    console.log('='.repeat(80));
    console.log(`Total staff searched: ${staffList.length}`);
    console.log();
    console.log(`Results:`);
    console.log(`  ✅ Found (single profile): ${foundSingleCount}`);
    console.log(`  ⚠️  Found (multiple profiles): ${foundMultipleCount}`);
    console.log(`  ❌ Not found: ${notFoundCount}`);
    console.log(`  ⚠️  Errors: ${errorCount}`);
    console.log();
    console.log(`Total found in Scopus: ${foundSingleCount + foundMultipleCount} (${((foundSingleCount + foundMultipleCount) / staffList.length * 100).toFixed(1)}%)`);
    console.log();

    // Save results
    const outputData = {
        metadata: {
            searchedAt: new Date().toISOString(),
            totalSearched: staffList.length,
            foundSingle: foundSingleCount,
            foundMultiple: foundMultipleCount,
            notFound: notFoundCount,
            errors: errorCount,
            totalFoundInScopus: foundSingleCount + foundMultipleCount,
        },
        results,
    };

    fs.writeFileSync(
        'lkcfes-scopus-name-search-results.json',
        JSON.stringify(outputData, null, 2),
        'utf-8'
    );
    console.log(`✅ Results saved to: lkcfes-scopus-name-search-results.json`);
    console.log();

    // Create update template for found staff
    const foundStaff = results.filter(r => r.foundInScopus && r.recommendedId);

    const updateTemplate = foundStaff.map(r => ({
        email: r.email,
        name: r.name,
        currentScopusUrl: staffList.find(s => s.email === r.email)?.scopusUrl || '',
        recommendedScopusId: r.recommendedId,
        recommendedScopusUrl: `https://www.scopus.com/authid/detail.uri?authorId=${r.recommendedId}`,
        documentCount: r.documentCount,
        status: r.status,
        notes: r.notes,
    }));

    fs.writeFileSync(
        'lkcfes-scopus-id-update-template.json',
        JSON.stringify({
            metadata: {
                generatedAt: new Date().toISOString(),
                totalStaffToUpdate: updateTemplate.length,
                instructions: 'Review each entry and update staff directory with recommendedScopusUrl',
            },
            staffToUpdate: updateTemplate,
        }, null, 2),
        'utf-8'
    );
    console.log(`✅ Update template saved to: lkcfes-scopus-id-update-template.json`);
    console.log();

    console.log('='.repeat(80));
    console.log('Search completed!');
    console.log('='.repeat(80));
    console.log();
    console.log('Next Steps:');
    console.log('1. Review lkcfes-scopus-name-search-results.json for all search results');
    console.log('2. For staff with multiple profiles, manually verify the correct one');
    console.log('3. Use lkcfes-scopus-id-update-template.json to update staff directory');
    console.log();
}

// Run the script
if (require.main === module) {
    searchStaffByName()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { searchStaffByName };
