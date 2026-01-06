/**
 * Compare 2025 vs 2026 Staff Directory
 * 
 * This script compares the legacy 2025 staff directory with the current 2026 data
 * to identify changes in administrative positions, designations, and staff counts.
 */

import fs from 'fs';
import path from 'path';
import { StaffDirectory, StaffMember } from './staff-directory-types';
import { compareStaffDirectories, ComparisonResult } from './staff-comparison';

const LEGACY_2025_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory_legacy_2025.json');
const CURRENT_2026_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');

interface FilteredComparison {
    faculty?: string;
    department?: string;
    showAdminChanges?: boolean;
    showDesignationChanges?: boolean;
    showNewHires?: boolean;
    showDepartures?: boolean;
}

function loadDirectory(filePath: string, year: number): StaffDirectory {
    const data = fs.readFileSync(filePath, 'utf-8');
    const directory = JSON.parse(data) as StaffDirectory;

    // Add year metadata if not present
    if (!directory.metadata) {
        directory.metadata = {} as any;
    }
    (directory.metadata as any).year = year;

    return directory;
}

function filterComparisonByFaculty(
    comparison: ComparisonResult,
    facultyFilter?: string,
    departmentFilter?: string
): ComparisonResult {
    if (!facultyFilter && !departmentFilter) {
        return comparison;
    }

    const filtered: ComparisonResult = {
        ...comparison,
        positionChanges: comparison.positionChanges.filter(change => {
            const matchesFaculty = !facultyFilter || change.faculty === facultyFilter;
            const matchesDept = !departmentFilter || change.department === departmentFilter;
            return matchesFaculty && matchesDept;
        }),
        adminPostChanges: comparison.adminPostChanges.filter(change => {
            const matchesFaculty = !facultyFilter || change.faculty === facultyFilter;
            const matchesDept = !departmentFilter || change.department === departmentFilter;
            return matchesFaculty && matchesDept;
        }),
        newHires: comparison.newHires.filter(staff => {
            const matchesFaculty = !facultyFilter || staff.facultyAcronym === facultyFilter;
            const matchesDept = !departmentFilter || staff.departmentAcronym === departmentFilter;
            return matchesFaculty && matchesDept;
        }),
        departures: comparison.departures.filter(staff => {
            const matchesFaculty = !facultyFilter || staff.facultyAcronym === facultyFilter;
            const matchesDept = !departmentFilter || staff.departmentAcronym === departmentFilter;
            return matchesFaculty && matchesDept;
        }),
        facultyCountChanges: facultyFilter
            ? comparison.facultyCountChanges.filter(c => c.unit === facultyFilter)
            : comparison.facultyCountChanges,
        departmentCountChanges: departmentFilter
            ? comparison.departmentCountChanges.filter(c => c.unit === departmentFilter)
            : comparison.departmentCountChanges,
    };

    // Recalculate summary
    filtered.summary = {
        ...comparison.summary,
        promotions: filtered.positionChanges.filter(c => c.changeType === 'promotion').length,
        demotions: filtered.positionChanges.filter(c => c.changeType === 'demotion').length,
        lateralMoves: filtered.positionChanges.filter(c => c.changeType === 'lateral').length,
        adminPostChanges: filtered.adminPostChanges.length,
        newHires: filtered.newHires.length,
        departures: filtered.departures.length,
    };

    return filtered;
}

