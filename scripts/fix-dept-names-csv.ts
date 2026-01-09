/**
 * Fix Department Names in CSV - Replace Full Names with Acronyms
 */

import fs from 'fs';

function fixDepartmentNames(): void {
    console.log('Fixing department names in CSV...');
    console.log();

    // Read CSV
    let csvContent = fs.readFileSync('lkcfes-234-staff-final.csv', 'utf-8');

    // Replace full department names with acronyms
    const replacements = [
        { full: 'Department of Architecture & Sustainable Design', acronym: 'DASD' },
        { full: 'Department of Architecture and Sustainable Design', acronym: 'DASD' },
        { full: 'Department of Mechanical and Materials Engineering', acronym: 'DMME' },
        { full: 'Department of Mechanical and Material Engineering', acronym: 'DMME' },
    ];

    let replacedCount = 0;

    for (const { full, acronym } of replacements) {
        const regex = new RegExp(full, 'gi');
        const matches = csvContent.match(regex);

        if (matches) {
            console.log(`Replacing "${full}" with "${acronym}" (${matches.length} occurrences)`);
            csvContent = csvContent.replace(regex, acronym);
            replacedCount += matches.length;
        }
    }

    // Save updated CSV
    fs.writeFileSync('lkcfes-234-staff-final.csv', csvContent, 'utf-8');

    console.log();
    console.log(`✅ Replaced ${replacedCount} department names with acronyms`);
    console.log();

    // Verify unique departments
    const lines = csvContent.split('\n').filter(l => l.trim());
    const depts = new Set<string>();

    lines.slice(1).forEach(line => {
        const parts = line.split(',');
        const dept = parts[parts.length - 1]?.trim();
        if (dept) depts.add(dept);
    });

    console.log('Unique departments after fix:');
    Array.from(depts).sort().forEach(d => console.log(`  - ${d}`));
}

if (require.main === module) {
    fixDepartmentNames();
}

export { fixDepartmentNames };
