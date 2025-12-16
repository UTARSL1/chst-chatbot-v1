import Fuse from 'fuse.js';
import * as cheerio from 'cheerio';
import unitsData from './units.json';
import https from 'https';

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
    googleScholarUrl?: string;
    scopusUrl?: string;
    orcidUrl?: string;
    homepageUrl?: string;
    extra?: string;
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
        expertise?: string;
    },
    logger?: (msg: string) => void
) {
    const log = (msg: string) => {
        console.log(`[Tools] ${msg}`);
        if (logger) logger(`[Tools] ${msg}`);
    };

    try {
        log(`Searching staff with params: ${JSON.stringify(params)}`);

        const baseUrl = 'https://www2.utar.edu.my';
        const results: StaffResult[] = [];
        const seenIds = new Set<string>();

        // Auto-correct: If searching by name only (no department), use 'All' for faculty
        // This prevents LLM from hallucinating a faculty
        let facultyAcronym = params.faculty || 'All';
        if (params.name && !params.department && facultyAcronym !== 'All') {
            log(`Auto-correcting: Searching by name only, setting faculty to 'All' (was: '${facultyAcronym}')`);
            facultyAcronym = 'All';
        }

        if (facultyAcronym !== 'All') {
            const queryLower = facultyAcronym.toLowerCase().trim();
            const unit = unitsData.find(u =>
                u.canonical.toLowerCase() === queryLower ||
                (u.acronym && u.acronym.toLowerCase() === queryLower)
            );
            if (unit && unit.acronym) {
                facultyAcronym = unit.acronym;
                log(`Mapped faculty '${params.faculty}' to acronym '${facultyAcronym}'`);
            }
        }

        // Resolve department to ID if provided
        let departmentId = 'All';
        if (params.department && params.department !== 'All') {
            const deptQueryLower = params.department.toLowerCase().trim();
            const deptUnit = unitsData.find(u =>
                u.canonical.toLowerCase() === deptQueryLower ||
                (u.acronym && u.acronym.toLowerCase() === deptQueryLower)
            );
            if (deptUnit && (deptUnit as any).departmentId) {
                departmentId = (deptUnit as any).departmentId;
                log(`Mapped department '${params.department}' to ID '${departmentId}'`);

                // Auto-correct faculty if department has a parent faculty
                if ((deptUnit as any).parent) {
                    const correctFaculty = (deptUnit as any).parent;
                    const correctFacultyUnit = unitsData.find(u => u.canonical === correctFaculty);
                    if (correctFacultyUnit && correctFacultyUnit.acronym) {
                        facultyAcronym = correctFacultyUnit.acronym;
                        log(`Auto-corrected faculty to '${correctFaculty}' (${facultyAcronym}) based on department's parent`);
                    }
                }
            } else {
                // Department not found - return error to force LLM to use correct name
                const errorMsg = `Department '${params.department}' not found in units database. Please use utar_resolve_unit to get the correct department name, or check the spelling.`;
                log(`ERROR: ${errorMsg}`);
                return {
                    message: errorMsg,
                    totalCount: 0,
                    fullTimeCount: 0,
                    adjunctCount: 0,
                    partTimeCount: 0,
                    staff: []
                } as any;
            }
        }

        // Build search URL
        const searchParams = new URLSearchParams();
        searchParams.set('searchDept', facultyAcronym);
        searchParams.set('searchDiv', departmentId);
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

            // Step 2: For each staff card, extract detail page URL and fetch it
            for (let i = 0; i < staffTables.length; i++) {
                const table = staffTables[i];
                const onclick = $(table).attr('onclick') || '';

                // Extract detail page URL from onclick="javascript:location='staffListDetailV2.jsp?searchId=16131';"
                // searchId can be: numeric (20003) = full-time, AP##### = adjunct, J##### = part-time
                const match = onclick.match(/staffListDetailV2\.jsp\?searchId=([A-Z0-9]+)/i);
                if (!match) {
                    log(`Card ${i + 1}: No searchId found in onclick (counted but details not fetched)`);
                    // Still count this card, just can't fetch details
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
                log(`Card ${i + 1}: Fetching detail page: ${detailUrl}`);

                try {
                    const detailHtml = await httpsGet(detailUrl);
                    const $detail = cheerio.load(detailHtml);

                    // Parse the clean, structured detail page
                    let name = "";
                    let email = "";
                    let faculty = "";
                    let department = "";
                    let designation = "";
                    let administrativePosts: string[] = []; // Changed to array to capture ALL posts
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

                        // Capture ALL Administrative Posts (not just the first one)
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
                        continue;
                    }

                    // Build position string from all administrative posts
                    let position = "";
                    if (administrativePosts.length > 0) {
                        position = administrativePosts.join('; '); // Join multiple posts with semicolon
                    }
                    if (designation) {
                        if (position) position += ` (${designation})`;
                        else position = designation;
                    }
                    if (!position) position = "Staff";

                    log(`Card ${i + 1}: ✓ ${name} <${email}> - ${position}`);

                    results.push({
                        searchId,  // For sorting by hire date (higher = newer)
                        staffType, // For filtering (full-time, adjunct, part-time)
                        name,
                        position,
                        email,
                        faculty,
                        department,
                        designation,
                        administrativePosts, // Now an array of all posts
                        googleScholarUrl,
                        scopusUrl,
                        orcidUrl,
                        homepageUrl,
                        extra: `${faculty} | ${department}`
                    });

                } catch (detailError: any) {
                    log(`Card ${i + 1}: Error fetching detail page: ${detailError.message}`);
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

        return {
            message: `There are ${totalStaffCount} staff members (${breakdown.join(', ')}).`,
            totalCount: totalStaffCount,
            fullTimeCount,
            adjunctCount,
            partTimeCount,
            staff: results
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
