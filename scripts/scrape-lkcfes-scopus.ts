/**
 * LKC FES Scopus Publication Scraper
 * 
 * Specialized script for scraping LKC FES academic staff publications
 * Excludes DLMSA and FGO departments
 * Scrapes publications for 2023, 2024, and 2025
 * 
 * Usage:
 *   npx tsx scripts/scrape-lkcfes-scopus.ts
 */

import fs from 'fs';
import path from 'path';

// Configuration
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';
const RATE_LIMIT_DELAY_MS = 500; // 2 requests per second
const MAX_RETRIES = 3;
const YEARS_TO_SCRAPE = [2023, 2024, 2025];

// LKC FES departments to include (excluding DLMSA and FGO)
const LKC_FES_DEPARTMENTS = [
    'DMBE',  // Department of Mechatronics and Biomedical Engineering
    'DCL',   // Department of Chemical Engineering
    'DCI',   // Department of Civil Engineering
    'DC',    // Department of Computing
    'D3E',   // Department of Electrical and Electronic Engineering
    'DSE',   // Department of Soft Engineering
    'DPMM',  // Department of Petrochemical and Material Engineering
    'DM',    // Department of Mathematics
    'DP',    // Department of Physics
];

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
    googleScholarUrl?: string;
    orcidUrl?: string;
}

interface PublicationData {
    year: number;
    count: number;
    success: boolean;
    error?: string;
}

interface StaffPublicationResult {
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
    accessible: boolean;
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
    if (!scopusUrl || scopusUrl.trim() === '' || scopusUrl.toUpperCase() === 'NIL') {
        return null;
    }

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
                console.log(`    Rate limited. Waiting 5 seconds before retry ${retryCount + 1}/${MAX_RETRIES}...`);
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
 * Extract LKC FES academic staff (excluding DLMSA and FGO)
 */
function extractLKCFESStaff(staffDirectory: any): StaffMember[] {
    const staffMembers: StaffMember[] = [];

    const lkcfes = staffDirectory.faculties?.['LKC FES'];
    if (!lkcfes) {
        console.error('LKC FES faculty not found in staff directory!');
        return staffMembers;
    }

    const departments = lkcfes.departments || {};

    for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
        // Skip DLMSA and FGO
        if (deptKey === 'DLMSA' || deptKey === 'FGO') {
            console.log(`Skipping ${deptKey} (excluded as per requirements)`);
            continue;
        }

        // Only include academic departments
        if (deptData.departmentType !== 'Academic') {
            console.log(`Skipping ${deptKey} (not academic department)`);
            continue;
        }

        const staff = deptData.staff || [];

        for (const member of staff) {
            // Only include academic staff (exclude administrative-only staff)
            const isAcademic = member.designation &&
                (member.designation.includes('Professor') ||
                    member.designation.includes('Lecturer') ||
                    member.designation.includes('Instructor'));

            if (isAcademic) {
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
                    googleScholarUrl: member.googleScholarUrl,
                    orcidUrl: member.orcidUrl,
                });
            }
        }
    }

    return staffMembers;
}

/**
 * Main scraping function
 */
