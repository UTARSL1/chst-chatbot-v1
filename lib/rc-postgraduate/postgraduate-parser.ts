/**
 * Parser for RC Postgraduate Supervision CSV files
 * Each CSV contains supervision data for ONE member
 */

interface PostgraduateSupervision {
    staffId: string;
    staffName: string;
    faculty: string;
    staffCategory: string;
    status: string; // IN PROGRESS, COMPLETED
    areaOfStudy: string;
    researchCentre: string;
    studentName: string;
    level: string; // PHD, MASTER
    institution: string;
    programTitle: string;
    startDate: string;
    completedDate: string;
    startYear: number | null;
    completedYear: number | null;
    role: string; // MAIN SUPERVISOR, CO-SUPERVISOR
}

interface ParsedPostgraduateData {
    staffName: string;
    staffId: string;
    faculty: string;
    totalStudents: number;
    inProgressCount: number;
    completedCount: number;
    phdCount: number;
    masterCount: number;
    mainSupervisorCount: number;
    coSupervisorCount: number;
    supervisions: PostgraduateSupervision[];
}

/**
 * Extract year from date string (e.g., "Jul-17" -> 2017, "Oct-18" -> 2018)
 */
function extractYear(dateStr: string | null | undefined): number | null {
    if (!dateStr || dateStr.trim() === '') return null;

    // Handle formats like "Jul-17", "Oct-18", "2017-07", etc.
    const match = dateStr.match(/(\d{2,4})$/);
    if (match) {
        let year = parseInt(match[1]);
        // If 2-digit year, assume 20xx
        if (year < 100) {
            year += 2000;
        }
        return year;
    }
    return null;
}

/**
 * Parse CSV content for postgraduate supervision data
 */
/**
 * Parse CSV content for postgraduate supervision data
 * Supports multiple members in a single CSV file
 */
export async function parsePostgraduateCSV(csvContent: string): Promise<ParsedPostgraduateData[]> {
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
        throw new Error('CSV file is empty or invalid');
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // Expected columns
    const requiredColumns = [
        'Staff ID', 'Staff Name', 'Faculty', 'Supervision Status',
        'Name of Student', 'Level', 'Role'
    ];

    // Check required columns exist
    const missingColumns = requiredColumns.filter(col =>
        !header.some(h => h.toLowerCase().includes(col.toLowerCase()))
    );

    if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const membersMap = new Map<string, {
        staffName: string;
        staffId: string;
        faculty: string;
        supervisions: PostgraduateSupervision[];
    }>();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Split by comma, but respect quotes
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));

        // Extract values by column name
        const getValueByColumn = (columnName: string): string => {
            const index = header.findIndex(h =>
                h.toLowerCase().includes(columnName.toLowerCase())
            );
            return index >= 0 ? (values[index] || '').trim() : '';
        };

        const staffName = getValueByColumn('Staff Name');
        const staffId = getValueByColumn('Staff ID');
        const faculty = getValueByColumn('Faculty');

        if (!staffId && !staffName) continue;

        // Use Staff ID as key, fallback to Name
        const key = staffId || staffName;

        if (!membersMap.has(key)) {
            membersMap.set(key, {
                staffName,
                staffId,
                faculty,
                supervisions: []
            });
        }

        const memberData = membersMap.get(key)!;

        // Update faculty if missing in previous row (take last non-empty)
        if (!memberData.faculty && faculty) memberData.faculty = faculty;

        const startDateStr = getValueByColumn('Start Date');
        const completedDateStr = getValueByColumn('Completed Date');

        memberData.supervisions.push({
            staffId: staffId,
            staffName: staffName,
            faculty: faculty,
            staffCategory: getValueByColumn('Staff Category'),
            status: getValueByColumn('Supervision Status').toUpperCase(),
            areaOfStudy: getValueByColumn('Area of Study'),
            researchCentre: getValueByColumn('Research Centre'),
            studentName: getValueByColumn('Name of Student'),
            level: getValueByColumn('Level').toUpperCase(),
            institution: getValueByColumn('Institution'),
            programTitle: getValueByColumn('Program Title'),
            startDate: startDateStr,
            completedDate: completedDateStr,
            startYear: extractYear(startDateStr),
            completedYear: extractYear(completedDateStr),
            role: getValueByColumn('Role').toUpperCase(),
        });
    }

    if (membersMap.size === 0) {
        throw new Error('No valid staff members found in CSV. Please ensure Staff ID and Staff Name columns are present.');
    }

    // Process each member to calculate stats
    const results: ParsedPostgraduateData[] = [];

    for (const data of membersMap.values()) {
        const supervisions = data.supervisions;

        results.push({
            staffName: data.staffName,
            staffId: data.staffId,
            faculty: data.faculty,
            totalStudents: supervisions.length,
            inProgressCount: supervisions.filter(s => s.status === 'IN PROGRESS').length,
            completedCount: supervisions.filter(s => s.status === 'COMPLETED').length,
            phdCount: supervisions.filter(s => s.level === 'PHD').length,
            masterCount: supervisions.filter(s => s.level === 'MASTER').length,
            mainSupervisorCount: supervisions.filter(s => s.role.includes('MAIN')).length,
            coSupervisorCount: supervisions.filter(s => s.role.includes('CO')).length,
            supervisions: supervisions,
        });
    }

    return results;
}
