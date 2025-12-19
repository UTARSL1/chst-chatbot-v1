import { loadStaffDirectory } from './staff-directory';
import { StaffCounts } from './staff-directory-types';

/**
 * Get aggregated staff counts for multiple departments/faculties
 * Handles faculty relationships automatically from metadata
 * Returns combined counts in a single call
 */
export function getMultiUnitStaffCounts(
    params: {
        acronyms?: string[]; // Array of department/faculty acronyms
    },
    logger?: (msg: string) => void
): {
    success: boolean;
    message: string;
    units: Array<{
        acronym: string;
        name: string;
        type: 'faculty' | 'department';
        counts: StaffCounts;
    }>;
    totalStaff: number;
    totalUnique?: number;
} {
    const log = (msg: string) => {
        console.log(`[MultiUnitCounts] ${msg}`);
        if (logger) logger(`[MultiUnitCounts] ${msg}`);
    };

    log('Getting counts for multiple units...');

    const directory = loadStaffDirectory();
    if (!directory) {
        log('ERROR: Staff directory not found');
        return {
            success: false,
            message: 'Staff directory not found. Please run sync first.',
            units: [],
            totalStaff: 0
        };
    }

    if (!params.acronyms || params.acronyms.length === 0) {
        return {
            success: false,
            message: 'No acronyms provided',
            units: [],
            totalStaff: 0
        };
    }

    const results: Array<{
        acronym: string;
        name: string;
        type: 'faculty' | 'department';
        counts: StaffCounts;
    }> = [];

    let totalStaff = 0;
    const uniqueStaffIds = new Set<string>();

    // Process each acronym
    for (const acronym of params.acronyms) {
        log(`Looking up: ${acronym}`);

        // Check if it's a faculty
        const faculty = directory.faculties[acronym];
        if (faculty) {
            log(`Found faculty: ${faculty.canonical}`);
            results.push({
                acronym,
                name: faculty.canonical,
                type: 'faculty',
                counts: {
                    staffCount: faculty.staffCount,
                    uniqueStaffCount: faculty.uniqueStaffCount,
                    fullTimeCount: faculty.fullTimeCount,
                    adjunctCount: faculty.adjunctCount,
                    partTimeCount: faculty.partTimeCount,
                    expatriateCount: faculty.expatriateCount,
                    emeritusCount: faculty.emeritusCount
                }
            });
            totalStaff += faculty.staffCount;

            // Collect unique staff IDs from this faculty
            for (const dept of Object.values(faculty.departments)) {
                for (const staff of dept.staff) {
                    uniqueStaffIds.add(staff.searchId);
                }
            }
            continue;
        }

        // Check if it's a department (search across all faculties)
        let found = false;
        for (const fac of Object.values(directory.faculties)) {
            const dept = fac.departments[acronym];
            if (dept) {
                log(`Found department: ${dept.canonical} in ${fac.canonical}`);
                results.push({
                    acronym,
                    name: dept.canonical,
                    type: 'department',
                    counts: {
                        staffCount: dept.staffCount,
                        fullTimeCount: dept.fullTimeCount,
                        adjunctCount: dept.adjunctCount,
                        partTimeCount: dept.partTimeCount,
                        expatriateCount: dept.expatriateCount,
                        emeritusCount: dept.emeritusCount
                    }
                });
                totalStaff += dept.staffCount;

                // Collect unique staff IDs from this department
                for (const staff of dept.staff) {
                    uniqueStaffIds.add(staff.searchId);
                }
                found = true;
                break;
            }
        }

        if (!found) {
            log(`WARNING: Acronym not found: ${acronym}`);
        }
    }

    if (results.length === 0) {
        return {
            success: false,
            message: `No units found for acronyms: ${params.acronyms.join(', ')}`,
            units: [],
            totalStaff: 0
        };
    }

    // Build message
    const unitDescriptions = results.map(r =>
        `${r.name} (${r.acronym}): ${r.counts.staffCount} staff`
    );
    const message = `Found ${results.length} unit(s):\n${unitDescriptions.join('\n')}\nTotal: ${totalStaff} staff positions (${uniqueStaffIds.size} unique staff)`;

    log(message);

    return {
        success: true,
        message,
        units: results,
        totalStaff,
        totalUnique: uniqueStaffIds.size
    };
}
