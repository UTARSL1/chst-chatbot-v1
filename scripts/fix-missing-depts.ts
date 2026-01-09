/**
 * Fix Missing Departments for 7 Staff Without Emails
 * Looks up their departments from staff_directory.json
 */

import fs from 'fs';
import path from 'path';

function fixMissingDepartments(): void {
    console.log('Fixing missing departments for staff without emails...');
    console.log();

    // Load staff directory
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    // Create name-to-department mapping
    const nameToDept = new Map<string, string>();
    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (lkcfes) {
        const departments = lkcfes.departments || {};
        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            if (deptKey === 'FGO' || deptKey === 'DLMSA') continue;

            const staff = deptData.staff || [];
            for (const member of staff) {
                nameToDept.set(member.name, member.departmentAcronym || deptKey);
            }
        }
    }

    // The 7 staff without emails
    const staffToFix = [
        'Prof. Dr Thomas Chung-Kuang Yang',
        'Prof. Dr Baochun Chen',
        'Prof. Dr Bala Venkatesh',
        'Ts Liew Choon Lian',
        'Prof. Dr Loo Kok Keong',
        'Ar. IDr. David Yek Tak Wai',
        'Prof. Dr Tan Choon Sooi',
    ];

    console.log('Looking up departments:');
    staffToFix.forEach(name => {
        const dept = nameToDept.get(name) || 'NOT FOUND';
        console.log(`  ${name}: ${dept}`);
    });
    console.log();

    // Read CSV
    let csvContent = fs.readFileSync('lkcfes-234-staff-final.csv', 'utf-8');
    const lines = csvContent.split('\n');

    // Fix each staff member
    const newLines = lines.map(line => {
        if (!line.trim() || line.startsWith('Name,')) return line;

        // Check if this line is one of the 7 staff
        for (const name of staffToFix) {
            if (line.startsWith(name)) {
                const dept = nameToDept.get(name);
                if (dept) {
                    // Replace the last ",NA" with the actual department
                    const updatedLine = line.replace(/,NA$/, `,${dept}`);
                    console.log(`✅ Updated: ${name} -> ${dept}`);
                    return updatedLine;
                }
            }
        }

        return line;
    });

    // Save updated CSV
    fs.writeFileSync('lkcfes-234-staff-final.csv', newLines.join('\n'), 'utf-8');

    console.log();
    console.log('✅ Missing departments fixed!');
}

if (require.main === module) {
    fixMissingDepartments();
}

export { fixMissingDepartments };
