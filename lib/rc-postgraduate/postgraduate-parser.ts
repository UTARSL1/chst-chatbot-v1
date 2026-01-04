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
export async function parsePostgraduateCSV(csvContent: string): Promise<ParsedPostgraduateData> {
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

    // Parse data rows
    const supervisions: PostgraduateSupervision[] = [];
    let staffName = '';
    let staffId = '';
    let faculty = '';

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

        const currentStaffName = getValueByColumn('Staff Name');
        const currentStaffId = getValueByColumn('Staff ID');
        const currentFaculty = getValueByColumn('Faculty');

        // Set staff info from first row
        if (i === 1) {
            staffName = currentStaffName;
            staffId = currentStaffId;
            faculty = currentFaculty;
        }

        // Verify all rows have the same staff member
        if (currentStaffName !== staffName) {
            throw new Error(
                `CSV contains multiple staff members. Expected "${staffName}" but found "${currentStaffName}" on line ${i + 1}. ` +
                `Each CSV file should contain data for ONE member only.`
            );
        }

        const startDateStr = getValueByColumn('Start Date');
        const completedDateStr = getValueByColumn('Completed Date');

        supervisions.push({
            staffId: currentStaffId,
            staffName: currentStaffName,
            faculty: currentFaculty,
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

    if (supervisions.length === 0) {
        throw new Error('No valid supervision records found in CSV');
    }

    // Calculate aggregates
    const totalStudents = supervisions.length;
    const inProgressCount = supervisions.filter(s => s.status === 'IN PROGRESS').length;
    const completedCount = supervisions.filter(s => s.status === 'COMPLETED').length;
    const phdCount = supervisions.filter(s => s.level === 'PHD').length;
    const masterCount = supervisions.filter(s => s.level === 'MASTER').length;
    const mainSupervisorCount = supervisions.filter(s => s.role.includes('MAIN')).length;
    const coSupervisorCount = supervisions.filter(s => s.role.includes('CO')).length;

    return {
        staffName,
        staffId,
        faculty,
        totalStudents,
        inProgressCount,
        completedCount,
        phdCount,
        masterCount,
        mainSupervisorCount,
        coSupervisorCount,
        supervisions,
    };
}
