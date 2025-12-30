import { StaffDirectory, StaffMember } from './staff-directory-types';

export interface PositionChange {
    searchId: string;
    name: string;
    faculty: string;
    department: string;
    oldDesignation: string;
    newDesignation: string;
    changeType: 'promotion' | 'demotion' | 'lateral' | 'unknown';
}

export interface AdminPostChange {
    searchId: string;
    name: string;
    faculty: string;
    department: string;
    oldPosts: string[];
    newPosts: string[];
    added: string[];
    removed: string[];
}

export interface StaffCountChange {
    unit: string; // faculty or department name
    unitType: 'faculty' | 'department';
    oldCount: number;
    newCount: number;
    change: number;
    percentChange: number;
}

export interface ComparisonResult {
    year1: number;
    year2: number;
    summary: {
        totalStaffYear1: number;
        totalStaffYear2: number;
        netChange: number;
        promotions: number;
        demotions: number;
        lateralMoves: number;
        adminPostChanges: number;
        newHires: number;
        departures: number;
    };
    positionChanges: PositionChange[];
    adminPostChanges: AdminPostChange[];
    facultyCountChanges: StaffCountChange[];
    departmentCountChanges: StaffCountChange[];
    newHires: StaffMember[];
    departures: StaffMember[];
}

// Academic rank hierarchy for promotion detection
const ACADEMIC_RANKS: Record<string, number> = {
    'Senior Professor': 1,
    'Professor': 2,
    'Associate Professor': 3,
    'Assistant Professor': 4,
    'Senior Lecturer': 5,
    'Lecturer': 6,
    'Tutor': 7,
};

// Administrative rank hierarchy
const ADMIN_RANKS: Record<string, number> = {
    'Senior Specialist': 1,
    'Specialist 2': 2,
    'Specialist 1': 3,
    'Senior Officer': 4,
    'Officer': 5,
    'Assistant Officer': 6,
};

/**
 * Determine if a designation change is a promotion, demotion, or lateral move
 */
function classifyPositionChange(oldDesignation: string, newDesignation: string): 'promotion' | 'demotion' | 'lateral' | 'unknown' {
    if (oldDesignation === newDesignation) return 'lateral';

    // Check academic ranks
    const oldAcademicRank = ACADEMIC_RANKS[oldDesignation];
    const newAcademicRank = ACADEMIC_RANKS[newDesignation];

    if (oldAcademicRank !== undefined && newAcademicRank !== undefined) {
        if (newAcademicRank < oldAcademicRank) return 'promotion';
        if (newAcademicRank > oldAcademicRank) return 'demotion';
        return 'lateral';
    }

    // Check administrative ranks
    const oldAdminRank = ADMIN_RANKS[oldDesignation];
    const newAdminRank = ADMIN_RANKS[newDesignation];

    if (oldAdminRank !== undefined && newAdminRank !== undefined) {
        if (newAdminRank < oldAdminRank) return 'promotion';
        if (newAdminRank > oldAdminRank) return 'demotion';
        return 'lateral';
    }

    // If we can't determine, mark as unknown
    return 'unknown';
}

/**
 * Compare two staff directories and generate a comparison report
 */
