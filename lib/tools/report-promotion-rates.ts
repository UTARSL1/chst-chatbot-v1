/**
 * 2026 Promotions Rate Analysis
 * 
 * Calculates promotion rate (promotions / total staff) for each faculty
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
    'FCS': 'Faculty of Chinese Studies',
    'THP FBF': 'Teh Hong Piow Faculty of Business and Finance',
    'FAS': 'Faculty of Arts and Social Science',
    'FAM': 'Faculty of Accountancy and Management',
    'FCI': 'Faculty of Creative Industries',
    'MK FMHS': 'M. Kandiah Faculty of Medicine and Health Sciences'
};

function loadDirectory(filePath: string): StaffDirectory {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as StaffDirectory;
}

async function main() {
    console.log('='.repeat(120));
    console.log('📊 UTAR PROMOTIONS RATE ANALYSIS 2026');
    console.log('='.repeat(120));
    console.log('');

    const dir2025 = loadDirectory(LEGACY_2025_PATH);
    const dir2026 = loadDirectory(CURRENT_2026_PATH);

    const fullComparison = compareStaffDirectories(dir2025, dir2026);

    // Get all promotions
    const allPromotions = fullComparison.positionChanges.filter(c => c.changeType === 'promotion');

    // Group promotions by faculty
    const promotionsByFaculty: Record<string, typeof allPromotions> = {};
    allPromotions.forEach(promo => {
        if (!promotionsByFaculty[promo.faculty]) {
            promotionsByFaculty[promo.faculty] = [];
        }
        promotionsByFaculty[promo.faculty].push(promo);
    });

    // Calculate rates
    interface FacultyStats {
        code: string;
        name: string;
        totalStaff: number;
        promotions: number;
        rate: number;
        percentage: string;
    }

    const facultyStats: FacultyStats[] = [];

    Object.keys(FACULTY_NAMES).forEach(facultyCode => {
        const totalStaff = (dir2026.faculties as any)[facultyCode]?.staffCount || 0;
        const promotions = promotionsByFaculty[facultyCode]?.length || 0;
        const rate = totalStaff > 0 ? promotions / totalStaff : 0;
        const percentage = (rate * 100).toFixed(2);

        facultyStats.push({
            code: facultyCode,
            name: FACULTY_NAMES[facultyCode],
            totalStaff,
            promotions,
            rate,
            percentage: percentage + '%'
        });
    });

    // Sort by rate (descending)
    const sortedByRate = [...facultyStats].sort((a, b) => b.rate - a.rate);

    console.log('📈 PROMOTION RATE BY FACULTY (Sorted by Rate)');
    console.log('='.repeat(120));
    console.log('');
    console.log('┌──────┬─────────────────────────────────────────────────────────────────┬────────────┬────────────┬──────────┬──────────┐');
    console.log('│ Rank │ Faculty                                                         │ Total Staff│ Promotions │   Rate   │    %     │');
    console.log('├──────┼─────────────────────────────────────────────────────────────────┼────────────┼────────────┼──────────┼──────────┤');

    sortedByRate.forEach((stat, index) => {
        const rank = String(index + 1).padStart(4);
        const faculty = `${stat.code} - ${stat.name}`.padEnd(67);
        const totalStaff = String(stat.totalStaff).padStart(10);
        const promotions = String(stat.promotions).padStart(10);
        const rate = stat.rate.toFixed(4).padStart(8);
        const percentage = stat.percentage.padStart(8);

        console.log(`│ ${rank} │ ${faculty} │ ${totalStaff} │ ${promotions} │ ${rate} │ ${percentage} │`);
    });

    console.log('└──────┴─────────────────────────────────────────────────────────────────┴────────────┴────────────┴──────────┴──────────┘');
    console.log('');

    // Overall statistics
    const totalStaff = dir2026.metadata.staffCount;
    const totalPromotions = allPromotions.length;
    const overallRate = totalPromotions / totalStaff;
    const overallPercentage = (overallRate * 100).toFixed(2);

    console.log('📊 OVERALL STATISTICS');
    console.log('='.repeat(120));
    console.log(`Total Staff (All Faculties): ${totalStaff}`);
    console.log(`Total Promotions: ${totalPromotions}`);
    console.log(`Overall Promotion Rate: ${overallRate.toFixed(4)} (${overallPercentage}%)`);
    console.log('');

    // Insights
    console.log('💡 KEY INSIGHTS');
    console.log('='.repeat(120));
    console.log('');

    const highest = sortedByRate[0];
    const lowest = sortedByRate.filter(s => s.totalStaff > 0 && s.promotions > 0).slice(-1)[0];
    const noPromotions = sortedByRate.filter(s => s.promotions === 0);

    console.log(`🏆 Highest Promotion Rate: ${highest.code} (${highest.percentage})`);
    console.log(`   ${highest.promotions} promotions out of ${highest.totalStaff} staff`);
    console.log('');

    if (lowest) {
        console.log(`📉 Lowest Promotion Rate (with promotions): ${lowest.code} (${lowest.percentage})`);
        console.log(`   ${lowest.promotions} promotion(s) out of ${lowest.totalStaff} staff`);
        console.log('');
    }

    if (noPromotions.length > 0) {
        console.log(`⚪ Faculties with No Promotions: ${noPromotions.length}`);
        noPromotions.forEach(stat => {
            console.log(`   • ${stat.code} (${stat.totalStaff} staff)`);
        });
        console.log('');
    }

    // Above/Below average
    const aboveAverage = sortedByRate.filter(s => s.rate > overallRate && s.promotions > 0);
    const belowAverage = sortedByRate.filter(s => s.rate < overallRate && s.rate > 0);

    console.log(`📈 Above Average Promotion Rate (>${overallPercentage}%): ${aboveAverage.length} faculties`);
    aboveAverage.forEach(stat => {
        console.log(`   • ${stat.code}: ${stat.percentage}`);
    });
    console.log('');

    console.log(`📉 Below Average Promotion Rate (<${overallPercentage}%): ${belowAverage.length} faculties`);
    belowAverage.forEach(stat => {
        console.log(`   • ${stat.code}: ${stat.percentage}`);
    });
    console.log('');

    // Size analysis
    console.log('📏 PROMOTION RATE BY FACULTY SIZE');
    console.log('='.repeat(120));
    console.log('');

    const large = facultyStats.filter(s => s.totalStaff >= 150);
    const medium = facultyStats.filter(s => s.totalStaff >= 50 && s.totalStaff < 150);
    const small = facultyStats.filter(s => s.totalStaff < 50);

    const avgLarge = large.length > 0 ? (large.reduce((sum, s) => sum + s.rate, 0) / large.length * 100).toFixed(2) : '0.00';
    const avgMedium = medium.length > 0 ? (medium.reduce((sum, s) => sum + s.rate, 0) / medium.length * 100).toFixed(2) : '0.00';
    const avgSmall = small.length > 0 ? (small.reduce((sum, s) => sum + s.rate, 0) / small.length * 100).toFixed(2) : '0.00';

    console.log(`Large Faculties (≥150 staff): ${large.length} faculties, Avg Rate: ${avgLarge}%`);
    large.forEach(s => console.log(`   • ${s.code}: ${s.totalStaff} staff, ${s.percentage}`));
    console.log('');

    console.log(`Medium Faculties (50-149 staff): ${medium.length} faculties, Avg Rate: ${avgMedium}%`);
    medium.forEach(s => console.log(`   • ${s.code}: ${s.totalStaff} staff, ${s.percentage}`));
    console.log('');

    console.log(`Small Faculties (<50 staff): ${small.length} faculties, Avg Rate: ${avgSmall}%`);
    small.forEach(s => console.log(`   • ${s.code}: ${s.totalStaff} staff, ${s.percentage}`));
    console.log('');

    console.log('='.repeat(120));
    console.log('✅ Analysis Complete');
    console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}`);
    console.log('='.repeat(120));
    console.log('');
}

main().catch(console.error);
