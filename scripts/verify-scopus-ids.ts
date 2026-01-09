/**
 * Scopus Author ID Verification Script
 * 
 * This script verifies Scopus Author IDs by searching for staff names
 * and checking their affiliation with Universiti Tunku Abdul Rahman.
 * 
 * It identifies:
 * 1. Staff with incorrect/truncated Scopus IDs
 * 2. Staff with multiple Scopus author profiles
 * 3. Staff with no Scopus ID at all
 * 
 * Usage:
 *   npx tsx scripts/verify-scopus-ids.ts
 */

import fs from 'fs';
import path from 'path';

// Configuration
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_AUTHOR_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/author';
const RATE_LIMIT_DELAY_MS = 500; // 2 requests per second
const MAX_RETRIES = 3;

interface StaffMember {
    searchId: string;
    name: string;
    email: string;
    department: string;
    departmentAcronym: string;
    designation: string;
    scopusUrl: string;
    currentScopusId: string | null;
}

interface ScopusAuthorResult {
    'dc:identifier': string; // Format: "AUTHOR_ID:12345678900"
    'eid': string;
    'preferred-name': {
        surname: string;
        'given-name': string;
        initials: string;
    };
    'name-variant'?: Array<{
        surname: string;
        'given-name': string;
        initials: string;
    }>;
    'affiliation-current'?: {
        'affiliation-name': string;
        'affiliation-id': string;
    };
    'document-count': string;
    'h-index'?: string;
    'citation-count'?: string;
}

interface ScopusAuthorSearchResponse {
    'search-results': {
        'opensearch:totalResults': string;
        'opensearch:startIndex': string;
        'opensearch:itemsPerPage': string;
        'entry'?: ScopusAuthorResult[];
    };
}

interface VerificationResult {
    searchId: string;
    name: string;
    email: string;
    department: string;
    currentScopusId: string | null;
    foundAuthorIds: string[];
    status: 'correct' | 'incorrect' | 'multiple' | 'not_found' | 'error';
    recommendedScopusId: string | null;
    documentCount: number;
    notes: string;
    error?: string;
}

/**
 * Extract Scopus Author ID from Scopus URL
 */
function extractScopusAuthorId(scopusUrl: string): string | null {
    if (!scopusUrl || scopusUrl.trim() === '' || scopusUrl.toUpperCase() === 'NIL') {
        return null;
    }

    const match = scopusUrl.match(/authorId=(\d+)/);
    return match ? match[1] : null;
}

/**
 * Clean staff name for searching
 */
function cleanStaffName(name: string): string {
    // Remove titles and honorifics
    let cleaned = name
        .replace(/^(Ir\.?|Prof\.?|Dr\.?|Ts\.?|ChM\.?|Mr\.?|Ms\.?|Mrs\.?|Cik)\s+/gi, '')
        .replace(/\s+(Ir\.?|Prof\.?|Dr\.?|Ts\.?|ChM\.?)$/gi, '')
        .trim();

    // Remove parenthetical content
    cleaned = cleaned.replace(/\([^)]*\)/g, '').trim();

    return cleaned;
}

/**
 * Extract surname and given name from staff name
 */
function extractNameParts(name: string): { surname: string; givenName: string } {
    const cleaned = cleanStaffName(name);

    // Handle Malaysian naming conventions
    // Format: "Given Name Surname" or "Surname a/l|a/p|s/o Given Name"

    if (cleaned.includes(' a/l ') || cleaned.includes(' a/p ') || cleaned.includes(' s/o ')) {
        // Format: "Surname a/l|a/p|s/o Given Name"
        const parts = cleaned.split(/\s+(?:a\/l|a\/p|s\/o)\s+/i);
        return {
            surname: parts[0].trim(),
            givenName: parts[1]?.trim() || '',
        };
    } else if (cleaned.includes(' binti ') || cleaned.includes(' bin ')) {
        // Format: "Given Name binti|bin Surname"
        const parts = cleaned.split(/\s+(?:binti|bin)\s+/i);
        return {
            surname: parts[1]?.trim() || '',
            givenName: parts[0].trim(),
        };
    } else {
        // Default: assume last word is surname
        const parts = cleaned.split(/\s+/);
        const surname = parts[parts.length - 1];
        const givenName = parts.slice(0, -1).join(' ');
        return { surname, givenName };
    }
}

/**
 * Search for author in Scopus by name
 */
