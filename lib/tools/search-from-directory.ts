import Fuse from 'fuse.js';
import { loadStaffDirectory } from './staff-directory';
import { StaffMember } from './staff-directory-types';

/**
 * Search staff from the lookup table (staff_directory.json)
 * This is much faster than live scraping (< 1 second vs 20-30 seconds)
 */
export function searchStaffFromDirectory(
    params: {
        faculty?: string;
        department?: string;
        name?: string;
        expertise?: string;
        role?: string;
        acronym?: string;
    },
    logger?: (msg: string) => void
): StaffMember[] {
    const log = (msg: string) => {
        console.log(`[StaffDirectory] ${msg}`);
        if (logger) logger(`[StaffDirectory] ${msg}`);
    };

    log('Searching staff from lookup table...');

    // Load directory
    const directory = loadStaffDirectory();
    if (!directory) {
        log('ERROR: Staff directory not found. Please run sync first.');
        return [];
    }

    // Collect all staff from relevant faculties/departments
    let allStaff: StaffMember[] = [];

    // If acronym is provided, use it to find the specific unit
    if (params.acronym) {
        log(`Searching by acronym: ${params.acronym}`);

        // Check if it's a faculty acronym
        const faculty = directory.faculties[params.acronym];
        if (faculty) {
            log(`Found faculty: ${faculty.canonical}`);
            for (const dept of Object.values(faculty.departments)) {
                allStaff.push(...dept.staff);
            }
        } else {
            // Check if it's a department acronym
            for (const fac of Object.values(directory.faculties)) {
                const dept = fac.departments[params.acronym];
                if (dept) {
                    log(`Found department: ${dept.canonical} in ${fac.canonical}`);
                    allStaff.push(...dept.staff);
                    break;
                }
            }
        }
    } else if (params.faculty || params.department) {
        // Search by faculty/department name
        const facultyQuery = params.faculty?.toLowerCase() || '';
        // Normalize 'all' to empty string (faculty-wide search)
        const deptQuery = (params.department?.toLowerCase() === 'all' ? '' : params.department?.toLowerCase()) || '';

        for (const [facAcronym, fac] of Object.entries(directory.faculties)) {
            // Check if faculty matches
            const facultyMatches = !facultyQuery ||
                fac.canonical.toLowerCase().includes(facultyQuery) ||
                facAcronym.toLowerCase().includes(facultyQuery) ||
                fac.aliases.some(a => a.toLowerCase().includes(facultyQuery));

            if (facultyMatches) {
                if (deptQuery) {
                    // Search specific department
                    for (const [deptAcronym, dept] of Object.entries(fac.departments)) {
                        const deptMatches = dept.canonical.toLowerCase().includes(deptQuery) ||
                            deptAcronym.toLowerCase().includes(deptQuery) ||
                            dept.aliases.some(a => a.toLowerCase().includes(deptQuery));

                        if (deptMatches) {
                            log(`Matched department: ${dept.canonical}`);
                            allStaff.push(...dept.staff);
                        }
                    }
                } else {
                    // Get all staff from faculty
                    log(`Matched faculty: ${fac.canonical}`);
                    for (const dept of Object.values(fac.departments)) {
                        allStaff.push(...dept.staff);
                    }
                }
            }
        }
    } else {
        // No faculty/department filter - search all staff
        log('Searching across all faculties');
        for (const fac of Object.values(directory.faculties)) {
            for (const dept of Object.values(fac.departments)) {
                allStaff.push(...dept.staff);
            }
        }
    }

    log(`Found ${allStaff.length} staff before filtering`);

    // Apply filters
    let results = allStaff;

    // Filter by name (fuzzy search)
    if (params.name) {
        const nameFuse = new Fuse(results, {
            keys: ['name'],
            threshold: 0.3,
            includeScore: true
        });
        const nameResults = nameFuse.search(params.name);
        results = nameResults.map(r => r.item);
        log(`After name filter: ${results.length} staff`);
    }

    // Filter by expertise (fuzzy search in areasOfExpertise array)
    if (params.expertise) {
        const expertiseQuery = params.expertise.toLowerCase();
        results = results.filter(staff =>
            staff.areasOfExpertise?.some(area =>
                area.toLowerCase().includes(expertiseQuery)
            ) || false
        );
        log(`After expertise filter: ${results.length} staff`);
    }

    // Filter by role/administrative post
    if (params.role) {
        const roleQuery = params.role.toLowerCase();
        results = results.filter(staff => {
            // Check administrative posts (exact match for precision)
            if (staff.administrativePosts?.some(post =>
                post.toLowerCase() === roleQuery
            )) return true;

            // Check position field (fuzzy match for flexibility)
            if (staff.position.toLowerCase().includes(roleQuery)) return true;

            // Check designation (fuzzy match for flexibility)
            if (staff.designation?.toLowerCase().includes(roleQuery)) return true;

            return false;
        });
        log(`After role filter: ${results.length} staff`);
    }

    log(`Returning ${results.length} staff from lookup table`);
    return results;
}
