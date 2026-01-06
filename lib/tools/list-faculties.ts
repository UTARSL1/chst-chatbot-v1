import fs from 'fs';
import path from 'path';

const dir2026 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib/tools/staff_directory.json'), 'utf-8'));

console.log('Faculties in staff_directory.json:');
console.log('');

Object.keys(dir2026.faculties).forEach((key, index) => {
    const fac = (dir2026.faculties as any)[key];
    console.log(`${index + 1}. ${key} - ${fac.canonical}`);
    console.log(`   Staff: ${fac.staffCount}`);
    console.log('');
});

console.log(`Total faculties: ${Object.keys(dir2026.faculties).length}`);