async function searchScopusAuthor(
    name: string,
    retryCount = 0
): Promise<{ authors: ScopusAuthorResult[]; error?: string }> {
    try {
        const { surname, givenName } = extractNameParts(name);

        // Construct query: AUTHFIRST(given) AND AUTHLAST(surname) AND AFFIL(Universiti Tunku Abdul Rahman)
        const query = `AUTHLAST(${surname}) AND AFFIL(Universiti Tunku Abdul Rahman)`;

        const url = new URL(SCOPUS_AUTHOR_SEARCH_ENDPOINT);
        url.searchParams.append('query', query);
        url.searchParams.append('apiKey', SCOPUS_API_KEY);
        url.searchParams.append('count', '25'); // Get up to 25 results
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
                console.log(`    Rate limited. Waiting 5 seconds before retry ${retryCount + 1}/${MAX_RETRIES}...`);
                await sleep(5000);
                return searchScopusAuthor(name, retryCount + 1);
            }

            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data: ScopusAuthorSearchResponse = await response.json();
        const totalResults = parseInt(data['search-results']['opensearch:totalResults'], 10);

        if (totalResults === 0 || !data['search-results'].entry) {
            return { authors: [] };
        }

        // Filter results to match UTAR affiliation more strictly
        const utarAuthors = data['search-results'].entry.filter(author => {
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
 * Load staff directory
 */
function loadStaffDirectory(): any {
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const data = fs.readFileSync(staffDirPath, 'utf-8');
    return JSON.parse(data);
}

/**
 * Extract LKC FES academic staff
 */
function extractLKCFESStaff(staffDirectory: any): StaffMember[] {
    const staffMembers: StaffMember[] = [];

    const lkcfes = staffDirectory.faculties?.['LKC FES'];
    if (!lkcfes) {
        return staffMembers;
    }

    const departments = lkcfes.departments || {};

    for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
        if (deptKey === 'DLMSA' || deptKey === 'FGO') continue;
        if (deptData.departmentType !== 'Academic') continue;

        const staff = deptData.staff || [];

        for (const member of staff) {
            const isAcademic = member.designation &&
                (member.designation.includes('Professor') ||
                    member.designation.includes('Lecturer') ||
                    member.designation.includes('Instructor'));

            if (isAcademic) {
                staffMembers.push({
                    searchId: member.searchId,
                    name: member.name,
                    email: member.email,
                    department: member.department,
                    departmentAcronym: member.departmentAcronym,
                    designation: member.designation,
                    scopusUrl: member.scopusUrl || '',
                    currentScopusId: extractScopusAuthorId(member.scopusUrl || ''),
                });
            }
        }
    }

    return staffMembers;
}

/**
 * Main verification function
 */
async function verifyScopusIds(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Scopus Author ID Verification');
    console.log('='.repeat(80));
    console.log('Verifying Scopus IDs for LKC FES academic staff...');
    console.log('='.repeat(80));
    console.log();

    // Load staff directory
    console.log('Loading staff directory...');
    const staffDirectory = loadStaffDirectory();

    const staffMembers = extractLKCFESStaff(staffDirectory);
    console.log(`Found ${staffMembers.length} LKC FES academic staff members`);
    console.log();

    const results: VerificationResult[] = [];
    let correctCount = 0;
    let incorrectCount = 0;
    let multipleCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (let i = 0; i < staffMembers.length; i++) {
        const member = staffMembers[i];
        const progress = `[${i + 1}/${staffMembers.length}]`;

        console.log(`${progress} ${member.name}`);
        console.log(`  Email: ${member.email}`);
        console.log(`  Current Scopus ID: ${member.currentScopusId || 'None'}`);
        console.log(`  Searching Scopus Author Search API...`);

        // Search for author
        const { authors, error } = await searchScopusAuthor(member.name);

        if (error) {
            console.log(`  ❌ Error: ${error}`);
            results.push({
                searchId: member.searchId,
                name: member.name,
                email: member.email,
                department: member.departmentAcronym,
                currentScopusId: member.currentScopusId,
                foundAuthorIds: [],
                status: 'error',
                recommendedScopusId: null,
                documentCount: 0,
                notes: `Error searching: ${error}`,
                error,
            });
            errorCount++;
            console.log();
            await sleep(RATE_LIMIT_DELAY_MS);
            continue;
        }

        if (authors.length === 0) {
            console.log(`  ⚠️  Not found in Scopus`);
            results.push({
                searchId: member.searchId,
                name: member.name,
                email: member.email,
                department: member.departmentAcronym,
                currentScopusId: member.currentScopusId,
                foundAuthorIds: [],
                status: 'not_found',
                recommendedScopusId: null,
                documentCount: 0,
                notes: 'No Scopus author profile found for this name at UTAR',
            });
            notFoundCount++;
        } else if (authors.length === 1) {
            const author = authors[0];
            const authorId = author['dc:identifier'].replace('AUTHOR_ID:', '');
            const docCount = parseInt(author['document-count'], 10);
            const affiliation = author['affiliation-current']?.['affiliation-name'] || 'Unknown';

            console.log(`  ✅ Found 1 author:`);
            console.log(`     ID: ${authorId}`);
            console.log(`     Affiliation: ${affiliation}`);
            console.log(`     Documents: ${docCount}`);

            if (member.currentScopusId === authorId) {
                console.log(`  ✓ ID matches - Correct!`);
                results.push({
                    searchId: member.searchId,
                    name: member.name,
                    email: member.email,
                    department: member.departmentAcronym,
                    currentScopusId: member.currentScopusId,
                    foundAuthorIds: [authorId],
                    status: 'correct',
                    recommendedScopusId: authorId,
                    documentCount: docCount,
                    notes: 'Scopus ID is correct',
                });
                correctCount++;
            } else {
                console.log(`  ⚠️  ID mismatch - Incorrect!`);
                console.log(`     Expected: ${member.currentScopusId || 'None'}`);
                console.log(`     Found: ${authorId}`);
                results.push({
                    searchId: member.searchId,
                    name: member.name,
                    email: member.email,
                    department: member.departmentAcronym,
                    currentScopusId: member.currentScopusId,
                    foundAuthorIds: [authorId],
                    status: 'incorrect',
                    recommendedScopusId: authorId,
                    documentCount: docCount,
                    notes: `Incorrect Scopus ID. Should be ${authorId} instead of ${member.currentScopusId || 'None'}`,
                });
                incorrectCount++;
            }
        } else {
            console.log(`  ⚠️  Found ${authors.length} authors:`);
            const authorIds: string[] = [];
            let maxDocCount = 0;
            let recommendedId: string | null = null;

            authors.forEach((author, idx) => {
                const authorId = author['dc:identifier'].replace('AUTHOR_ID:', '');
                const docCount = parseInt(author['document-count'], 10);
                const affiliation = author['affiliation-current']?.['affiliation-name'] || 'Unknown';

                authorIds.push(authorId);

                console.log(`     ${idx + 1}. ID: ${authorId}`);
                console.log(`        Affiliation: ${affiliation}`);
                console.log(`        Documents: ${docCount}`);

                if (docCount > maxDocCount) {
                    maxDocCount = docCount;
                    recommendedId = authorId;
                }
            });

            console.log(`  → Recommended ID: ${recommendedId} (${maxDocCount} documents)`);

            results.push({
                searchId: member.searchId,
                name: member.name,
                email: member.email,
                department: member.departmentAcronym,
                currentScopusId: member.currentScopusId,
                foundAuthorIds: authorIds,
                status: 'multiple',
                recommendedScopusId: recommendedId,
                documentCount: maxDocCount,
                notes: `Multiple Scopus profiles found (${authors.length}). Recommended: ${recommendedId}`,
            });
            multipleCount++;
        }

        console.log();
        await sleep(RATE_LIMIT_DELAY_MS);
    }

    // Summary
    console.log('='.repeat(80));
    console.log('Verification Summary');
    console.log('='.repeat(80));
    console.log(`Total staff verified: ${staffMembers.length}`);
    console.log();
    console.log(`Results:`);
    console.log(`  ✅ Correct IDs: ${correctCount}`);
    console.log(`  ⚠️  Incorrect IDs: ${incorrectCount}`);
    console.log(`  🔀 Multiple profiles: ${multipleCount}`);
    console.log(`  ❌ Not found: ${notFoundCount}`);
    console.log(`  ⚠️  Errors: ${errorCount}`);
    console.log();

    // Save results
    const outputData = {
        metadata: {
            verifiedAt: new Date().toISOString(),
            totalStaff: staffMembers.length,
            correctCount,
            incorrectCount,
            multipleCount,
            notFoundCount,
            errorCount,
        },
        results,
    };

    fs.writeFileSync(
        'lkcfes-scopus-verification.json',
        JSON.stringify(outputData, null, 2),
        'utf-8'
    );
    console.log(`✅ Full results saved to: lkcfes-scopus-verification.json`);
    console.log();

    // Save staff requiring attention
    const needsAttention = results.filter(r =>
        r.status === 'incorrect' || r.status === 'multiple' || r.status === 'not_found'
    );

    const attentionReport = needsAttention.map(r => ({
        name: r.name,
        email: r.email,
        department: r.department,
        status: r.status,
        currentScopusId: r.currentScopusId,
        recommendedScopusId: r.recommendedScopusId,
        foundAuthorIds: r.foundAuthorIds,
        documentCount: r.documentCount,
        notes: r.notes,
    }));

    fs.writeFileSync(
        'lkcfes-scopus-needs-attention.json',
        JSON.stringify({
            metadata: {
                generatedAt: new Date().toISOString(),
                totalNeedingAttention: needsAttention.length,
                incorrectIds: incorrectCount,
                multipleProfiles: multipleCount,
                notFound: notFoundCount,
            },
            staff: attentionReport,
        }, null, 2),
        'utf-8'
    );
    console.log(`✅ Staff needing attention saved to: lkcfes-scopus-needs-attention.json`);
    console.log();

    console.log('='.repeat(80));
    console.log('Verification completed!');
    console.log('='.repeat(80));
}

// Run the script
if (require.main === module) {
    verifyScopusIds()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { verifyScopusIds };