export function compareStaffDirectories(dir1: StaffDirectory, dir2: StaffDirectory): ComparisonResult {
    const year1 = dir1.legacyMetadata?.snapshotYear || new Date(dir1.lastUpdated).getFullYear();
    const year2 = dir2.legacyMetadata?.snapshotYear || new Date(dir2.lastUpdated).getFullYear();

    // Build maps of staff by searchId for both years
    const staff1Map = new Map<string, StaffMember & { faculty: string; department: string }>();
    const staff2Map = new Map<string, StaffMember & { faculty: string; department: string }>();

    // Populate year 1 map
    for (const [facultyKey, faculty] of Object.entries(dir1.faculties)) {
        for (const [deptKey, dept] of Object.entries(faculty.departments)) {
            for (const staff of dept.staff) {
                staff1Map.set(staff.searchId, {
                    ...staff,
                    faculty: facultyKey,
                    department: deptKey
                });
            }
        }
    }

    // Populate year 2 map
    for (const [facultyKey, faculty] of Object.entries(dir2.faculties)) {
        for (const [deptKey, dept] of Object.entries(faculty.departments)) {
            for (const staff of dept.staff) {
                staff2Map.set(staff.searchId, {
                    ...staff,
                    faculty: facultyKey,
                    department: deptKey
                });
            }
        }
    }

    // Detect changes
    const positionChanges: PositionChange[] = [];
    const adminPostChanges: AdminPostChange[] = [];
    const newHires: StaffMember[] = [];
    const departures: StaffMember[] = [];

    // Find position changes and admin post changes
    for (const [searchId, staff1] of staff1Map.entries()) {
        const staff2 = staff2Map.get(searchId);

        if (!staff2) {
            // Staff left
            departures.push(staff1);
        } else {
            // Check for position change
            if (staff1.designation !== staff2.designation) {
                const changeType = classifyPositionChange(staff1.designation, staff2.designation);
                positionChanges.push({
                    searchId,
                    name: staff1.name,
                    faculty: staff1.faculty,
                    department: staff1.department,
                    oldDesignation: staff1.designation,
                    newDesignation: staff2.designation,
                    changeType
                });
            }

            // Check for administrative post changes
            const oldPosts = staff1.administrativePosts || [];
            const newPosts = staff2.administrativePosts || [];

            if (JSON.stringify(oldPosts.sort()) !== JSON.stringify(newPosts.sort())) {
                const added = newPosts.filter(p => !oldPosts.includes(p));
                const removed = oldPosts.filter(p => !newPosts.includes(p));

                adminPostChanges.push({
                    searchId,
                    name: staff1.name,
                    faculty: staff1.faculty,
                    department: staff1.department,
                    oldPosts,
                    newPosts,
                    added,
                    removed
                });
            }
        }
    }

    // Find new hires
    for (const [searchId, staff2] of staff2Map.entries()) {
        if (!staff1Map.has(searchId)) {
            newHires.push(staff2);
        }
    }

    // Calculate faculty count changes
    const facultyCountChanges: StaffCountChange[] = [];
    const allFaculties = new Set([...Object.keys(dir1.faculties), ...Object.keys(dir2.faculties)]);

    for (const facultyKey of allFaculties) {
        const oldCount = dir1.faculties[facultyKey]?.uniqueStaffCount || 0;
        const newCount = dir2.faculties[facultyKey]?.uniqueStaffCount || 0;
        const change = newCount - oldCount;

        if (change !== 0) {
            facultyCountChanges.push({
                unit: facultyKey,
                unitType: 'faculty',
                oldCount,
                newCount,
                change,
                percentChange: oldCount > 0 ? (change / oldCount) * 100 : 100
            });
        }
    }

    // Calculate department count changes
    const departmentCountChanges: StaffCountChange[] = [];
    for (const [facultyKey, faculty] of Object.entries(dir2.faculties)) {
        for (const [deptKey, dept] of Object.entries(faculty.departments)) {
            const oldDept = dir1.faculties[facultyKey]?.departments[deptKey];
            const oldCount = oldDept?.staffCount || 0;
            const newCount = dept.staffCount;
            const change = newCount - oldCount;

            if (change !== 0) {
                departmentCountChanges.push({
                    unit: `${facultyKey} - ${deptKey}`,
                    unitType: 'department',
                    oldCount,
                    newCount,
                    change,
                    percentChange: oldCount > 0 ? (change / oldCount) * 100 : 100
                });
            }
        }
    }

    // Calculate summary statistics
    const promotions = positionChanges.filter(c => c.changeType === 'promotion').length;
    const demotions = positionChanges.filter(c => c.changeType === 'demotion').length;
    const lateralMoves = positionChanges.filter(c => c.changeType === 'lateral').length;

    return {
        year1,
        year2,
        summary: {
            totalStaffYear1: dir1.metadata.uniqueStaffCount || 0,
            totalStaffYear2: dir2.metadata.uniqueStaffCount || 0,
            netChange: (dir2.metadata.uniqueStaffCount || 0) - (dir1.metadata.uniqueStaffCount || 0),
            promotions,
            demotions,
            lateralMoves,
            adminPostChanges: adminPostChanges.length,
            newHires: newHires.length,
            departures: departures.length
        },
        positionChanges,
        adminPostChanges,
        facultyCountChanges,
        departmentCountChanges,
        newHires,
        departures
    };
}
