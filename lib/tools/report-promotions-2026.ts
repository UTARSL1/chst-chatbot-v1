/**
 * 2026 Promotions Report - All Faculties
 * 
 * Generates a comprehensive report of all staff promotions across all faculties
 * comparing 2025 vs 2026 data.
 */

import fs from 'fs';
import path from 'path';
import { StaffDirectory } from './staff-directory-types';
import { compareStaffDirectories } from './staff-comparison';

const LEGACY_2025_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory_legacy_2025.json');
const CURRENT_2026_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');

const FACULTY_NAMES: Record<string, string> = {
    'LKC FES': 'Lee Kong Chian Faculty of Engineering and Science',
    'FEGT': 'Faculty of Engineering and Green Technology',
    'FICT': 'Faculty of Information and Communication Technology',
    'FEd': 'Faculty of Education',
    'FSc': 'Faculty of Science',
    'FCS': 'Faculty of Creative Industries',
    'THP FBF': 'Teh Hong Piow Faculty of Business and Finance',
    'FAS': 'Faculty of Arts and Social Science',
    'FAM': 'Faculty of Accountancy and Management',
    'FCI': 'Faculty of Chinese Studies',
    'MK FMHS': 'M. Kandiah Faculty of Medicine and Health Sciences'
};

function loadDirectory(filePath: string): StaffDirectory {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as StaffDirectory;
}

async function main() {
    console.log('='.repeat(100));
    console.log('🎓 UTAR STAFF PROMOTIONS REPORT 2026');
    console.log('='.repeat(100));
    console.log('');

    const dir2025 = loadDirectory(LEGACY_2025_PATH);
    const dir2026 = loadDirectory(CURRENT_2026_PATH);

    const fullComparison = compareStaffDirectories(dir2025, dir2026);

    // Get all promotions
    const allPromotions = fullComparison.positionChanges.filter(c => c.changeType === 'promotion');

    console.log('📊 EXECUTIVE SUMMARY');
    console.log('-'.repeat(100));
    console.log(`Total Promotions Across All Faculties: ${allPromotions.length}`);
    console.log('');

    // Group promotions by faculty
    const promotionsByFaculty: Record<string, typeof allPromotions> = {};
    allPromotions.forEach(promo => {
        if (!promotionsByFaculty[promo.faculty]) {
            promotionsByFaculty[promo.faculty] = [];
        }
        promotionsByFaculty[promo.faculty].push(promo);
    });

    // Summary table
    console.log('Promotions by Faculty:');
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────────────────┬─────────────┐');
    console.log('│ Faculty                                                             │ Promotions  │');
    console.log('├─────────────────────────────────────────────────────────────────────┼─────────────┤');

    Object.keys(FACULTY_NAMES).forEach(facultyCode => {
        const count = promotionsByFaculty[facultyCode]?.length || 0;
        const facultyName = FACULTY_NAMES[facultyCode];
        const displayName = `${facultyCode} - ${facultyName}`;
        console.log(`│ ${displayName.padEnd(67)} │ ${String(count).padStart(11)} │`);
    });

    console.log('└─────────────────────────────────────────────────────────────────────┴─────────────┘');
    console.log('');

    // Detailed breakdown by promotion type
    const toAssocProf = allPromotions.filter(p => p.newDesignation === 'Associate Professor');
    const toProf = allPromotions.filter(p => p.newDesignation === 'Professor');
    const toSeniorProf = allPromotions.filter(p => p.newDesignation === 'Senior Professor');
    const otherPromotions = allPromotions.filter(p =>
        !['Associate Professor', 'Professor', 'Senior Professor'].includes(p.newDesignation)
    );

    console.log('📈 PROMOTIONS BY RANK');
    console.log('-'.repeat(100));
    console.log(`To Senior Professor: ${toSeniorProf.length}`);
    console.log(`To Professor: ${toProf.length}`);
    console.log(`To Associate Professor: ${toAssocProf.length}`);
    console.log(`Other Promotions: ${otherPromotions.length}`);
    console.log('');

    // Detailed faculty-by-faculty breakdown
    console.log('');
    console.log('='.repeat(100));
    console.log('📋 DETAILED PROMOTIONS BY FACULTY');
    console.log('='.repeat(100));

    Object.keys(FACULTY_NAMES).forEach(facultyCode => {
        const promotions = promotionsByFaculty[facultyCode];

        if (!promotions || promotions.length === 0) {
            console.log('');
            console.log(`🎓 ${facultyCode} - ${FACULTY_NAMES[facultyCode]}`);
            console.log('-'.repeat(100));
            console.log('   No promotions');
            return;
        }

        console.log('');
        console.log(`🎓 ${facultyCode} - ${FACULTY_NAMES[facultyCode]}`);
        console.log('-'.repeat(100));
        console.log(`Total Promotions: ${promotions.length}`);
        console.log('');

        // Group by new designation
        const byNewDesignation: Record<string, typeof promotions> = {};
        promotions.forEach(p => {
            if (!byNewDesignation[p.newDesignation]) {
                byNewDesignation[p.newDesignation] = [];
            }
            byNewDesignation[p.newDesignation].push(p);
        });

        // Display by rank (highest first)
        const rankOrder = ['Senior Professor', 'Professor', 'Associate Professor', 'Senior Lecturer', 'Lecturer'];

        rankOrder.forEach(rank => {
            const promos = byNewDesignation[rank];
            if (promos && promos.length > 0) {
                console.log(`⬆️  Promoted to ${rank}:`);
                promos.forEach((p, index) => {
                    console.log(`   ${index + 1}. ${p.name.padEnd(40)} (${p.department})`);
                    console.log(`      ${p.oldDesignation} → ${p.newDesignation}`);
                });
                console.log('');
            }
        });

        // Other ranks not in the standard order
        Object.keys(byNewDesignation).forEach(rank => {
            if (!rankOrder.includes(rank)) {
                const promos = byNewDesignation[rank];
                console.log(`⬆️  Promoted to ${rank}:`);
                promos.forEach((p, index) => {
                    console.log(`   ${index + 1}. ${p.name.padEnd(40)} (${p.department})`);
                    console.log(`      ${p.oldDesignation} → ${p.newDesignation}`);
                });
                console.log('');
            }
        });
    });

    console.log('');
    console.log('='.repeat(100));
    console.log('📊 STATISTICS');
    console.log('='.repeat(100));
    console.log('');

    // Department with most promotions
    const promotionsByDept: Record<string, number> = {};
    allPromotions.forEach(p => {
        const key = `${p.faculty} - ${p.department}`;
        promotionsByDept[key] = (promotionsByDept[key] || 0) + 1;
    });

    const topDepts = Object.entries(promotionsByDept)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    console.log('Top 5 Departments by Promotions:');
    topDepts.forEach(([dept, count], index) => {
        console.log(`   ${index + 1}. ${dept}: ${count} promotion${count > 1 ? 's' : ''}`);
    });
    console.log('');

    console.log('='.repeat(100));
    console.log('✅ Report Generated Successfully');
    console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}`);
    console.log('='.repeat(100));
    console.log('');
}

main().catch(console.error);