async function scrapeLKCFESScopus(): Promise<void> {
    console.log('='.repeat(80));
    console.log('LKC FES Scopus Publication Scraper');
    console.log('='.repeat(80));
    console.log(`Years: ${YEARS_TO_SCRAPE.join(', ')}`);
    console.log(`Excluded Departments: DLMSA, FGO`);
    console.log('='.repeat(80));
    console.log();

    // Load staff directory
    console.log('Loading staff directory...');
    const staffDirectory = loadStaffDirectory();

    // Extract LKC FES academic staff
    const staffMembers = extractLKCFESStaff(staffDirectory);
    console.log(`Found ${staffMembers.length} LKC FES academic staff members`);
    console.log();

    // Separate accessible and inaccessible staff
    const accessibleStaff: StaffMember[] = [];
    const inaccessibleStaff: StaffMember[] = [];

    for (const member of staffMembers) {
        const authorId = extractScopusAuthorId(member.scopusUrl);
        if (authorId) {
            accessibleStaff.push(member);
        } else {
            inaccessibleStaff.push(member);
        }
    }

    console.log(`Accessible via API: ${accessibleStaff.length}`);
    console.log(`Not accessible via API: ${inaccessibleStaff.length}`);
    console.log();

    // Save inaccessible staff list
    console.log('Saving list of inaccessible staff...');
    const inaccessibleList = inaccessibleStaff.map(s => ({
        searchId: s.searchId,
        name: s.name,
        email: s.email,
        department: s.departmentAcronym,
        designation: s.designation,
        scopusUrl: s.scopusUrl,
        reason: s.scopusUrl.trim() === '' || s.scopusUrl.toUpperCase() === 'NIL'
            ? 'No Scopus URL in directory'
            : 'Invalid Scopus URL format',
    }));

    fs.writeFileSync(
        'lkcfes-inaccessible-scopus.json',
        JSON.stringify({
            metadata: {
                generatedAt: new Date().toISOString(),
                totalCount: inaccessibleList.length,
            },
            staff: inaccessibleList
        }, null, 2),
        'utf-8'
    );
    console.log(`✅ Saved to: lkcfes-inaccessible-scopus.json`);
    console.log();

    // Process accessible staff
    console.log('='.repeat(80));
    console.log('Scraping publications for accessible staff...');
    console.log('='.repeat(80));
    console.log();

    const results: StaffPublicationResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < accessibleStaff.length; i++) {
        const member = accessibleStaff[i];
        const progress = `[${i + 1}/${accessibleStaff.length}]`;

        console.log(`${progress} ${member.name}`);
        console.log(`  Email: ${member.email}`);
        console.log(`  Department: ${member.departmentAcronym} (${member.designation})`);

        const authorId = extractScopusAuthorId(member.scopusUrl)!;
        console.log(`  Scopus Author ID: ${authorId}`);

        const publications: PublicationData[] = [];
        let hasError = false;
        let errorMessage = '';

        // Query for each year
        for (const year of YEARS_TO_SCRAPE) {
            console.log(`  Querying ${year}...`);
            const { count, error } = await getScopusPublicationCount(authorId, year);

            if (error) {
                console.log(`    ❌ Error: ${error}`);
                publications.push({ year, count: 0, success: false, error });
                hasError = true;
                errorMessage = error;
            } else {
                console.log(`    ✅ ${count} publications`);
                publications.push({ year, count, success: true });
            }

            // Rate limiting between years
            await sleep(RATE_LIMIT_DELAY_MS);
        }

        const totalPublications = publications.reduce((sum, p) => sum + p.count, 0);

        const result: StaffPublicationResult = {
            searchId: member.searchId,
            name: member.name,
            email: member.email,
            department: member.department,
            departmentAcronym: member.departmentAcronym,
            designation: member.designation,
            scopusAuthorId: authorId,
            scopusUrl: member.scopusUrl,
            publications,
            totalPublications,
            accessible: true,
        };

        if (hasError) {
            result.error = errorMessage;
            errorCount++;
        } else {
            successCount++;
        }

        results.push(result);

        console.log(`  Total (2023-2025): ${totalPublications} publications`);
        console.log();

        // Rate limiting between staff members
        if (i < accessibleStaff.length - 1) {
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
    console.log(`Total LKC FES academic staff: ${staffMembers.length}`);
    console.log(`  Accessible via API: ${accessibleStaff.length}`);
    console.log(`  Not accessible via API: ${inaccessibleStaff.length}`);
    console.log();
    console.log(`Scraping Results:`);
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
        const avg2023 = (totalPublications2023 / successCount).toFixed(2);
        const avg2024 = (totalPublications2024 / successCount).toFixed(2);
        const avg2025 = (totalPublications2025 / successCount).toFixed(2);
        const avgTotal = (totalPublications / successCount).toFixed(2);

        console.log(`Average Publications per Staff:`);
        console.log(`  2023: ${avg2023}`);
        console.log(`  2024: ${avg2024}`);
        console.log(`  2025: ${avg2025}`);
        console.log(`  Total: ${avgTotal}`);
        console.log();
    }

    // Top publishers
    const topPublishers = results
        .filter(r => r.totalPublications > 0)
        .sort((a, b) => b.totalPublications - a.totalPublications)
        .slice(0, 10);

    if (topPublishers.length > 0) {
        console.log('Top 10 Publishers (2023-2025):');
        topPublishers.forEach((r, idx) => {
            const pub2023 = r.publications.find(p => p.year === 2023)?.count || 0;
            const pub2024 = r.publications.find(p => p.year === 2024)?.count || 0;
            const pub2025 = r.publications.find(p => p.year === 2025)?.count || 0;
            console.log(`  ${idx + 1}. ${r.name} (${r.departmentAcronym})`);
            console.log(`     2023: ${pub2023}, 2024: ${pub2024}, 2025: ${pub2025} | Total: ${r.totalPublications}`);
        });
        console.log();
    }

    // Save results
    console.log('Saving results...');
    const outputData = {
        metadata: {
            scrapedAt: new Date().toISOString(),
            faculty: 'LKC FES',
            years: YEARS_TO_SCRAPE,
            excludedDepartments: ['DLMSA', 'FGO'],
            totalStaff: staffMembers.length,
            accessibleStaff: accessibleStaff.length,
            inaccessibleStaff: inaccessibleStaff.length,
            successCount,
            errorCount,
            statistics: {
                publications2023: totalPublications2023,
                publications2024: totalPublications2024,
                publications2025: totalPublications2025,
                totalPublications,
                averagePerStaff: successCount > 0 ? parseFloat((totalPublications / successCount).toFixed(2)) : 0,
            },
        },
        results,
    };

    fs.writeFileSync(
        'lkcfes-scopus-publications.json',
        JSON.stringify(outputData, null, 2),
        'utf-8'
    );
    console.log(`✅ Saved to: lkcfes-scopus-publications.json`);
    console.log();

    console.log('='.repeat(80));
    console.log('Scraping completed!');
    console.log('='.repeat(80));
    console.log();
    console.log('Next Steps:');
    console.log('1. Review lkcfes-inaccessible-scopus.json for staff without Scopus access');
    console.log('2. Manually find Scopus IDs for those staff members');
    console.log('3. Provide the Scopus IDs to update the results');
    console.log();
}

// Run the script
if (require.main === module) {
    scrapeLKCFESScopus()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { scrapeLKCFESScopus, extractScopusAuthorId };
