import fs from 'fs';

const data = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

console.log('='.repeat(80));
console.log('FINAL VERIFICATION - LKC FES SCOPUS PUBLICATION DATA');
console.log('='.repeat(80));
console.log();

console.log('📊 TOTAL STAFF');
console.log(`  Total records: ${data.results.length}`);
console.log(`  With Scopus data: ${data.metadata.staffWithScopusData || 'N/A'}`);
console.log(`  Without Scopus data: ${data.metadata.staffWithoutScopusData || 'N/A'}`);
console.log();

console.log('📈 PUBLICATIONS (2023-2025)');
console.log(`  2023: ${data.metadata.statistics.publications2023}`);
console.log(`  2024: ${data.metadata.statistics.publications2024}`);
console.log(`  2025: ${data.metadata.statistics.publications2025}`);
console.log(`  TOTAL: ${data.metadata.statistics.totalPublications}`);
console.log(`  Average per staff: ${data.metadata.statistics.averagePerStaff}`);
console.log();

// Verify Chai Tong Yuen
const chai = data.results.find((r: any) => r.email === 'chaity@utar.edu.my');
if (chai) {
    console.log('✅ CHAI TONG YUEN VERIFICATION');
    console.log(`  Email: ${chai.email}`);
    console.log(`  Department: ${chai.departmentAcronym}`);
    console.log(`  Scopus ID: ${chai.scopusAuthorId}`);
    console.log(`  Status: ${chai.scopusStatus}`);
    console.log(`  Publications: ${chai.totalPublications} (2023: ${chai.publications.find((p: any) => p.year === 2023)?.count}, 2024: ${chai.publications.find((p: any) => p.year === 2024)?.count}, 2025: ${chai.publications.find((p: any) => p.year === 2025)?.count})`);
    console.log();
}

console.log('='.repeat(80));

if (data.results.length === 234) {
    console.log('✅ SUCCESS! Exactly 234 staff records as required!');
} else {
    console.log(`⚠️  WARNING: Expected 234 but have ${data.results.length}`);
}

console.log('='.repeat(80));
console.log();
console.log('🎉 Ready for UI development!');
console.log();
