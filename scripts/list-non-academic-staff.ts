/**
 * List Non-Academic Staff in LKC FES
 */

import fs from 'fs';
import path from 'path';

function listNonAcademicStaff(): void {
    console.log('='.repeat(80));
    console.log('NON-ACADEMIC STAFF IN LKC FES (Excluding FGO & DLMSA)');
    console.log('='.repeat(80));
    console.log();

    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (!lkcfes) {
        console.log('❌ LKC FES not found');
        return;
    }

    const departments = lkcfes.departments || {};
    const nonAcademicStaff: any[] = [];

    for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
        // Skip FGO and DLMSA
        if (deptKey === 'FGO' || deptKey === 'DLMSA') continue;

        const staff = deptData.staff || [];

        for (const member of staff) {
            const isAcademic = member.designation &&
                (member.designation.includes('Professor') ||
                    member.designation.includes('Lecturer') ||
                    member.designation.includes('Instructor'));

            if (!isAcademic) {
                nonAcademicStaff.push({
                    name: member.name,
                    email: member.email,
                    department: deptKey,
                    departmentName: deptData.departmentName || deptKey,
                    designation: member.designation || 'No designation',
                    scopusUrl: member.scopusUrl || '',
                });
            }
        }
    }

    console.log(`Total non-academic staff: ${nonAcademicStaff.length}`);
    console.log();

    nonAcademicStaff.forEach((staff, idx) => {
        console.log(`${idx + 1}. ${staff.name}`);
        console.log(`   Email: ${staff.email}`);
        console.log(`   Department: ${staff.departmentName} (${staff.department})`);
        console.log(`   Designation: ${staff.designation}`);
        console.log(`   Scopus URL: ${staff.scopusUrl || 'None'}`);
        console.log();
    });

    console.log('='.repeat(80));

    // Save to file
    fs.writeFileSync(
        'lkcfes-non-academic-staff.json',
        JSON.stringify({
            generatedAt: new Date().toISOString(),
            totalCount: nonAcademicStaff.length,
            staff: nonAcademicStaff,
        }, null, 2),
        'utf-8'
    );

    console.log('📄 Saved to: lkcfes-non-academic-staff.json');
}

if (require.main === module) {
    listNonAcademicStaff();
}

export { listNonAcademicStaff };
