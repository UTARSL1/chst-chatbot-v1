/**
 * Find added staff in LKC FES - Simple version
 */

import fs from 'fs';
import path from 'path';

const STAFF_2026_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
const STAFF_2025_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory_legacy_2025.json');

const data2026 = JSON.parse(fs.readFileSync(STAFF_2026_PATH, 'utf-8'));
const data2025 = JSON.parse(fs.readFileSync(STAFF_2025_PATH, 'utf-8'));

const lkcfes2026 = data2026.faculties['LKC FES'];
const lkcfes2025 = data2025.faculties['LKC FES'];

console.log(`2025: ${lkcfes2025.staffCount} staff`);
console.log(`2026: ${lkcfes2026.staffCount} staff`);
console.log(`Change: +${lkcfes2026.staffCount - lkcfes2025.staffCount}`);
console.log('');

// Collect staff IDs
const staff2025Set = new Set<string>();
const staff2026Map = new Map<string, any>();

for (const deptKey of Object.keys(lkcfes2025.departments || {})) {
    const dept = lkcfes2025.departments[deptKey];
    for (const staff of dept.staff || []) {
        staff2025Set.add(staff.searchId);
    }
}

for (const deptKey of Object.keys(lkcfes2026.departments || {})) {
    const dept = lkcfes2026.departments[deptKey];
    for (const staff of dept.staff || []) {
        staff2026Map.set(staff.searchId, {
            name: staff.name,
            designation: staff.designation,
            email: staff.email,
            department: dept.canonical,
            searchId: staff.searchId
        });
    }
}

const addedStaff: any[] = [];
for (const [searchId, staffData] of staff2026Map.entries()) {
    if (!staff2025Set.has(searchId)) {
        addedStaff.push(staffData);
    }
}

console.log(`NEW STAFF: ${addedStaff.length}`);
console.log('');

addedStaff.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (${s.designation})`);
    console.log(`   Dept: ${s.department}`);
    console.log(`   Email: ${s.email}`);
    console.log('');
});
