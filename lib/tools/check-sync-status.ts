import fs from 'fs';
import path from 'path';

const dir2026 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib/tools/staff_directory.json'), 'utf-8'));
const dir2025 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib/tools/staff_directory_legacy_2025.json'), 'utf-8'));

console.log('='.repeat(80));
console.log('📊 STAFF DIRECTORY SYNC STATUS');
console.log('='.repeat(80));
console.log('');

console.log('📅 2026 DATA (Current)');
console.log('-'.repeat(80));
console.log(`Last Updated: ${dir2026.lastUpdated}`);
console.log(`Sync Duration: ${dir2026.syncDuration}`);
console.log(`Total Staff: ${dir2026.metadata.staffCount}`);
console.log(`Unique Staff: ${dir2026.metadata.uniqueStaffCount}`);
console.log(`Faculties: ${dir2026.metadata.facultiesCount}`);
console.log('');

console.log('Staff by Faculty (2026):');
Object.entries(dir2026.faculties).forEach(([key, fac]: [string, any]) => {
    console.log(`  ${key.padEnd(10)} : ${String(fac.staffCount).padStart(4)} staff`);
});
console.log('');

console.log('📅 2025 DATA (Legacy)');
console.log('-'.repeat(80));
console.log(`Last Updated: ${dir2025.lastUpdated}`);
console.log(`Total Staff: ${dir2025.metadata.staffCount}`);
console.log(`Unique Staff: ${dir2025.metadata.uniqueStaffCount}`);
console.log(`Faculties: ${dir2025.metadata.facultiesCount}`);
console.log('');

console.log('Staff by Faculty (2025):');
Object.entries(dir2025.faculties).forEach(([key, fac]: [string, any]) => {
    console.log(`  ${key.padEnd(10)} : ${String(fac.staffCount).padStart(4)} staff`);
});
console.log('');

console.log('📈 COMPARISON');
console.log('-'.repeat(80));
console.log(`Total Staff Change: ${dir2026.metadata.staffCount - dir2025.metadata.staffCount} (${dir2025.metadata.staffCount} → ${dir2026.metadata.staffCount})`);
console.log(`Unique Staff Change: ${dir2026.metadata.uniqueStaffCount - dir2025.metadata.uniqueStaffCount} (${dir2025.metadata.uniqueStaffCount} → ${dir2026.metadata.uniqueStaffCount})`);
console.log('');

console.log('Changes by Faculty:');
Object.keys(dir2026.faculties).forEach(key => {
    const count2026 = (dir2026.faculties as any)[key].staffCount;
    const count2025 = (dir2025.faculties as any)[key]?.staffCount || 0;
    const change = count2026 - count2025;
    if (change !== 0) {
        console.log(`  ${key.padEnd(10)} : ${change > 0 ? '+' : ''}${change} (${count2025} → ${count2026})`);
    }
});
console.log('');
console.log('='.repeat(80));
