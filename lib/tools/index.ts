import Fuse from 'fuse.js';
import unitsData from './units.json';
import { searchStaffFromDirectory } from './search-from-directory';
import { StaffMember } from './staff-directory-types';
import { queryStaffDirectory } from './query-staff-directory';
export { queryDesignationStats, compareDesignationsAcrossDepartments } from './query-designation-stats';


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


// --- Tool 2: Search Staff (Cache-Only) ---

export async function searchStaff(
    params: {
        faculty?: string;
        department?: string;
        name?: string;
        email?: string;
        expertise?: string;
        role?: string;
        designation?: string;
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
        // If query is just for counts (no name/email/expertise/role/designation filters), use metadata directly
        // BUT: If department is specified (not just acronym), user likely wants staff list, not just counts
        const isCountOnlyQuery = !params.name && !params.email && !params.expertise && !params.role && !params.designation && !params.department;

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
                        expatriateCount: counts.expatriateCount,
                        designationCounts: counts.designationCounts
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

                // Check if this is a detail query (role/name/email/expertise/designation) or count-only query
                const isDetailQuery = params.role || params.name || params.email || params.expertise || params.designation;

                if (isDetailQuery) {
                    // Return full staff details for role/name/expertise queries
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
                    // Return summary only for count queries
                    return {
                        message,
                        totalCount: staffFromDirectory.length,
                        fullTimeCount,
                        adjunctCount,
                        partTimeCount,
                        expatriateCount
                    } as any;
                }
            } else {
                log('No results from lookup table.');
                return {
                    error: 'No staff found in cached directory. Please ensure the staff directory cache is up to date by running the sync command.',
                    message: 'No staff members found matching your criteria in the cached directory.',
                    totalCount: 0,
                    fullTimeCount: 0,
                    adjunctCount: 0,
                    partTimeCount: 0,
                    expatriateCount: 0,
                    staff: []
                } as any;
            }
        } catch (error: any) {
            log(`Lookup table search failed: ${error.message}`);
            return {
                error: `Staff directory search error: ${error.message}. Please ensure the staff directory cache is up to date.`,
                message: 'An error occurred while searching the cached staff directory.',
                totalCount: 0,
                fullTimeCount: 0,
                adjunctCount: 0,
                partTimeCount: 0,
                expatriateCount: 0,
                staff: []
            } as any;
        }

        // **LIVE SCRAPING DISABLED**
        // Live scraping has been disabled to ensure deterministic results.
        // All queries now use cached data only.
        // This code path should never be reached.
        log('ERROR: Reached unreachable code path. This should not happen.');
        return {
            error: 'Internal error: Reached unreachable code path in searchStaff function.',
            message: 'An unexpected error occurred.',
            totalCount: 0,
            fullTimeCount: 0,
            adjunctCount: 0,
            partTimeCount: 0,
            expatriateCount: 0,
            staff: []
        } as any;
    } catch (error: any) {
        log(`Error in searchStaff: ${error.message}`);
        return {
            error: `Staff directory search error: ${error.message}`,
            message: 'An error occurred while searching the staff directory.',
            totalCount: 0,
            fullTimeCount: 0,
            adjunctCount: 0,
            partTimeCount: 0,
            expatriateCount: 0,
            staff: []
        } as any;
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
