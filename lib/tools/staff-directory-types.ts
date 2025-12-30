// Staff Directory Types and Interfaces

export type EmploymentType = 'full-time' | 'adjunct' | 'part-time' | 'expatriate' | 'emeritus' | 'unknown';
export type DepartmentType = 'Academic' | 'Administrative';
export type AcademicCategory = 'Engineering' | 'Non-Engineering' | 'N/A'; // N/A for administrative depts

export interface StaffMember {
    searchId: string;
    staffType: EmploymentType;
    employmentType: string; // Human-readable label
    name: string;
    position: string;
    email?: string; // Optional: new/adjunct staff may not have email yet
    faculty: string;
    facultyAcronym: string;
    department: string;
    departmentAcronym: string;
    designation: string;
    administrativePosts?: string[]; // Optional: most staff don't have admin posts
    googleScholarUrl?: string;
    scopusUrl?: string;
    orcidUrl?: string;
    homepageUrl?: string;
    areasOfExpertise?: string[]; // Optional: admin staff may not have research expertise
    joiningYear: number;
    joiningSequence: number;
}

export interface StaffCounts {
    staffCount: number;
    uniqueStaffCount?: number; // Unique staff by searchId (faculty/global level only)
    fullTimeCount: number;
    adjunctCount: number;
    partTimeCount: number;
    expatriateCount: number;
    emeritusCount: number;
    unknownCount?: number;
}

export interface Department extends StaffCounts {
    canonical: string;
    acronym: string;
    aliases: string[];
    departmentId: string;
    parent: string;
    type: string;
    departmentType: DepartmentType;
    academicCategory?: AcademicCategory; // Engineering, Non-Engineering, or N/A
    staff: StaffMember[];
}

export interface Faculty extends StaffCounts {
    canonical: string;
    acronym: string;
    aliases: string[];
    type: string;
    departments: Record<string, Department>;
}

export interface ResearchCentre extends StaffCounts {
    canonical: string;
    acronym: string;
    aliases: string[];
    type: string;
    staff: StaffMember[];
}

export interface TopLevelDepartment extends StaffCounts {
    canonical: string;
    acronym: string;
    aliases: string[];
    type: string;
    departmentType: DepartmentType;
    staff: StaffMember[];
}

export interface SyncChange {
    added: number;
    updated: number;
    deleted: number;
    unchanged: number;
}

export interface SyncHistoryEntry {
    timestamp: string;
    duration: string;
    changes: SyncChange;
    totalStaff: number;
    status: 'success' | 'failed' | 'partial';
    facultiesProcessed: string[];
    researchCentresProcessed: string[];
    topLevelDepartmentsProcessed: string[];
    unknownPrefixes?: string[]; // Track unknown searchId prefixes
}

export interface StaffDirectoryMetadata extends StaffCounts {
    facultiesCount: number;
    departmentsCount: number;
    researchCentresCount: number;
    topLevelDepartmentsCount: number;
}

export interface StaffDirectory {
    version: string;
    lastUpdated: string;
    syncDuration: string;
    metadata: StaffDirectoryMetadata;
    faculties: Record<string, Faculty>;
    researchCentres: Record<string, ResearchCentre>;
    topLevelDepartments: Record<string, TopLevelDepartment>;
    syncHistory: SyncHistoryEntry[];
    employmentTypeMapping: {
        description: string;
        patterns: Record<string, string>;
    };
    legacyMetadata?: {
        snapshotYear: number;
        snapshotDate: string;
        snapshotTimestamp: string;
        purpose: string;
        totalStaffAtSnapshot: number;
        uniqueStaffAtSnapshot: number;
        facultiesAtSnapshot: string[];
        departmentsAtSnapshot: number;
        note: string;
    };
}

// Utility: Detect employment type from searchId
export function detectEmploymentType(searchId: string): { type: EmploymentType; label: string } {
    if (!searchId) return { type: 'unknown', label: 'Unknown' };

    const id = searchId.toUpperCase();

    // Adjunct: AP prefix
    if (id.startsWith('AP')) {
        return { type: 'adjunct', label: 'Adjunct' };
    }

    // Part-time: J prefix
    if (id.startsWith('J')) {
        return { type: 'part-time', label: 'Part-Time' };
    }

    // Emeritus: EP or EM prefix (check before E to avoid misclassification)
    if (id.startsWith('EP') || id.startsWith('EM')) {
        return { type: 'emeritus', label: 'Emeritus Professor' };
    }

    // Expatriate: E prefix (but not EP or EM, already handled above)
    if (id.startsWith('E')) {
        return { type: 'expatriate', label: 'Expatriate (Contract)' };
    }

    // Full-time: Numeric only
    if (/^\d+$/.test(id)) {
        return { type: 'full-time', label: 'Full-Time' };
    }

    // Unknown pattern
    return { type: 'unknown', label: 'Unknown' };
}

// Utility: Parse searchId to extract joining year and sequence
export function parseSearchId(searchId: string): { year: number; seq: number; sortKey: number } {
    if (!searchId) return { year: 0, seq: 0, sortKey: 0 };

    const id = searchId.toUpperCase();

    // J prefix: J + YY + NNN (e.g., J2105 = 2021, seq 5)
    if (id.startsWith('J')) {
        const year = 2000 + parseInt(id.substring(1, 3));
        const seq = parseInt(id.substring(3));
        return { year, seq, sortKey: year * 10000 + seq };
    }

    // AP prefix: AP + YY + NN (e.g., AP2201 = 2022, seq 1)
    if (id.startsWith('AP')) {
        const year = 2000 + parseInt(id.substring(2, 4));
        const seq = parseInt(id.substring(4));
        return { year, seq, sortKey: year * 10000 + seq };
    }

    // EP prefix: EP + YY + NN (e.g., EP1801 = 2018, seq 1)
    if (id.startsWith('EP')) {
        const year = 2000 + parseInt(id.substring(2, 4));
        const seq = parseInt(id.substring(4));
        return { year, seq, sortKey: year * 10000 + seq };
    }

    // E prefix (not EM): E + YY + NN
    if (id.startsWith('E') && !id.startsWith('EM')) {
        const year = 2000 + parseInt(id.substring(1, 3));
        const seq = parseInt(id.substring(3));
        return { year, seq, sortKey: year * 10000 + seq };
    }

    // EM prefix: EM + YY + NN (e.g., EM1501 = 2015, seq 1)
    if (id.startsWith('EM')) {
        const year = 2000 + parseInt(id.substring(2, 4));
        const seq = parseInt(id.substring(4));
        return { year, seq, sortKey: year * 10000 + seq };
    }

    // Numeric only (full-time): YYNNN (e.g., 16072 = 2016, seq 72)
    if (/^\d+$/.test(id)) {
        const year = 2000 + parseInt(id.substring(0, 2));
        const seq = parseInt(id.substring(2));
        return { year, seq, sortKey: year * 10000 + seq };
    }

    // Unknown pattern
    return { year: 0, seq: 0, sortKey: 0 };
}

// Utility: Extract unknown prefix from searchId
export function extractPrefix(searchId: string): string {
    if (!searchId) return '';
    const match = searchId.match(/^([A-Z]+)/);
    return match ? match[1] : '';
}
