import fs from 'fs';

const data = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

console.log('='.repeat(80));
console.log('FINAL PUBLICATION STATISTICS');
console.log('='.repeat(80));
console.log();
console.log(`Total Staff: ${data.results.length}`);
console.log();
console.log('Publications by Year:');
console.log(`  2023: ${data.metadata.statistics.publications2023}`);
console.log(`  2024: ${data.metadata.statistics.publications2024}`);
console.log(`  2025: ${data.metadata.statistics.publications2025}`);
console.log(`  TOTAL: ${data.metadata.statistics.totalPublications}`);
console.log();
console.log(`Average per Staff: ${data.metadata.statistics.averagePerStaff}`);
console.log();
console.log(`Corrected IDs Applied: ${data.metadata.correctedIdsApplied}`);
console.log(`Corrected IDs Count: ${data.metadata.correctedIdsCount}`);
console.log();
console.log('='.repeat(80));
