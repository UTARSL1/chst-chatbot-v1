import fs from 'fs';

const data = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

console.log('='.repeat(80));
console.log('VERIFICATION: Total Records in Publication JSON');
console.log('='.repeat(80));
console.log();
console.log(`Total staff records: ${data.results.length}`);
console.log();

if (data.results.length === 234) {
    console.log('✅ SUCCESS! Exactly 234 records as expected!');
} else {
    console.log(`⚠️  WARNING: Expected 234 but found ${data.results.length}`);
    console.log(`   Difference: ${234 - data.results.length}`);
}

console.log();
console.log('Breakdown:');
console.log(`  With Scopus data: ${data.metadata.staffWithScopusData || 'N/A'}`);
console.log(`  Without Scopus data: ${data.metadata.staffWithoutScopusData || 'N/A'}`);
console.log();
console.log('='.repeat(80));
