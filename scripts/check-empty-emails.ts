import fs from 'fs';
import path from 'path';

const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

const lkcfes = staffDirectory.faculties?.['LKC FES'];

let totalCount = 0;
const staffWithoutEmail: any[] = [];

if (lkcfes) {
    const departments = lkcfes.departments || {};

    for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
        if (deptKey === 'FGO' || deptKey === 'DLMSA') continue;

        const staff = deptData.staff || [];

        for (const member of staff) {
            totalCount++;

            if (!member.email || member.email.trim() === '') {
                staffWithoutEmail.push({
                    name: member.name,
                    department: deptKey,
                    searchId: member.searchId,
                });
            }
        }
    }
}

console.log(`Total staff (excluding FGO & DLMSA): ${totalCount}`);
console.log(`Staff without email: ${staffWithoutEmail.length}`);
console.log();

if (staffWithoutEmail.length > 0) {
    console.log('Staff without email addresses:');
    staffWithoutEmail.forEach(s => {
        console.log(`  - ${s.name} (${s.department}) [ID: ${s.searchId}]`);
    });
}
