import fs from 'fs';
import path from 'path';

const dir = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib/tools/staff_directory.json'), 'utf-8'));

console.log('Checking FCS in staff_directory.json:');
console.log('');

const fcs = (dir.faculties as any).FCS;

if (fcs) {
    console.log(`Faculty: ${fcs.canonical}`);
    console.log(`Acronym: ${fcs.acronym}`);
    console.log(`Staff Count: ${fcs.staffCount}`);
    console.log('');
    console.log('Departments:');
    if (fcs.departments) {
        Object.entries(fcs.departments).forEach(([code, dept]: [string, any]) => {
            console.log(`  ${code}: ${dept.canonical} (${dept.staffCount} staff)`);
            console.log(`    Department ID: ${dept.departmentId}`);
        });
    }
    console.log('');
    console.log('All staff members:');
    if (fcs.departments) {
        Object.values(fcs.departments).forEach((dept: any) => {
            if (dept.staff) {
                dept.staff.forEach((s: any, i: number) => {
                    console.log(`  ${i + 1}. ${s.name} (${s.designation}) - ${dept.acronym}`);
                });
            }
        });
    }
} else {
    console.log('FCS not found in staff directory!');
}
