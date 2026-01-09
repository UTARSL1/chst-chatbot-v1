/**
 * Search Scopus using ORCID IDs
 * 
 * This script searches Scopus using ORCID IDs from staff directory
 * to find Scopus Author IDs and identify staff with multiple Scopus accounts.
 * 
 * Usage:
 *   npx tsx scripts/search-scopus-by-orcid.ts
 */

import fs from 'fs';
import path from 'path';

// Configuration
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';
const RATE_LIMIT_DELAY_MS = 500;
const MAX_RETRIES = 3;

interface StaffMember {
    searchId: string;
    name: string;
    email: string;
    faculty: string;
    facultyAcronym: string;
    department: string;
    departmentAcronym: string;
    designation: string;
    scopusUrl: string;
    orcidUrl: string;
    googleScholarUrl?: string;
}

interface OrcidSearchResult {
    searchId: string;
    name: string;
    email: string;
    department: string;
    orcidId: string;
    currentScopusId: string | null;
    foundScopusIds: string[];
    status: 'found_single' | 'found_multiple' | 'not_found' | 'error';
    publicationCount: number;
    notes: string;
    error?: string;
}

/**
 * Extract ORCID ID from ORCID URL
 */
function extractOrcidId(orcidUrl: string): string | null {
    if (!orcidUrl || orcidUrl.trim() === '') {
        return null;
    }

    // Match patterns like:
    // https://orcid.org/0000-0001-7165-7788
    // http://orcid.org/0000-0001-7165-7788
    // 0000-0001-7165-7788
    const match = orcidUrl.match(/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/);
    return match ? match[1] : null;
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
 * Search Scopus by ORCID
 */
async function searchScopusByOrcid(
    orcidId: string,
    retryCount = 0
): Promise<{ scopusIds: string[]; publicationCount: number; error?: string }> {
    try {
        // Query: ORCID(orcid-id)
        const query = `ORCID(${orcidId})`;

        const url = new URL(SCOPUS_SEARCH_ENDPOINT);
        url.searchParams.append('query', query);
        url.searchParams.append('apiKey', SCOPUS_API_KEY);
        url.searchParams.append('count', '25'); // Maximum allowed by API service level
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
                return searchScopusByOrcid(orcidId, retryCount + 1);
            }

            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        const totalResults = parseInt(data['search-results']['opensearch:totalResults'], 10);

        if (totalResults === 0 || !data['search-results'].entry) {
            return { scopusIds: [], publicationCount: 0 };
        }

        // Extract unique author IDs from the results
        const scopusIds = new Set<string>();

        data['search-results'].entry.forEach((entry: any) => {
            // Author IDs can be in different fields
            if (entry['dc:creator']) {
                // Try to extract from author field
                const authorId = entry['author']?.[0]?.['authid'];
                if (authorId) {
                    scopusIds.add(authorId);
                }
            }

            // Also check all authors in the entry
            if (entry['author']) {
                entry['author'].forEach((author: any) => {
                    if (author['authid']) {
                        scopusIds.add(author['authid']);
                    }
                });
            }
        });

        return {
            scopusIds: Array.from(scopusIds),
            publicationCount: totalResults
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { scopusIds: [], publicationCount: 0, error: errorMessage };
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
 * Extract LKC FES staff with ORCID IDs
 */
function extractStaffWithOrcid(staffDirectory: any): StaffMember[] {
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

            if (isAcademic && member.orcidUrl && member.orcidUrl.trim() !== '') {
                staffMembers.push({
                    searchId: member.searchId,
                    name: member.name,
                    email: member.email,
                    faculty: member.faculty,
                    facultyAcronym: member.facultyAcronym,
                    department: member.department,
                    departmentAcronym: member.departmentAcronym,
                    designation: member.designation,
                    scopusUrl: member.scopusUrl || '',
                    orcidUrl: member.orcidUrl,
                    googleScholarUrl: member.googleScholarUrl,
                });
            }
        }
    }

    return staffMembers;
}

/**
 * Main search function
 */
async function searchByOrcid(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Scopus Search by ORCID');
    console.log('='.repeat(80));
    console.log('Searching Scopus using ORCID IDs from staff directory...');
    console.log('='.repeat(80));
    console.log();

    // Load staff directory
    console.log('Loading staff directory...');
    const staffDirectory = loadStaffDirectory();

    const staffMembers = extractStaffWithOrcid(staffDirectory);
    console.log(`Found ${staffMembers.length} LKC FES staff with ORCID IDs`);
    console.log();

    const results: OrcidSearchResult[] = [];
    let foundSingleCount = 0;
    let foundMultipleCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    let mismatchCount = 0;

    for (let i = 0; i < staffMembers.length; i++) {
        const member = staffMembers[i];
        const progress = `[${i + 1}/${staffMembers.length}]`;

        console.log(`${progress} ${member.name}`);
        console.log(`  Email: ${member.email}`);
        console.log(`  Department: ${member.departmentAcronym}`);

        const orcidId = extractOrcidId(member.orcidUrl);

        if (!orcidId) {
            console.log(`  ⚠️  Could not extract ORCID ID from: ${member.orcidUrl}`);
            results.push({
                searchId: member.searchId,
                name: member.name,
                email: member.email,
                department: member.departmentAcronym,
                orcidId: '',
                currentScopusId: extractScopusAuthorId(member.scopusUrl),
                foundScopusIds: [],
                status: 'error',
                publicationCount: 0,
                notes: 'Invalid ORCID URL format',
                error: 'Could not extract ORCID ID',
            });
            errorCount++;
            console.log();
            continue;
        }

        console.log(`  ORCID: ${orcidId}`);
        const currentScopusId = extractScopusAuthorId(member.scopusUrl);
        console.log(`  Current Scopus ID: ${currentScopusId || 'None'}`);
        console.log(`  Searching Scopus...`);

        const { scopusIds, publicationCount, error } = await searchScopusByOrcid(orcidId);

        if (error) {
            console.log(`  ❌ Error: ${error}`);
            results.push({
                searchId: member.searchId,
                name: member.name,
                email: member.email,
                department: member.departmentAcronym,
                orcidId,
                currentScopusId,
                foundScopusIds: [],
                status: 'error',
                publicationCount: 0,
                notes: `Search error: ${error}`,
                error,
            });
            errorCount++;
        } else if (scopusIds.length === 0) {
            console.log(`  ❌ Not found in Scopus (${publicationCount} publications but no author IDs extracted)`);
            results.push({
                searchId: member.searchId,
                name: member.name,
                email: member.email,
                department: member.departmentAcronym,
                orcidId,
                currentScopusId,
                foundScopusIds: [],
                status: 'not_found',
                publicationCount,
                notes: `ORCID found ${publicationCount} publications but could not extract Scopus Author IDs`,
            });
            notFoundCount++;
        } else if (scopusIds.length === 1) {
            const foundId = scopusIds[0];
            console.log(`  ✅ Found 1 Scopus ID: ${foundId}`);
            console.log(`     Publications: ${publicationCount}`);

            if (currentScopusId && currentScopusId !== foundId) {
                console.log(`  ⚠️  MISMATCH! Directory has ${currentScopusId}, ORCID found ${foundId}`);
                mismatchCount++;
            } else if (!currentScopusId) {
                console.log(`  ℹ️  New ID found (not in directory)`);
            } else {
                console.log(`  ✓ ID matches directory`);
            }

            results.push({
                searchId: member.searchId,
                name: member.name,
                email: member.email,
                department: member.departmentAcronym,
                orcidId,
                currentScopusId,
                foundScopusIds: scopusIds,
                status: 'found_single',
                publicationCount,
                notes: currentScopusId !== foundId
                    ? `Mismatch: Directory has ${currentScopusId}, ORCID found ${foundId}`
                    : 'Single Scopus ID found, matches directory',
            });
            foundSingleCount++;
        } else {
            console.log(`  ⚠️  Found ${scopusIds.length} Scopus IDs: ${scopusIds.join(', ')}`);
            console.log(`     Publications: ${publicationCount}`);
            console.log(`  🔀 MULTIPLE ACCOUNTS DETECTED!`);

            results.push({
                searchId: member.searchId,
                name: member.name,
                email: member.email,
                department: member.departmentAcronym,
                orcidId,
                currentScopusId,
                foundScopusIds: scopusIds,
                status: 'found_multiple',
                publicationCount,
                notes: `Multiple Scopus accounts found: ${scopusIds.join(', ')}. Needs manual review.`,
            });
            foundMultipleCount++;
        }

        console.log();

        // Rate limiting
        if (i < staffMembers.length - 1) {
            await sleep(RATE_LIMIT_DELAY_MS);
        }
    }

    // Summary
    console.log('='.repeat(80));
    console.log('Search Summary');
    console.log('='.repeat(80));
    console.log(`Total staff with ORCID: ${staffMembers.length}`);
    console.log();
    console.log(`Results:`);
    console.log(`  ✅ Found (single Scopus ID): ${foundSingleCount}`);
    console.log(`  🔀 Found (MULTIPLE Scopus IDs): ${foundMultipleCount} ⚠️`);
    console.log(`  ❌ Not found: ${notFoundCount}`);
    console.log(`  ⚠️  Errors: ${errorCount}`);
    console.log();
    console.log(`ID Mismatches: ${mismatchCount} (directory ID ≠ ORCID-found ID)`);
    console.log();

    // Save results
    const outputData = {
        metadata: {
            searchedAt: new Date().toISOString(),
            totalSearched: staffMembers.length,
            foundSingle: foundSingleCount,
            foundMultiple: foundMultipleCount,
            notFound: notFoundCount,
            errors: errorCount,
            mismatches: mismatchCount,
        },
        results,
    };

    fs.writeFileSync(
        'lkcfes-orcid-search-results.json',
        JSON.stringify(outputData, null, 2),
        'utf-8'
    );
    console.log(`✅ Full results saved to: lkcfes-orcid-search-results.json`);
    console.log();

    // Save staff with multiple accounts
    const multipleAccounts = results.filter(r => r.status === 'found_multiple');

    if (multipleAccounts.length > 0) {
        fs.writeFileSync(
            'lkcfes-multiple-scopus-accounts.json',
            JSON.stringify({
                metadata: {
                    generatedAt: new Date().toISOString(),
                    totalWithMultipleAccounts: multipleAccounts.length,
                },
                staff: multipleAccounts.map(r => ({
                    name: r.name,
                    email: r.email,
                    department: r.department,
                    orcidId: r.orcidId,
                    currentScopusId: r.currentScopusId,
                    foundScopusIds: r.foundScopusIds,
                    publicationCount: r.publicationCount,
                    notes: r.notes,
                })),
            }, null, 2),
            'utf-8'
        );
        console.log(`⚠️  Staff with multiple Scopus accounts saved to: lkcfes-multiple-scopus-accounts.json`);
        console.log();
    }

    // Save mismatches
    const mismatches = results.filter(r =>
        r.currentScopusId &&
        r.foundScopusIds.length > 0 &&
        !r.foundScopusIds.includes(r.currentScopusId)
    );

    if (mismatches.length > 0) {
        fs.writeFileSync(
            'lkcfes-scopus-id-mismatches.json',
            JSON.stringify({
                metadata: {
                    generatedAt: new Date().toISOString(),
                    totalMismatches: mismatches.length,
                },
                staff: mismatches.map(r => ({
                    name: r.name,
                    email: r.email,
                    department: r.department,
                    orcidId: r.orcidId,
                    currentScopusIdInDirectory: r.currentScopusId,
                    scopusIdsFoundViaOrcid: r.foundScopusIds,
                    recommendedAction: 'Verify which Scopus ID is correct',
                })),
            }, null, 2),
            'utf-8'
        );
        console.log(`⚠️  Scopus ID mismatches saved to: lkcfes-scopus-id-mismatches.json`);
        console.log();
    }

    console.log('='.repeat(80));
    console.log('Search completed!');
    console.log('='.repeat(80));
    console.log();
    console.log('Key Findings:');
    console.log(`  • ${foundMultipleCount} staff have MULTIPLE Scopus accounts`);
    console.log(`  • ${mismatchCount} staff have incorrect Scopus IDs in directory`);
    console.log();
}

// Run the script
if (require.main === module) {
    searchByOrcid()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { searchByOrcid };
