import { loadStaffDirectory } from './staff-directory';

/**
 * Query designation statistics from pre-calculated metadata
 * This is MUCH faster than filtering through all staff members
 */
export function queryDesignationStats(
    params: {
        faculty?: string;
        department?: string;
        acronym?: string;
        designation?: string;
    },
    logger?: (msg: string) => void
) {
    const log = (msg: string) => {
        console.log(`[DesignationQuery] ${msg}`);
        if (logger) logger(`[DesignationQuery] ${msg}`);
    };

    log(`Querying designation stats: ${JSON.stringify(params)}`);

    const directory = loadStaffDirectory();
    if (!directory) {
        log('ERROR: Staff directory not found');
        return null;
    }

    // Helper to normalize designation query
    const normalizeDesignation = (query: string): string => {
        const q = query.toLowerCase().trim();

        // Map common variations to standard designations
        const mappings: Record<string, string> = {
            'senior prof': 'Senior Professor',
            'prof': 'Professor',
            'emeritus prof': 'Emeritus Professor',
            'assoc prof': 'Associate Professor',
            'associate prof': 'Associate Professor',
            'asst prof': 'Assistant Professor',
            'assistant prof': 'Assistant Professor',
            'adjunct prof': 'Adjunct Professor',
            'lecturer': 'Lecturer',
            'senior lecturer': 'Senior Lecturer'
        };

        // Check mappings first
        for (const [key, value] of Object.entries(mappings)) {
            if (q.includes(key)) return value;
        }

        // Try to match by partial string
        if (q.includes('senior') && q.includes('professor')) return 'Senior Professor';
        if (q.includes('emeritus')) return 'Emeritus Professor';
        if (q.includes('associate')) return 'Associate Professor';
        if (q.includes('assistant')) return 'Assistant Professor';
        if (q.includes('adjunct')) return 'Adjunct Professor';
        if (q.includes('professor') && !q.includes('associate') && !q.includes('assistant')) return 'Professor';
        if (q.includes('lecturer')) return 'Lecturer';

        return query; // Return original if no match
    };

    // Determine target unit
    let targetFaculty: any = null;
    let targetDepartment: any = null;
    let unitName = '';

    if (params.acronym) {
        // Check if acronym is a faculty
        targetFaculty = directory.faculties[params.acronym];
        if (targetFaculty) {
            unitName = targetFaculty.canonical;
            log(`Found faculty: ${unitName}`);
        } else {
            // Check if it's a department
            for (const fac of Object.values(directory.faculties)) {
                const dept = fac.departments[params.acronym];
                if (dept) {
                    targetDepartment = dept;
                    targetFaculty = fac;
                    unitName = `${dept.canonical} (${fac.acronym})`;
                    log(`Found department: ${unitName}`);
                    break;
                }
            }
        }
    } else if (params.faculty) {
        // Find faculty by name
        const facQuery = params.faculty.toLowerCase();
        for (const [facKey, fac] of Object.entries(directory.faculties)) {
            if (fac.canonical.toLowerCase().includes(facQuery) ||
                facKey.toLowerCase() === facQuery ||
                fac.aliases.some(a => a.toLowerCase().includes(facQuery))) {
                targetFaculty = fac;
                unitName = fac.canonical;
                log(`Found faculty: ${unitName}`);
                break;
            }
        }

        // If department is also specified
        if (targetFaculty && params.department) {
            const deptQuery = params.department.toLowerCase();
            for (const [deptKey, dept] of Object.entries(targetFaculty.departments)) {
                if ((dept as any).canonical.toLowerCase().includes(deptQuery) ||
                    deptKey.toLowerCase() === deptQuery ||
                    (dept as any).aliases.some((a: string) => a.toLowerCase().includes(deptQuery))) {
                    targetDepartment = dept;
                    unitName = `${(dept as any).canonical} (${targetFaculty.acronym})`;
                    log(`Found department: ${unitName}`);
                    break;
                }
            }
        }
    }

    if (!targetFaculty && !targetDepartment) {
        log('ERROR: Could not find specified unit');
        return null;
    }

    // Get designation stats from the appropriate level
    const unit = targetDepartment || targetFaculty;
    const designationCounts = unit.designationCounts || {};
    const designationLists = unit.designationLists || {};

    // If specific designation requested
    if (params.designation) {
        const normalizedDesignation = normalizeDesignation(params.designation);
        log(`Normalized designation: "${params.designation}" -> "${normalizedDesignation}"`);

        const count = designationCounts[normalizedDesignation] || 0;
        const list = designationLists[normalizedDesignation] || [];

        return {
            unit: unitName,
            unitType: targetDepartment ? 'department' : 'faculty',
            designation: normalizedDesignation,
            count,
            staff: list,
            message: `${unitName} has ${count} ${normalizedDesignation}${count !== 1 ? 's' : ''}.`
        };
    }

    // Return all designation stats
    // Build a formatted breakdown to prevent LLM hallucinations
    const breakdown = Object.entries(designationCounts)
        .filter(([_, count]) => (count as number) > 0)
        .map(([designation, count]) => `${designation}: ${count}`)
        .join(', ');

    return {
        unit: unitName,
        unitType: targetDepartment ? 'department' : 'faculty',
        designationCounts,
        designationLists,
        totalStaff: unit.staffCount,
        message: `${unitName} has ${unit.staffCount} total staff across ${Object.keys(designationCounts).length} designation categories.\n\n**EXACT COUNTS (DO NOT MODIFY):**\n${breakdown}\n\n**CRITICAL**: Use these EXACT numbers in your response. Do NOT swap or modify any values.`
    };
}

