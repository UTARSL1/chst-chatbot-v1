import fs from 'fs';
import path from 'path';

interface StaffMember {
    searchId: string;
    name: string;
    designation?: string;
    staffType: string;
    [key: string]: any;
}

interface Department {
    canonical: string;
    acronym: string;
    staff: StaffMember[];
    staffCount: number;
    [key: string]: any;
}

interface Faculty {
    canonical: string;
    acronym: string;
    departments: Record<string, Department>;
    staffCount: number;
    [key: string]: any;
}

interface StaffDirectory {
    version: string;
    lastUpdated: string;
    metadata: any;
    faculties: Record<string, Faculty>;
}

// Designation categories
const DESIGNATIONS = [
    'Senior Professor',
    'Professor',
    'Emeritus Professor',
    'Associate Professor',
    'Assistant Professor',
    'Adjunct Professor',
    'Lecturer',
    'Senior Lecturer',
    'Other'
];

function calculateDesignationCounts(staff: StaffMember[]) {
    const counts: Record<string, number> = {};
    const lists: Record<string, Array<{ name: string; email: string; department?: string; departmentAcronym?: string }>> = {};

    // Initialize
    DESIGNATIONS.forEach(designation => {
        counts[designation] = 0;
        lists[designation] = [];
    });

    // Count and collect
    staff.forEach(member => {
        const designation = member.designation || 'Other';
        const key = DESIGNATIONS.includes(designation) ? designation : 'Other';

        counts[key]++;
        lists[key].push({
            name: member.name,
            email: member.email || '',
            department: member.department || '',
            departmentAcronym: member.departmentAcronym || ''
        });
    });

    // Remove empty categories
    Object.keys(counts).forEach(key => {
        if (counts[key] === 0) {
            delete counts[key];
            delete lists[key];
        }
    });

    return { counts, lists };
}

function addDesignationStats() {
    const staffDirPath = path.join(__dirname, 'staff_directory.json');

    console.log('Loading staff directory...');
    const directory: StaffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    let totalUpdates = 0;

    // Process each faculty
    for (const [facultyKey, faculty] of Object.entries(directory.faculties)) {
        console.log(`\nProcessing ${faculty.canonical}...`);

        // Calculate faculty-level designation stats
        const allFacultyStaff: StaffMember[] = [];
        for (const dept of Object.values(faculty.departments)) {
            allFacultyStaff.push(...dept.staff);
        }

        const facultyStats = calculateDesignationCounts(allFacultyStaff);
        faculty.designationCounts = facultyStats.counts;
        faculty.designationLists = facultyStats.lists;

        console.log(`  Faculty totals:`, facultyStats.counts);

        // Process each department
        for (const [deptKey, dept] of Object.entries(faculty.departments)) {
            const deptStats = calculateDesignationCounts(dept.staff);
            dept.designationCounts = deptStats.counts;
            dept.designationLists = deptStats.lists;

            if (Object.keys(deptStats.counts).length > 0) {
                console.log(`    ${dept.acronym}:`, deptStats.counts);
                totalUpdates++;
            }
        }
    }

    // Update metadata
    directory.metadata.lastDesignationUpdate = new Date().toISOString();

    // Save updated directory
    console.log(`\nSaving updated directory with designation stats...`);
    fs.writeFileSync(staffDirPath, JSON.stringify(directory, null, 2), 'utf-8');

    console.log(`✓ Successfully added designation statistics to ${totalUpdates} departments`);

    // Print summary for LKC FES
    const lkcfes = directory.faculties['LKC FES'];
    if (lkcfes) {
        console.log('\n=== LKC FES Summary ===');
        console.log('Faculty-wide designation counts:');
        console.log(JSON.stringify(lkcfes.designationCounts, null, 2));

        console.log('\nProfessors and Senior Professors:');
        const professors = [
            ...(lkcfes.designationLists?.['Professor'] || []),
            ...(lkcfes.designationLists?.['Senior Professor'] || [])
        ];
        console.log(`Total: ${professors.length}`);
        professors.forEach(p => console.log(`  - ${p.name} (${p.email})`));
    }
}

// Run the script
addDesignationStats();
