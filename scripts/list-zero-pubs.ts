import fs from 'fs';

const data = JSON.parse(fs.readFileSync('lkcfes-needs-manual-verification.json', 'utf-8'));

const zeroPublications = data.staff.filter((s: any) =>
    s.issue === 'Zero publications - likely incorrect Scopus ID'
);

const names = zeroPublications.map((s: any) => s.name);

console.log(`Total staff needing attention: ${data.metadata.totalNeedingAttention}`);
console.log(`Staff with 0 publications: ${data.metadata.zeroPublications}`);
console.log(`Missing Scopus IDs: ${data.metadata.missingScopusIds}`);
console.log('');
console.log('Staff with 0 publications (semicolon-separated):');
console.log('');
console.log(names.join('; '));
