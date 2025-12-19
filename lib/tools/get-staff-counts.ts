import { loadStaffDirectory } from './staff-directory';
import { StaffCounts } from './staff-directory-types';

/**
 * Get staff counts from metadata (pre-calculated, instant)
 * Use this when you only need counts, not individual staff details
 */
export function getStaffCountsFromMetadata(
    params: {
        faculty?: string;
        department?: string;
        acronym?: string;
    },
    logger?: (msg: string) => void
): StaffCounts | null {
    const log = (msg: string) => {
        console.log(`[StaffDirectory] ${msg}`);
        if (logger) logger(`[StaffDirectory] ${msg}`);
    };

    log('Getting staff counts from metadata...');

    const directory = loadStaffDirectory();
    if (!directory) {
        log('ERROR: Staff directory not found');
        return null;
    }

    // If acronym is provided, use it directly
    if (params.acronym) {
        // Check if it's a faculty
        const faculty = directory.faculties[params.acronym];
        if (faculty) {
            log(`Found faculty metadata: ${faculty.canonical}`);
            return {
                staffCount: faculty.staffCount,
                uniqueStaffCount: faculty.uniqueStaffCount,
                fullTimeCount: faculty.fullTimeCount,
                adjunctCount: faculty.adjunctCount,
                partTimeCount: faculty.partTimeCount,
                expatriateCount: faculty.expatriateCount,
                emeritusCount: faculty.emeritusCount
            };
        }

        // Check if it's a department
        for (const fac of Object.values(directory.faculties)) {
            const dept = fac.departments[params.acronym];
            if (dept) {
                log(`Found department metadata: ${dept.canonical}`);
                return {
                    staffCount: dept.staffCount,
                    fullTimeCount: dept.fullTimeCount,
                    adjunctCount: dept.adjunctCount,
                    partTimeCount: dept.partTimeCount,
                    expatriateCount: dept.expatriateCount,
                    emeritusCount: dept.emeritusCount
                };
            }
        }
    }

    log('No matching metadata found');
    return null;
}
