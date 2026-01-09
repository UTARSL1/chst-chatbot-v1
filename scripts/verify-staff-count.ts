/**
 * Verify Actual LKC FES Staff Count
 * 
 * Checks the staff directory to get accurate count of academic staff
 */

import fs from 'fs';
import path from 'path';

function verifyStaffCount(): void {
    console.log('='.repeat(80));
    console.log('LKC FES STAFF COUNT VERIFICATION');
    console.log('='.repeat(80));
    console.log();

    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (!lkcfes) {
        console.log('❌ LKC FES not found in staff directory');
        return;
    }

    const departments = lkcfes.departments || {};

    console.log('Department Breakdown:');
    console.log('='.repeat(80));

    let totalStaff = 0;
    let totalAcademic = 0;
    let totalNonAcademic = 0;
    let excludedFGO = 0;
    let excludedDLMSA = 0;

    const deptStats: any[] = [];

    for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
        const staff = deptData.staff || [];
        const deptType = deptData.departmentType || 'Unknown';
        const deptName = deptData.departmentName || deptKey;

        // Count academic staff
        const academicStaff = staff.filter((m: any) => {
            return m.designation &&
                (m.designation.includes('Professor') ||
                    m.designation.includes('Lecturer') ||
                    m.designation.includes('Instructor'));
        });

        const nonAcademicStaff = staff.filter((m: any) => {
            return !m.designation ||
                (!m.designation.includes('Professor') &&
                    !m.designation.includes('Lecturer') &&
                    !m.designation.includes('Instructor'));
        });

        deptStats.push({
            key: deptKey,
            name: deptName,
            type: deptType,
            totalStaff: staff.length,
            academic: academicStaff.length,
            nonAcademic: nonAcademicStaff.length,
        });

        totalStaff += staff.length;

        if (deptKey === 'FGO') {
            excludedFGO = staff.length;
        } else if (deptKey === 'DLMSA') {
            excludedDLMSA = staff.length;
        } else if (deptType === 'Academic') {
            totalAcademic += academicStaff.length;
            totalNonAcademic += nonAcademicStaff.length;
        }
    }

    // Sort by department key
    deptStats.sort((a, b) => a.key.localeCompare(b.key));

    deptStats.forEach(dept => {
        const isExcluded = dept.key === 'FGO' || dept.key === 'DLMSA';
        const marker = isExcluded ? '❌ EXCLUDED' : dept.type === 'Academic' ? '✅' : '⚠️';

        console.log(`${marker} ${dept.key} - ${dept.name}`);
        console.log(`   Type: ${dept.type}`);
        console.log(`   Total: ${dept.totalStaff} | Academic: ${dept.academic} | Non-Academic: ${dept.nonAcademic}`);
        console.log();
    });

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log();
    console.log('Total Staff in LKC FES:');
    console.log(`  All departments: ${totalStaff}`);
    console.log(`  FGO (excluded): ${excludedFGO}`);
    console.log(`  DLMSA (excluded): ${excludedDLMSA}`);
    console.log(`  After exclusions: ${totalStaff - excludedFGO - excludedDLMSA}`);
    console.log();
    console.log('Academic Staff (excluding FGO & DLMSA):');
    console.log(`  Academic: ${totalAcademic}`);
    console.log(`  Non-Academic: ${totalNonAcademic}`);
    console.log(`  Total: ${totalAcademic + totalNonAcademic}`);
    console.log();
    console.log('Expected for Scopus Scraping:');
    console.log(`  Academic staff only: ${totalAcademic}`);
    console.log();
    console.log('='.repeat(80));

    // Save detailed breakdown
    fs.writeFileSync(
        'lkcfes-staff-count-breakdown.json',
        JSON.stringify({
            generatedAt: new Date().toISOString(),
            totalStaff,
            excludedFGO,
            excludedDLMSA,
            afterExclusions: totalStaff - excludedFGO - excludedDLMSA,
            academicStaff: totalAcademic,
            nonAcademicStaff: totalNonAcademic,
            departments: deptStats,
        }, null, 2),
        'utf-8'
    );

    console.log('📄 Detailed breakdown saved: lkcfes-staff-count-breakdown.json');
}

if (require.main === module) {
    verifyStaffCount();
}

export { verifyStaffCount };
