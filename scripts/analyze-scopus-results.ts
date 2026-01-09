/**
 * Analyze Scopus Publication Results
 * 
 * This script analyzes the scraped publication data to identify:
 * 1. Staff with 0 publications (likely incorrect IDs)
 * 2. Staff with missing Scopus IDs
 * 3. Statistics and patterns
 */

import fs from 'fs';

interface PublicationResult {
    searchId: string;
    name: string;
    email: string;
    department: string;
    departmentAcronym: string;
    scopusAuthorId: string;
    publications: Array<{
        year: number;
        count: number;
        success: boolean;
    }>;
    totalPublications: number;
}

interface InaccessibleStaff {
    searchId: string;
    name: string;
    email: string;
    department: string;
    scopusUrl: string;
    reason: string;
}

// Load the results
const publicationsData = JSON.parse(
    fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8')
);

const inaccessibleData = JSON.parse(
    fs.readFileSync('lkcfes-inaccessible-scopus.json', 'utf-8')
);

const results: PublicationResult[] = publicationsData.results;
const inaccessible: InaccessibleStaff[] = inaccessibleData.staff;

console.log('='.repeat(80));
console.log('LKC FES Scopus Publication Analysis');
console.log('='.repeat(80));
console.log();

// 1. Staff with 0 publications (likely incorrect IDs)
const zeroPublications = results.filter(r => r.totalPublications === 0);

console.log(`📊 STAFF WITH 0 PUBLICATIONS (${zeroPublications.length} staff)`);
console.log('These likely have incorrect/truncated Scopus IDs:');
console.log('='.repeat(80));

zeroPublications.forEach((staff, idx) => {
    console.log(`${idx + 1}. ${staff.name}`);
    console.log(`   Email: ${staff.email}`);
    console.log(`   Department: ${staff.departmentAcronym}`);
    console.log(`   Current Scopus ID: ${staff.scopusAuthorId}`);
    console.log(`   Publications: 2023=${staff.publications.find(p => p.year === 2023)?.count || 0}, ` +
        `2024=${staff.publications.find(p => p.year === 2024)?.count || 0}, ` +
        `2025=${staff.publications.find(p => p.year === 2025)?.count || 0}`);
    console.log();
});

// 2. Staff with missing Scopus IDs
console.log('='.repeat(80));
console.log(`📊 STAFF WITHOUT SCOPUS IDs (${inaccessible.length} staff)`);
console.log('These need Scopus IDs to be added:');
console.log('='.repeat(80));

inaccessible.forEach((staff, idx) => {
    console.log(`${idx + 1}. ${staff.name}`);
    console.log(`   Email: ${staff.email}`);
    console.log(`   Department: ${staff.department}`);
    console.log(`   Reason: ${staff.reason}`);
    console.log(`   Current URL: ${staff.scopusUrl}`);
    console.log();
});

// 3. Publication distribution
console.log('='.repeat(80));
console.log('📊 PUBLICATION DISTRIBUTION');
console.log('='.repeat(80));

const ranges = [
    { label: '0 publications', min: 0, max: 0 },
    { label: '1-5 publications', min: 1, max: 5 },
    { label: '6-10 publications', min: 6, max: 10 },
    { label: '11-20 publications', min: 11, max: 20 },
    { label: '21-30 publications', min: 21, max: 30 },
    { label: '31+ publications', min: 31, max: Infinity },
];

ranges.forEach(range => {
    const count = results.filter(r =>
        r.totalPublications >= range.min && r.totalPublications <= range.max
    ).length;
    const percentage = ((count / results.length) * 100).toFixed(1);
    console.log(`${range.label.padEnd(25)}: ${count.toString().padStart(3)} staff (${percentage}%)`);
});

console.log();

// 4. Top publishers
console.log('='.repeat(80));
console.log('📊 TOP 20 PUBLISHERS (2023-2025)');
console.log('='.repeat(80));

const topPublishers = results
    .filter(r => r.totalPublications > 0)
    .sort((a, b) => b.totalPublications - a.totalPublications)
    .slice(0, 20);