function printComparisonReport(comparison: ComparisonResult, filter?: FilteredComparison) {
    console.log('');
    console.log('='.repeat(80));
    console.log('📊 STAFF DIRECTORY COMPARISON: 2025 vs 2026');
    console.log('='.repeat(80));
    console.log('');

    if (filter?.faculty) {
        console.log(`🎯 Filtered by Faculty: ${filter.faculty}`);
    }
    if (filter?.department) {
        console.log(`🎯 Filtered by Department: ${filter.department}`);
    }
    if (filter?.faculty || filter?.department) {
        console.log('');
    }

    // Summary
    console.log('📈 SUMMARY');
    console.log('-'.repeat(80));
    console.log(`Total Staff (2025): ${comparison.summary.totalStaffYear1}`);
    console.log(`Total Staff (2026): ${comparison.summary.totalStaffYear2}`);
    console.log(`Net Change: ${comparison.summary.netChange > 0 ? '+' : ''}${comparison.summary.netChange}`);
    console.log('');
    console.log(`Promotions: ${comparison.summary.promotions}`);
    console.log(`Demotions: ${comparison.summary.demotions}`);
    console.log(`Lateral Moves: ${comparison.summary.lateralMoves}`);
    console.log(`Admin Post Changes: ${comparison.summary.adminPostChanges}`);
    console.log(`New Hires: ${comparison.summary.newHires}`);
    console.log(`Departures: ${comparison.summary.departures}`);
    console.log('');

    // Administrative Position Changes
    if (!filter || filter.showAdminChanges !== false) {
        if (comparison.adminPostChanges.length > 0) {
            console.log('🏛️  ADMINISTRATIVE POSITION CHANGES');
            console.log('-'.repeat(80));
            console.log('');

            comparison.adminPostChanges.forEach((change, index) => {
                console.log(`${index + 1}. ${change.name}`);
                console.log(`   Faculty: ${change.faculty}`);
                console.log(`   Department: ${change.department}`);

                if (change.added.length > 0) {
                    console.log(`   ➕ Added Posts:`);
                    change.added.forEach(post => console.log(`      • ${post}`));
                }

                if (change.removed.length > 0) {
                    console.log(`   ➖ Removed Posts:`);
                    change.removed.forEach(post => console.log(`      • ${post}`));
                }

                console.log('');
            });
        } else {
            console.log('🏛️  ADMINISTRATIVE POSITION CHANGES: None');
            console.log('');
        }
    }

    // Designation Changes (Promotions/Demotions)
    if (!filter || filter.showDesignationChanges !== false) {
        if (comparison.positionChanges.length > 0) {
            console.log('📊 DESIGNATION CHANGES');
            console.log('-'.repeat(80));
            console.log('');

            const promotions = comparison.positionChanges.filter(c => c.changeType === 'promotion');
            const demotions = comparison.positionChanges.filter(c => c.changeType === 'demotion');
            const lateral = comparison.positionChanges.filter(c => c.changeType === 'lateral');

            if (promotions.length > 0) {
                console.log('⬆️  PROMOTIONS:');
                promotions.forEach((change, index) => {
                    console.log(`${index + 1}. ${change.name}`);
                    console.log(`   ${change.oldDesignation} → ${change.newDesignation}`);
                    console.log(`   Faculty: ${change.faculty}, Department: ${change.department}`);
                    console.log('');
                });
            }

            if (demotions.length > 0) {
                console.log('⬇️  DEMOTIONS:');
                demotions.forEach((change, index) => {
                    console.log(`${index + 1}. ${change.name}`);
                    console.log(`   ${change.oldDesignation} → ${change.newDesignation}`);
                    console.log(`   Faculty: ${change.faculty}, Department: ${change.department}`);
                    console.log('');
                });
            }

            if (lateral.length > 0) {
                console.log('↔️  LATERAL MOVES:');
                lateral.forEach((change, index) => {
                    console.log(`${index + 1}. ${change.name}`);
                    console.log(`   ${change.oldDesignation} → ${change.newDesignation}`);
                    console.log(`   Faculty: ${change.faculty}, Department: ${change.department}`);
                    console.log('');
                });
            }
        } else {
            console.log('📊 DESIGNATION CHANGES: None');
            console.log('');
        }
    }

    // New Hires
    if (!filter || filter.showNewHires !== false) {
        if (comparison.newHires.length > 0) {
            console.log('👋 NEW HIRES (2026)');
            console.log('-'.repeat(80));
            comparison.newHires.forEach((staff, index) => {
                console.log(`${index + 1}. ${staff.name}`);
                console.log(`   Designation: ${staff.designation}`);
                console.log(`   Faculty: ${staff.facultyAcronym}, Department: ${staff.departmentAcronym}`);
                console.log('');
            });
        }
    }

    // Departures
    if (!filter || filter.showDepartures !== false) {
        if (comparison.departures.length > 0) {
            console.log('👋 DEPARTURES (Left in 2026)');
            console.log('-'.repeat(80));
            comparison.departures.forEach((staff, index) => {
                console.log(`${index + 1}. ${staff.name}`);
                console.log(`   Designation: ${staff.designation}`);
                console.log(`   Faculty: ${staff.facultyAcronym}, Department: ${staff.departmentAcronym}`);
                console.log('');
            });
        }
    }

    console.log('='.repeat(80));
    console.log('');
}

async function main() {
    console.log('Loading staff directories...');

    const dir2025 = loadDirectory(LEGACY_2025_PATH, 2025);
    const dir2026 = loadDirectory(CURRENT_2026_PATH, 2026);

    console.log('✓ Loaded 2025 data');
    console.log('✓ Loaded 2026 data');

    console.log('');
    console.log('Comparing directories...');

    const fullComparison = compareStaffDirectories(dir2025, dir2026);

    // Example 1: Full comparison
    printComparisonReport(fullComparison);

    // Example 2: LKC FES only
    console.log('');
    console.log('');
    const lkcfesComparison = filterComparisonByFaculty(fullComparison, 'LKC FES');
    printComparisonReport(lkcfesComparison, { faculty: 'LKC FES' });
}

main().catch(console.error);