/**
 * Compare designation counts across all departments in a faculty
 */
export function compareDesignationsAcrossDepartments(
    params: {
        faculty?: string;
        acronym?: string;
        designation?: string;
    },
    logger?: (msg: string) => void
) {
    const log = (msg: string) => {
        console.log(`[DesignationComparison] ${msg}`);
        if (logger) logger(`[DesignationComparison] ${msg}`);
    };

    log(`Comparing designations: ${JSON.stringify(params)}`);

    const directory = loadStaffDirectory();
    if (!directory) {
        log('ERROR: Staff directory not found');
        return null;
    }

    // Find target faculty
    let targetFaculty: any = null;
    const facultyQuery = params.acronym || params.faculty;

    if (!facultyQuery) {
        log('ERROR: Faculty or acronym must be specified');
        return null;
    }

    targetFaculty = directory.faculties[facultyQuery];
    if (!targetFaculty) {
        const query = facultyQuery.toLowerCase();
        for (const [facKey, fac] of Object.entries(directory.faculties)) {
            if (fac.canonical.toLowerCase().includes(query) ||
                facKey.toLowerCase() === query ||
                fac.aliases.some(a => a.toLowerCase().includes(query))) {
                targetFaculty = fac;
                break;
            }
        }
    }

    if (!targetFaculty) {
        log(`ERROR: Faculty not found: ${facultyQuery}`);
        return null;
    }

    log(`Comparing departments in: ${targetFaculty.canonical}`);

    // Collect designation data from all departments
    const comparison: Array<{
        department: string;
        acronym: string;
        designationCounts: Record<string, number>;
        totalStaff: number;
    }> = [];

    for (const [deptKey, dept] of Object.entries(targetFaculty.departments)) {
        comparison.push({
            department: (dept as any).canonical,
            acronym: deptKey,
            designationCounts: (dept as any).designationCounts || {},
            totalStaff: (dept as any).staffCount
        });
    }

    // Sort by total staff count (descending)
    comparison.sort((a, b) => b.totalStaff - a.totalStaff);

    // If specific designation requested, filter and sort by that
    if (params.designation) {
        const designationKey = params.designation;
        const filtered = comparison.map(dept => ({
            department: dept.department,
            acronym: dept.acronym,
            count: dept.designationCounts[designationKey] || 0,
            totalStaff: dept.totalStaff
        }));

        filtered.sort((a, b) => b.count - a.count);

        return {
            faculty: targetFaculty.canonical,
            designation: designationKey,
            departments: filtered,
            totalDepartments: comparison.length,
            departmentsWithDesignation: filtered.length,
            message: `${filtered.length} out of ${comparison.length} departments in ${targetFaculty.canonical} have ${designationKey}s.`
        };
    }

    // Return full comparison
    return {
        faculty: targetFaculty.canonical,
        departments: comparison,
        totalDepartments: comparison.length,
        message: `Comparison of ${comparison.length} departments in ${targetFaculty.canonical}.`
    };
}
