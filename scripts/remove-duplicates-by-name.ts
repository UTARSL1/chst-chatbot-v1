import fs from 'fs';

const data = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

// Find duplicates by name
const nameCount = new Map<string, number>();
const duplicates: string[] = [];

for (const result of data.results) {
    const count = (nameCount.get(result.name) || 0) + 1;
    nameCount.set(result.name, count);

    if (count > 1 && !duplicates.includes(result.name)) {
        duplicates.push(result.name);
    }
}

console.log(`Total records: ${data.results.length}`);
console.log(`Duplicates found: ${duplicates.length}`);
console.log();

if (duplicates.length > 0) {
    console.log('Duplicate names:');
    duplicates.forEach(name => {
        const matches = data.results.filter((r: any) => r.name === name);
        console.log(`\n  ${name} (${matches.length} occurrences):`);
        matches.forEach((m: any, idx: number) => {
            console.log(`    ${idx + 1}. Email: "${m.email || 'EMPTY'}" | Dept: ${m.departmentAcronym} | Scopus: ${m.scopusAuthorId}`);
        });
    });

    // Remove duplicates (keep first occurrence)
    const unique: any[] = [];
    const seenNames = new Set<string>();

    for (const result of data.results) {
        if (!seenNames.has(result.name)) {
            unique.push(result);
            seenNames.add(result.name);
        }
    }

    console.log(`\n\nAfter removing duplicates: ${unique.length}`);

    data.results = unique;
    data.metadata.totalStaff = unique.length;
    data.metadata.lastUpdated = new Date().toISOString();

    fs.writeFileSync('lkcfes-scopus-publications.json', JSON.stringify(data, null, 2), 'utf-8');

    console.log('✅ Duplicates removed and file saved');

    if (unique.length === 234) {
        console.log('✅ SUCCESS! Exactly 234 records!');
    }
}
