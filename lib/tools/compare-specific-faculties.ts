/**
 * Compare specific faculties: FSc, FEd, FCS, FCI
 * Between 2025 and 2026
 */

import fs from 'fs';
import path from 'path';
import { StaffDirectory } from './staff-directory-types';
import { compareStaffDirectories } from './staff-comparison';

const LEGACY_2025_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory_legacy_2025.json');
const CURRENT_2026_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');

const FACULTIES_TO_CHECK = ['FSc', 'FEd', 'FCS', 'FCI'];
const FACULTY_NAMES: Record<string, string> = {
    'FSc': 'Faculty of Science',
    'FEd': 'Faculty of Education',
    'FCS': 'Faculty of Creative Industries',
    'FCI': 'Faculty of Chinese Studies'
};

function loadDirectory(filePath: string): StaffDirectory {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as StaffDirectory;
}

async function main() {
    console.log('='.repeat(80));
    console.log('📊 FACULTY COMPARISON: 2025 vs 2026');
    console.log('='.repeat(80));
    console.log('');

    const dir2025 = loadDirectory(LEGACY_2025_PATH);
    const dir2026 = loadDirectory(CURRENT_2026_PATH);

    const fullComparison = compareStaffDirectories(dir2025, dir2026);

    for (const facultyCode of FACULTIES_TO_CHECK) {
        const facultyName = FACULTY_NAMES[facultyCode];

        console.log('');
        console.log('='.repeat(80));
        console.log(`🎓 ${facultyName} (${facultyCode})`);
        console.log('='.repeat(80));

        const count2025 = (dir2025.faculties as any)[facultyCode]?.staffCount || 0;
        const count2026 = (dir2026.faculties as any)[facultyCode]?.staffCount || 0;

        console.log(`Staff Count: ${count2025} (2025) → ${count2026} (2026)`);
        console.log('');

        // Filter changes for this faculty
        const adminChanges = fullComparison.adminPostChanges.filter(c => c.faculty === facultyCode);
        const positionChanges = fullComparison.positionChanges.filter(c => c.faculty === facultyCode);
        const newHires = fullComparison.newHires.filter(s => s.facultyAcronym === facultyCode);
        const departures = fullComparison.departures.filter(s => s.facultyAcronym === facultyCode);

        // Administrative Changes
        if (adminChanges.length > 0) {
            console.log('🏛️  ADMINISTRATIVE POSITION CHANGES:');
            console.log('-'.repeat(80));
            adminChanges.forEach((change, index) => {
                console.log(`${index + 1}. ${change.name} (${change.department})`);
                if (change.added.length > 0) {
                    console.log(`   ➕ Added: ${change.added.join(', ')}`);
                }
                if (change.removed.length > 0) {
                    console.log(`   ➖ Removed: ${change.removed.join(', ')}`);
                }
                console.log('');
            });
        } else {
            console.log('🏛️  Administrative Position Changes: None');
            console.log('');
        }

        // Designation Changes
        if (positionChanges.length > 0) {
            console.log('📊 DESIGNATION CHANGES:');
            console.log('-'.repeat(80));

            const promotions = positionChanges.filter(c => c.changeType === 'promotion');
            const demotions = positionChanges.filter(c => c.changeType === 'demotion');
            const lateral = positionChanges.filter(c => c.changeType === 'lateral');

            if (promotions.length > 0) {
                console.log('⬆️  Promotions:');
                promotions.forEach(c => {
                    console.log(`   • ${c.name} (${c.department}): ${c.oldDesignation} → ${c.newDesignation}`);
                });
                console.log('');
            }

            if (demotions.length > 0) {
                console.log('⬇️  Demotions:');
                demotions.forEach(c => {
                    console.log(`   • ${c.name} (${c.department}): ${c.oldDesignation} → ${c.newDesignation}`);
                });
                console.log('');
            }

            if (lateral.length > 0) {
                console.log('↔️  Lateral Moves:');
                lateral.forEach(c => {
                    console.log(`   • ${c.name} (${c.department}): ${c.oldDesignation} → ${c.newDesignation}`);
                });
                console.log('');
            }
        } else {
            console.log('📊 Designation Changes: None');
            console.log('');
        }

        // New Hires
        if (newHires.length > 0) {
            console.log('👋 NEW HIRES:');
            console.log('-'.repeat(80));
            newHires.forEach(s => {
                console.log(`   • ${s.name} - ${s.designation} (${s.departmentAcronym})`);
            });
            console.log('');
        }

        // Departures
        if (departures.length > 0) {
            console.log('👋 DEPARTURES:');
            console.log('-'.repeat(80));
            departures.forEach(s => {
                console.log(`   • ${s.name} - ${s.designation} (${s.departmentAcronym})`);
            });
            console.log('');
        }

        // Summary
        if (adminChanges.length === 0 && positionChanges.length === 0 &&
            newHires.length === 0 && departures.length === 0) {
            console.log('✅ No changes detected for this faculty');
            console.log('');
        }
    }

    console.log('='.repeat(80));
    console.log('');
}

main().catch(console.error);