topPublishers.forEach((staff, idx) => {
    const pub2023 = staff.publications.find(p => p.year === 2023)?.count || 0;
    const pub2024 = staff.publications.find(p => p.year === 2024)?.count || 0;
    const pub2025 = staff.publications.find(p => p.year === 2025)?.count || 0;

    console.log(`${(idx + 1).toString().padStart(2)}. ${staff.name} (${staff.departmentAcronym})`);
    console.log(`    2023: ${pub2023.toString().padStart(2)}, 2024: ${pub2024.toString().padStart(2)}, 2025: ${pub2025.toString().padStart(2)} | Total: ${staff.totalPublications}`);
});

console.log();

// 5. Department statistics
console.log('='.repeat(80));
console.log('📊 PUBLICATIONS BY DEPARTMENT');
console.log('='.repeat(80));

const deptStats = new Map<string, { count: number; total2023: number; total2024: number; total2025: number; staffCount: number }>();

results.forEach(staff => {
    const dept = staff.departmentAcronym;
    if (!deptStats.has(dept)) {
        deptStats.set(dept, { count: 0, total2023: 0, total2024: 0, total2025: 0, staffCount: 0 });
    }

    const stats = deptStats.get(dept)!;
    stats.staffCount++;
    stats.total2023 += staff.publications.find(p => p.year === 2023)?.count || 0;
    stats.total2024 += staff.publications.find(p => p.year === 2024)?.count || 0;
    stats.total2025 += staff.publications.find(p => p.year === 2025)?.count || 0;
    stats.count += staff.totalPublications;
});

const sortedDepts = Array.from(deptStats.entries())
    .sort((a, b) => b[1].count - a[1].count);

sortedDepts.forEach(([dept, stats]) => {
    const avg = (stats.count / stats.staffCount).toFixed(1);
    console.log(`${dept.padEnd(6)}: ${stats.staffCount.toString().padStart(3)} staff, ` +
        `2023: ${stats.total2023.toString().padStart(3)}, ` +
        `2024: ${stats.total2024.toString().padStart(3)}, ` +
        `2025: ${stats.total2025.toString().padStart(3)} | ` +
        `Total: ${stats.count.toString().padStart(4)} (avg: ${avg})`);
});

console.log();

// 6. Save detailed report for staff needing attention
const needsAttention = [
    ...zeroPublications.map(s => ({
        name: s.name,
        email: s.email,
        department: s.departmentAcronym,
        issue: 'Zero publications - likely incorrect Scopus ID',
        currentScopusId: s.scopusAuthorId,
        recommendedAction: 'Verify Scopus ID by searching author name on Scopus website',
    })),
    ...inaccessible.map(s => ({
        name: s.name,
        email: s.email,
        department: s.department,
        issue: 'Missing Scopus ID',
        currentScopusId: null,
        recommendedAction: 'Search for author on Scopus and add ID to staff directory',
    })),
];

fs.writeFileSync(
    'lkcfes-needs-manual-verification.json',
    JSON.stringify({
        metadata: {
            generatedAt: new Date().toISOString(),
            totalNeedingAttention: needsAttention.length,
            zeroPublications: zeroPublications.length,
            missingScopusIds: inaccessible.length,
        },
        staff: needsAttention,
    }, null, 2),
    'utf-8'
);

console.log('='.repeat(80));
console.log('✅ Detailed report saved to: lkcfes-needs-manual-verification.json');
console.log('='.repeat(80));
console.log();

console.log('SUMMARY:');
console.log(`  Total LKC FES academic staff: ${publicationsData.metadata.totalStaff}`);
console.log(`  Staff with Scopus access: ${results.length}`);
console.log(`  Staff with 0 publications: ${zeroPublications.length} (likely incorrect IDs)`);
console.log(`  Staff without Scopus IDs: ${inaccessible.length}`);
console.log(`  Total needing manual verification: ${needsAttention.length}`);
console.log();
