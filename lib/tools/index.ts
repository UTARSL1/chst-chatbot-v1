import Fuse from 'fuse.js';
import * as cheerio from 'cheerio';
import unitsData from './units.json';
import https from 'https';
import { searchStaffFromDirectory } from './search-from-directory';
import { StaffMember } from './staff-directory-types';
import { queryStaffDirectory } from './query-staff-directory';

// --- Types ---
interface UnitMapping {
    acronym: string | null;
    canonical: string;
    type: string | null;
    parent?: string | null;
    aliases: string[];
}

interface StaffResult {
    searchId?: string;  // For sorting by hire date (higher = newer)
    staffType?: 'full-time' | 'adjunct' | 'part-time';  // Employment type
    name: string;
    position: string;
    email: string;
    faculty: string;
    department: string;
    designation?: string;
    administrativePosts?: string[]; // Changed to array to support multiple posts
    areasOfExpertise?: string[]; // Research areas
    googleScholarUrl?: string;
    scopusUrl?: string;
    orcidUrl?: string;
    homepageUrl?: string;
    extra?: string;
}

// Helper to convert StaffMember to StaffResult
function convertToStaffResult(staff: StaffMember): StaffResult {
    return {
        searchId: staff.searchId,
        staffType: staff.staffType as 'full-time' | 'adjunct' | 'part-time',
        name: staff.name,
        position: staff.position,
        email: staff.email || '', // Email might be empty for adjunct staff
        faculty: staff.faculty,
        department: staff.department,
        designation: staff.designation,
        administrativePosts: staff.administrativePosts || [], // Default to empty array
        areasOfExpertise: staff.areasOfExpertise || [], // Default to empty array
        googleScholarUrl: staff.googleScholarUrl,
        scopusUrl: staff.scopusUrl,
        orcidUrl: staff.orcidUrl,
        homepageUrl: staff.homepageUrl
    };
}

// --- Tool 1: Resolve Unit ---
const fuseOptions = {
    includeScore: true,
    keys: ['canonical', 'acronym', 'aliases'],
    threshold: 0.4,
};

const fuse = new Fuse(unitsData, fuseOptions);

export function resolveUnit(query: string, logger?: (msg: string) => void) {
    const log = (msg: string) => {
        console.log(`[Tools] ${msg}`);
        if (logger) logger(`[Tools] ${msg}`);
    };

    log(`Resolving unit: ${query}`);
    if (!query) return { canonical: "", acronym: null, type: null, error: "Empty query" };

    const queryLower = query.toLowerCase().trim();

    // Exact match on canonical or acronym
    const exactMatch = unitsData.find(u =>
        u.canonical.toLowerCase() === queryLower ||
        (u.acronym && u.acronym.toLowerCase() === queryLower)
    );
    if (exactMatch) {
        log(`Exact match: ${exactMatch.canonical} (${exactMatch.acronym || 'no acronym'})`);
        return {
            canonical: exactMatch.canonical,
            acronym: exactMatch.acronym,
            type: exactMatch.type
        };
    }

    // Fuzzy search
    const results = fuse.search(query);
    if (results.length > 0) {
        const best = results[0].item;
        log(`Fuzzy match: ${best.canonical} (${best.acronym || 'no acronym'}) with score ${results[0].score}`);
        return {
            canonical: best.canonical,
            acronym: best.acronym,
            type: best.type
        };
    }

    log(`No match found for: ${query}`);
    return { canonical: "", acronym: null, type: null, error: "No match found" };
}

// --- Tool 2: Search Staff ---
function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, { rejectUnauthorized: false }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

