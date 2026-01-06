/**
 * Find added staff in LKC FES between 2025 and 2026
 */

import fs from 'fs';
import path from 'path';

const STAFF_2026_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
const STAFF_2025_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory_legacy_2025.json');

function main() {
    console.log('='.repeat(80));
    console.log('🔍 Finding Added Staff in LKC FES (2025 → 2026)');
    console.log('='.repeat(80));
    console.log('');

    // Load both datasets
    const data2026 = JSON.parse(fs.readFileSync(STAFF_2026_PATH, 'utf-8'));
    const data2025 = JSON.parse(fs.readFileSync(STAFF_2025_PATH, 'utf-8'));

    const lkcfes2026 = data2026.faculties['LKC FES'];
    const lkcfes2025 = data2025.faculties['LKC FES'];

    console.log(`2025 LKC FES Staff: ${lkcfes2025.staffCount}`);
    console.log(`2026 LKC FES Staff: ${lkcfes2026.staffCount}`);
    console.log(`Difference: +${lkcfes2026.staffCount - lkcfes2025.staffCount}`);
    console.log('');

    // Collect all staff from both years
    const staff2025Set = new Set<string>();
    const staff2026Map = new Map<string, any>();

    // Collect 2025 staff
    for (const deptKey of Object.keys(lkcfes2025.departments || {})) {
        const dept = lkcfes2025.departments[deptKey];
        for (const staff of dept.staff || []) {
            staff2025Set.add(staff.searchId);
        }
    }

    // Collect 2026 staff
    for (const deptKey of Object.keys(lkcfes2026.departments || {})) {
        const dept = lkcfes2026.departments[deptKey];
        for (const staff of dept.staff || []) {
            staff2026Map.set(staff.searchId, {
                ...staff,
                department: dept.canonical
            });
        }
    }

    // Find added staff (in 2026 but not in 2025)
    const addedStaff: any[] = [];
    for (const [searchId, staffData] of staff2026Map.entries()) {
        if (!staff2025Set.has(searchId)) {
            addedStaff.push(staffData);
        }
    }

    console.log('='.repeat(80));
    console.log(`✨ ADDED STAFF (${addedStaff.length} new members)`);
    console.log('='.repeat(80));
    console.log('');

    if (addedStaff.length === 0) {
        console.log('No new staff added.');
    } else {
        // Group by department
        const byDept = new Map<string, any[]>();
        for (const staff of addedStaff) {
            const dept = staff.department;
            if (!byDept.has(dept)) {
                byDept.set(dept, []);
            }
            byDept.get(dept)!.push(staff);
        }

        // Display by department
        for (const [dept, staffList] of byDept.entries()) {
            console.log(`📍 ${dept} (${staffList.length} new)`);
            console.log('-'.repeat(80));

            staffList.forEach((s, i) => {
                console.log(`${i + 1}. ${s.name}`);
                console.log(`   Designation: ${s.designation}`);
                console.log(`   Email: ${s.email}`);
                console.log(`   Search ID: ${s.searchId}`);
                if (s.administrativePosts && s.administrativePosts.length > 0) {
                    console.log(`   Admin Posts: ${s.administrativePosts.join('; ')}`);
                }
                console.log('');
            });
        }
    }

    console.log('='.repeat(80));
}

main();