export async function searchStaff(
    params: {
        faculty?: string;
        department?: string;
        name?: string;
        email?: string;
        expertise?: string;
        role?: string;
        acronym?: string;
    },
    logger?: (msg: string) => void
) {
    const log = (msg: string) => {
        console.log(`[Tools] ${msg}`);
        if (logger) logger(`[Tools] ${msg}`);
    };

    try {
        log(`Searching staff with params: ${JSON.stringify(params)}`);

        // **OPTIMIZATION: Use pre-calculated metadata if possible**
        // If query is just for counts (no name/email/expertise/role filters), use metadata directly
        // BUT: If department is specified (not just acronym), user likely wants staff list, not just counts
        const isCountOnlyQuery = !params.name && !params.email && !params.expertise && !params.role && !params.department;

        if (isCountOnlyQuery && params.acronym) {
            log('Attempting to use pre-calculated metadata counts...');
            try {
                const { getStaffCountsFromMetadata } = await import('./get-staff-counts');

                // **DISAMBIGUATION: Check if acronym exists in multiple faculties**
                if (!params.faculty || params.faculty.toLowerCase() === 'all') {
                    // Load staff directory to check for multiple matches
                    const { loadStaffDirectory } = await import('./staff-directory');
                    const directory = loadStaffDirectory();

                    if (directory) {
                        // Find all faculties that have this department acronym
                        const matches: Array<{
                            facultyAcronym: string;
                            facultyName: string;
                            departmentName: string;
                            counts: any;
                        }> = [];

                        for (const [facAcronym, fac] of Object.entries(directory.faculties)) {
                            const dept = fac.departments[params.acronym];
                            if (dept) {
                                matches.push({
                                    facultyAcronym: facAcronym,
                                    facultyName: fac.canonical,
                                    departmentName: dept.canonical,
                                    counts: {
                                        staffCount: dept.staffCount,
                                        fullTimeCount: dept.fullTimeCount,
                                        adjunctCount: dept.adjunctCount,
                                        partTimeCount: dept.partTimeCount,
                                        expatriateCount: dept.expatriateCount,
                                        emeritusCount: dept.emeritusCount
                                    }
                                });
                            }
                        }

                        if (matches.length > 1) {
                            // **AMBIGUOUS: Multiple faculties have this department**
                            log(`✓ Found ${params.acronym} in ${matches.length} faculties - aggregating results`);

                            // Aggregate totals
                            const totalCounts = matches.reduce((acc, match) => ({
                                staffCount: acc.staffCount + match.counts.staffCount,
                                fullTimeCount: acc.fullTimeCount + match.counts.fullTimeCount,
                                adjunctCount: acc.adjunctCount + match.counts.adjunctCount,
                                partTimeCount: acc.partTimeCount + match.counts.partTimeCount,
                                expatriateCount: acc.expatriateCount + match.counts.expatriateCount,
                                emeritusCount: acc.emeritusCount + match.counts.emeritusCount
                            }), {
                                staffCount: 0,
                                fullTimeCount: 0,
                                adjunctCount: 0,
                                partTimeCount: 0,
                                expatriateCount: 0,
                                emeritusCount: 0
                            });

                            // Build breakdown message
                            const facultyBreakdown = matches.map(m => {
                                const parts: string[] = [];
                                if (m.counts.fullTimeCount > 0) parts.push(`${m.counts.fullTimeCount} full-time`);
                                if (m.counts.adjunctCount > 0) parts.push(`${m.counts.adjunctCount} adjunct`);
                                if (m.counts.partTimeCount > 0) parts.push(`${m.counts.partTimeCount} part-time`);
                                if (m.counts.expatriateCount > 0) parts.push(`${m.counts.expatriateCount} expatriate`);
                                return `${m.facultyAcronym}: ${m.counts.staffCount} staff (${parts.join(', ')})`;
                            }).join('; ');

                            const totalBreakdown: string[] = [];
                            if (totalCounts.fullTimeCount > 0) totalBreakdown.push(`${totalCounts.fullTimeCount} full-time`);
                            if (totalCounts.adjunctCount > 0) totalBreakdown.push(`${totalCounts.adjunctCount} adjunct`);
                            if (totalCounts.partTimeCount > 0) totalBreakdown.push(`${totalCounts.partTimeCount} part-time`);
                            if (totalCounts.expatriateCount > 0) totalBreakdown.push(`${totalCounts.expatriateCount} expatriate`);

                            const message = `${params.acronym} has ${totalCounts.staffCount} staff across ${matches.length} faculties (${totalBreakdown.join(', ')}). Breakdown: ${facultyBreakdown}`;

                            return {
                                message,
                                totalCount: totalCounts.staffCount,
                                fullTimeCount: totalCounts.fullTimeCount,
                                adjunctCount: totalCounts.adjunctCount,
                                partTimeCount: totalCounts.partTimeCount,
                                expatriateCount: totalCounts.expatriateCount,
                                isAggregated: true,
                                breakdown: matches.map(m => ({
                                    faculty: m.facultyName,
                                    facultyAcronym: m.facultyAcronym,
                                    department: m.departmentName,
                                    ...m.counts
                                }))
                            } as any;
                        }
                    }
                }

                // Single match or faculty specified - use normal metadata lookup
                const counts = getStaffCountsFromMetadata(params, logger);

                if (counts) {
                    log(`✓ Retrieved counts from metadata (instant)`);

                    // Build breakdown message
                    const breakdown: string[] = [];
                    if (counts.fullTimeCount > 0) breakdown.push(`${counts.fullTimeCount} full-time`);
                    if (counts.adjunctCount > 0) breakdown.push(`${counts.adjunctCount} adjunct`);
                    if (counts.partTimeCount > 0) breakdown.push(`${counts.partTimeCount} part-time`);
                    if (counts.expatriateCount > 0) breakdown.push(`${counts.expatriateCount} expatriate`);

                    const message = `There are ${counts.staffCount} staff members (${breakdown.join(', ')}).`;

                    return {
                        message,
                        totalCount: counts.staffCount,
                        fullTimeCount: counts.fullTimeCount,
                        adjunctCount: counts.adjunctCount,
                        partTimeCount: counts.partTimeCount,
                        expatriateCount: counts.expatriateCount
                    } as any;
                }
            } catch (error: any) {
                log(`Metadata retrieval failed: ${error.message}, falling back to full search`);
            }
        }

        // **PRIMARY METHOD: Use lookup table (fast!)**
        log('Attempting to search from lookup table...');
        try {
            const staffFromDirectory = searchStaffFromDirectory(params, logger);
            if (staffFromDirectory.length > 0) {
                log(`✓ Found ${staffFromDirectory.length} staff from lookup table (fast path)`);

                // Count employment types
                const fullTimeCount = staffFromDirectory.filter(s => s.staffType === 'full-time').length;
                const adjunctCount = staffFromDirectory.filter(s => s.staffType === 'adjunct').length;
                const partTimeCount = staffFromDirectory.filter(s => s.staffType === 'part-time').length;
                const expatriateCount = staffFromDirectory.filter(s => s.staffType === 'expatriate').length;

                // Build breakdown message
                const breakdown: string[] = [];
                if (fullTimeCount > 0) breakdown.push(`${fullTimeCount} full-time`);
                if (adjunctCount > 0) breakdown.push(`${adjunctCount} adjunct`);
                if (partTimeCount > 0) breakdown.push(`${partTimeCount} part-time`);
                if (expatriateCount > 0) breakdown.push(`${expatriateCount} expatriate`);

                const message = `There are ${staffFromDirectory.length} staff members (${breakdown.join(', ')}).`;

                // Always return full staff details from lookup table
                // The LLM can decide whether to use names or just counts
                return {
                    message,
                    totalCount: staffFromDirectory.length,
                    fullTimeCount,
                    adjunctCount,
                    partTimeCount,
                    expatriateCount,
                    staff: staffFromDirectory.map(s => ({
                        searchId: s.searchId,
                        staffType: s.staffType,
                        name: s.name,
                        position: s.position,
                        email: s.email,
                        faculty: s.faculty,
                        department: s.department,
                        designation: s.designation,
                        administrativePosts: s.administrativePosts,
                        areasOfExpertise: s.areasOfExpertise,
                        googleScholarUrl: s.googleScholarUrl,
                        scopusUrl: s.scopusUrl,
                        orcidUrl: s.orcidUrl,
                        homepageUrl: s.homepageUrl
                    }))
                } as any;
            } else {
                log('No results from lookup table, falling back to live scraping...');
            }
        } catch (error: any) {
            log(`Lookup table search failed: ${error.message}, falling back to live scraping...`);
        }

        // **FALLBACK: Live scraping (slow, only if lookup table fails)**
        log('Using live scraping (this may take 20-30 seconds)...');

        const baseUrl = 'https://www2.utar.edu.my';
        const results: StaffResult[] = [];
        const seenIds = new Set<string>();

        // --- DETERMINISTIC UNIT RESOLUTION ---

        // Helper to find input in knowledge base
        const findUnit = (query: string) => {
            if (!query || query.toLowerCase() === 'all') return null;
            const q = query.toLowerCase().trim();
            return unitsData.find(u =>
                u.canonical.toLowerCase() === q ||
                (u.acronym && u.acronym.toLowerCase() === q) ||
                (u.aliases && u.aliases.some(alias => alias.toLowerCase() === q))
            );
        };

        let resolvedFaculty = params.faculty || 'All';
        let resolvedDepartmentId = 'All';

        // 0. Analyze 'faculty' argument robustly
        // LLM sometimes passes a Department name (e.g. "D3E" or "Dept of Electrical...") as the 'faculty'.
        if (resolvedFaculty.toLowerCase() !== 'all') {
            const unit = findUnit(resolvedFaculty);
            if (unit) {
                // If the 'faculty' argument is actually a Department (has a departmentId)
                if ((unit as any).departmentId) {
                    resolvedDepartmentId = (unit as any).departmentId;
                    // Resolve its parent to get the real Faculty
                    if ((unit as any).parent) {
                        const parentUnit = findUnit((unit as any).parent);
                        if (parentUnit && parentUnit.acronym) {
                            resolvedFaculty = parentUnit.acronym;
                            log(`[Auto-fix] Input faculty '${params.faculty}' is actually a Department. Resolved to Faculty: '${resolvedFaculty}', DeptID: '${resolvedDepartmentId}'`);
                        }
                    }
                } else if (unit.acronym) {
                    // It is a valid Faculty/Centre, ensure we use the Acronym (e.g. found by name "Lee Kong Chian...")
                    resolvedFaculty = unit.acronym;
                }
            }
        }

        // 1. Analyze 'department' argument first
        // LLM often puts Research Centres (CCSN) in 'department' field incorrectly.
        if (params.department && params.department.toLowerCase() !== 'all') {
            const unit = findUnit(params.department);

            if (unit) {
                if ((unit as any).departmentId) {
                    // CASE A: It is a valid Department (e.g., "Department of Computer Science")
                    resolvedDepartmentId = (unit as any).departmentId;

                    // Auto-fix faculty based on department's parent
                    if ((unit as any).parent) {
                        const parentUnit = findUnit((unit as any).parent);
                        if (parentUnit && parentUnit.acronym) {
                            resolvedFaculty = parentUnit.acronym;
                            log(`Auto-corrected faculty to '${resolvedFaculty}' based on department '${unit.canonical}'`);
                        }
                    }
                } else {
                    // CASE B: It is a Top-Level Unit (Faculty/Research Centre) put in department field
                    // e.g. department="CCSN" -> should be faculty="CCSN", department="All"
                    if (unit.acronym) {
                        resolvedFaculty = unit.acronym;
                        resolvedDepartmentId = 'All';
                        log(`Auto-corrected: Promoted '${unit.canonical}' from department to faculty (it is a Research Centre/Faculty).`);
                    }
                }
            } else {
                // Department name not matched in DB.
                // Depending on strictness, we might warn or just pass it through. 
                // For now, if we can't map it to an ID, we potentially lose it or fail. 
                // But let's proceed with original logic's fallback or just warn.
                log(`Warning: Department '${params.department}' not found in DB.`);
            }
        }

        // 2. Normalize Faculty Acronym
        if (resolvedFaculty !== 'All') {
            const unit = findUnit(resolvedFaculty);
            if (unit && unit.acronym) {
                resolvedFaculty = unit.acronym;
            }
        }

        // 3. (NEW) Analyze 'acronym' argument (HIGHEST PRIORITY)
        // Code-based override for robust unit resolution.
        if (params.acronym) {
            const unit = findUnit(params.acronym);
            if (unit) {
                log(`[Code-Resolution] Overriding with acronym '${params.acronym}' -> '${unit.canonical}'`);
                if ((unit as any).departmentId) {
                    resolvedDepartmentId = (unit as any).departmentId;
                    if ((unit as any).parent) {
                        const parentUnit = findUnit((unit as any).parent);
                        if (parentUnit && parentUnit.acronym) {
                            resolvedFaculty = parentUnit.acronym;
                        }
                    }
                } else if (unit.acronym) {
                    resolvedFaculty = unit.acronym;
                    resolvedDepartmentId = 'All';
                }
            } else {
                log(`[Code-Resolution] Warning: Provided acronym '${params.acronym}' not found in DB.`);
            }
        }

        // 4. Auto-correct: If Name provided but no unit, force Global Search (Faculty=All)
        // unless we already have a specific resolved faculty
        if (params.name && (!params.department || params.department === 'All') && resolvedFaculty === 'All') {
            // Keep it All
        }

        // --- END RESOLUTION ---

        // Build search URL
        const searchParams = new URLSearchParams();
        // IMPORTANT: UTAR website expects 'ALL' (uppercase), not 'All' (mixed case)
        searchParams.set('searchDept', resolvedFaculty === 'All' ? 'ALL' : resolvedFaculty);
        searchParams.set('searchDiv', resolvedDepartmentId); // resolvedId is 'All' or specific ID like 'DCS'
        searchParams.set('searchName', params.name || '');
        searchParams.set('searchExpertise', params.expertise || '');
        searchParams.set('submit', 'Search');
        searchParams.set('searchResult', 'Y');

        const url = `${baseUrl}/staffListSearchV2.jsp?${searchParams.toString()}`;
        log(`GET Request to: ${url}`);

        let currentPage = 1;
        let hasMorePages = true;
        let totalStaffCount = 0; // Track total including those without searchId
        let fullTimeCount = 0;
        let adjunctCount = 0;
        let partTimeCount = 0;

        // Pagination loop - fetch all pages
        while (hasMorePages && currentPage <= 10) { // Max 10 pages as safety limit
            const pageUrl = currentPage === 1 ? url : `${url}&iPage=${currentPage}`;
            log(`Fetching page ${currentPage}: ${pageUrl}`);

            const html = await httpsGet(pageUrl);

            const $ = cheerio.load(html);

            // Find all staff card tables (they have onclick with staffListDetailV2.jsp)
            const staffTables = $('table[onclick*="staffListDetailV2.jsp"]');
            log(`Page ${currentPage}: Found ${staffTables.length} staff cards`);

            if (staffTables.length === 0) {
                // No more staff cards, stop pagination
                hasMorePages = false;
                break;
            }

            // Check if next page link exists
            const nextPageNum = currentPage + 1;
            if (!html.includes(`iPage=${nextPageNum}`)) {
                log(`Page ${currentPage}: Last page`);
                hasMorePages = false;
            }

            // Count ALL cards on this page (including those without searchId)
            totalStaffCount += staffTables.length;

            // Step 2: Extract all searchIds first, then fetch details in parallel
            const detailFetchTasks = [];

            for (let i = 0; i < staffTables.length; i++) {
                const table = staffTables[i];
                const onclick = $(table).attr('onclick') || '';

                // Extract detail page URL from onclick="javascript:location='staffListDetailV2.jsp?searchId=16131';"
                // searchId can be: numeric (20003) = full-time, AP##### = adjunct, J##### = part-time
                const match = onclick.match(/staffListDetailV2\.jsp\?searchId=([A-Z0-9]+)/i);
                if (!match) {
                    log(`Card ${i + 1}: No searchId found in onclick (counted but details not fetched)`);
                    continue;
                }

                const searchId = match[1];

                // Categorize staff type based on searchId pattern
                let staffType: 'full-time' | 'adjunct' | 'part-time' = 'full-time';
                if (searchId.startsWith('AP')) {
                    staffType = 'adjunct';
                    adjunctCount++;
                } else if (searchId.startsWith('J')) {
                    staffType = 'part-time';
                    partTimeCount++;
                } else {
                    fullTimeCount++;
                }

                if (seenIds.has(searchId)) continue;
                seenIds.add(searchId);

                const detailUrl = `${baseUrl}/staffListDetailV2.jsp?searchId=${searchId}`;

                // Create async task for parallel execution
                detailFetchTasks.push(
                    (async () => {
                        try {
                            log(`Card ${i + 1}: Fetching detail page: ${detailUrl}`);
                            const detailHtml = await httpsGet(detailUrl);
                            const $detail = cheerio.load(detailHtml);

                            // Parse the clean, structured detail page
                            let name = "";
                            let email = "";
                            let faculty = "";
                            let department = "";
                            let designation = "";
                            let administrativePosts: string[] = [];
                            let googleScholarUrl = "";
                            let scopusUrl = "";
                            let orcidUrl = "";
                            let homepageUrl = "";

                            // Extract data from the detail page's structured format
                            $detail('tr').each((_, row) => {
                                const label = $detail(row).find('td').first().text().trim();
                                const value = $detail(row).find('td').last();
                                const valueText = value.text().trim();

                                if (label.includes('Name')) name = valueText.replace(/^:\s*/, '');
                                if (label.includes('Email')) email = valueText.replace(/^:\s*/, '');
                                if (label.includes('Faculty') || label.includes('Division')) {
                                    faculty = valueText.replace(/^:\s*/, '');
                                }
                                if (label.includes('Department') || label.includes('Unit')) {
                                    department = valueText.replace(/^:\s*/, '');
                                }
                                if (label.includes('Designation')) designation = valueText.replace(/^:\s*/, '');

                                // Capture ALL Administrative Posts
                                const labelLower = label.toLowerCase();
                                if (labelLower.includes('administrative') && labelLower.includes('post')) {
                                    const postValue = valueText.replace(/^:\s*/, '').trim();
                                    if (postValue) {
                                        administrativePosts.push(postValue);
                                        log(`Card ${i + 1}: Found admin post: "${postValue}" (label: "${label}")`);
                                    }
                                }

                                if (label.includes('Google Scholar')) {
                                    const link = value.find('a').attr('href');
                                    if (link) googleScholarUrl = link;
                                }
                                if (label.includes('Scopus')) {
                                    const link = value.find('a').attr('href');
                                    if (link) scopusUrl = link;
                                }
                                if (label.includes('Orcid')) {
                                    const link = value.find('a').attr('href');
                                    if (link) orcidUrl = link;
                                }
                                if (label.includes('Homepage URL')) {
                                    const link = value.find('a').attr('href');
                                    if (link) homepageUrl = link;
                                }
                            });

                            if (!name || !email) {
                                log(`Card ${i + 1}: Missing name or email`);
                                return null;
                            }

                            // Build position string from all administrative posts
                            let position = "";
                            if (administrativePosts.length > 0) {
                                position = administrativePosts.join('; ');
                            }
                            if (designation) {
                                if (position) position += ` (${designation})`;
                                else position = designation;
                            }
                            if (!position) position = "Staff";

                            log(`Card ${i + 1}: ✓ ${name} <${email}> - ${position}`);

                            return {
                                searchId,
                                staffType,
                                name,
                                position,
                                email,
                                faculty,
                                department,
                                designation,
                                administrativePosts,
                                googleScholarUrl,
                                scopusUrl,
                                orcidUrl,
                                homepageUrl,
                                extra: `${faculty} | ${department}`
                            };

                        } catch (detailError: any) {
                            log(`Card ${i + 1}: Error fetching detail page: ${detailError.message}`);
                            return null;
                        }
                    })()
                );
            }

            // Fetch all details in parallel
            const detailResults = await Promise.all(detailFetchTasks);

            // Add successful results to main results array
            for (const result of detailResults) {
                if (result) {
                    results.push(result);

                    // Check for early termination if searching for specific role
                    if (params.role && result.administrativePosts) {
                        const targetRole = params.role.toLowerCase();
                        const hasRole = result.administrativePosts.some(post => {
                            const p = post.toLowerCase();
                            if (p.includes(targetRole)) {
                                const falsePositives = ['deputy', 'assistant', 'associate', 'vice'];
                                const hasPrefix = falsePositives.some(prefix => p.includes(prefix) && !targetRole.includes(prefix));
                                if (hasPrefix) return false;
                                return true;
                            }
                            return false;
                        });

                        if (hasRole && resolvedDepartmentId === 'All') {
                            log(`Found ${params.role}: ${result.name}. Stopping pagination for efficiency.`);
                            hasMorePages = false;
                            break;
                        }
                    }
                }
            }


            // Move to next page
            currentPage++;
        }

        log(`Found ${totalStaffCount} total staff cards (${fullTimeCount} full-time, ${adjunctCount} adjunct, ${partTimeCount} part-time) across ${currentPage - 1} pages.`);

        // Return with clear summary message that LLM can directly use
        const breakdown = [];
        if (fullTimeCount > 0) breakdown.push(`${fullTimeCount} full-time`);
        if (adjunctCount > 0) breakdown.push(`${adjunctCount} adjunct`);
        if (partTimeCount > 0) breakdown.push(`${partTimeCount} part-time`);

        // Parse searchId to extract joining year
        // Format: YYNNN (e.g., 16072 = 2016, 72nd staff)
        // Special: J##NNN, AP##NNN, EP##NNN, E##NNN (External/Expat)
        function parseSearchId(searchId: string): { year: number; seq: number; sortKey: number } {
            if (searchId.startsWith('J')) {
                const year = 2000 + parseInt(searchId.substring(1, 3));
                const seq = parseInt(searchId.substring(3));
                return { year, seq, sortKey: year * 10000 + seq };
            }
            if (searchId.startsWith('AP')) {
                const year = 2000 + parseInt(searchId.substring(2, 4));
                const seq = parseInt(searchId.substring(4));
                return { year, seq, sortKey: year * 10000 + seq };
            }
            if (searchId.startsWith('EP')) {
                const year = 2000 + parseInt(searchId.substring(2, 4));
                const seq = parseInt(searchId.substring(4));
                return { year, seq, sortKey: year * 10000 + seq };
            }
            if (searchId.startsWith('E')) {
                const year = 2000 + parseInt(searchId.substring(1, 3));
                const seq = parseInt(searchId.substring(3));
                return { year, seq, sortKey: year * 10000 + seq };
            }
            const year = 2000 + parseInt(searchId.substring(0, 2));
            const seq = parseInt(searchId.substring(2));
            return { year, seq, sortKey: year * 10000 + seq };
        }
        // Sort staff by joining date (oldest first)
        const sortedStaff = [...results]
            .filter((staff): staff is typeof staff & { searchId: string } => !!staff.searchId)
            .sort((a, b) => {
                const aInfo = parseSearchId(a.searchId);
                const bInfo = parseSearchId(b.searchId);
                return aInfo.sortKey - bInfo.sortKey;
            }).map(staff => {
                const info = parseSearchId(staff.searchId);
                return { ...staff, joiningYear: info.year, joiningSequence: info.seq };
            });

        // Build message with oldest/newest staff info
        let message = `There are ${totalStaffCount} staff members (${breakdown.join(', ')}).`;

        // Overall oldest/newest (all staff types)
        if (sortedStaff.length > 0) {
            const oldest = sortedStaff[0];
            const newest = sortedStaff[sortedStaff.length - 1];
            message += ` Overall: Oldest staff is ${oldest.name} (joined ${oldest.joiningYear}), newest is ${newest.name} (joined ${newest.joiningYear}).`;
        }

        // Full-time only oldest/newest
        const fullTimeStaff = sortedStaff.filter(s => s.staffType === 'full-time');
        if (fullTimeStaff.length > 0) {
            const oldestFT = fullTimeStaff[0];
            const newestFT = fullTimeStaff[fullTimeStaff.length - 1];
            message += ` Full-time only: Oldest is ${oldestFT.name} (joined ${oldestFT.joiningYear}), newest is ${newestFT.name} (joined ${newestFT.joiningYear}).`;
        }

        return {
            message,
            totalCount: totalStaffCount,
            fullTimeCount,
            adjunctCount,
            partTimeCount,
            staff: results,
            sortedStaff,  // All staff sorted by joining date
            oldestStaff: sortedStaff[0] || null,
            newestStaff: sortedStaff[sortedStaff.length - 1] || null,
            oldestFullTimeStaff: fullTimeStaff[0] || null,
            newestFullTimeStaff: fullTimeStaff[fullTimeStaff.length - 1] || null
        } as any;

    } catch (error: any) {
        log(`Error: ${error.message}`);
        return [];
    }
}

// --- Tool 3: List Departments in Faculty ---
export function listDepartments(facultyName: string, logger?: (msg: string) => void) {
    const log = (msg: string) => {
        console.log(`[Tools] ${msg}`);
        if (logger) logger(`[Tools] ${msg}`);
    };

    log(`Listing departments in faculty: ${facultyName}`);

    // Find all departments that have this faculty as their parent
    const departments = unitsData.filter(unit => {
        const hasParent = (unit as any).parent === facultyName;
        const hasDepartmentId = (unit as any).departmentId !== undefined;
        return hasParent && hasDepartmentId;
    });

    if (departments.length === 0) {
        return {
            error: `No departments found for faculty '${facultyName}'. Please use utar_resolve_unit to get the correct faculty name.`,
            departments: []
        };
    }

    const departmentList = departments.map(dept => ({
        name: dept.canonical,
        acronym: dept.acronym || '',
        departmentId: (dept as any).departmentId
    }));

    log(`Found ${departmentList.length} departments`);
    return {
        faculty: facultyName,
        count: departmentList.length,
        departments: departmentList
    };
}
