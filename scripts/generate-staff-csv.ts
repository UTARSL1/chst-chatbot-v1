import fs from 'fs';

const data = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

console.log('Generating clean CSV file with 234 staff records...');
console.log();

// Create CSV header
let csv = 'Name,Email,Scopus ID\n';

// Add each staff member (without quotes around names)
for (const staff of data.results) {
    const name = staff.name;
    const email = staff.email || '';
    const scopusId = staff.scopusAuthorId === 'N/A' ? '' : staff.scopusAuthorId;

    csv += `${name},${email},${scopusId}\n`;
}

// Save CSV file
fs.writeFileSync('lkcfes-234-staff-scopus.csv', csv, 'utf-8');

console.log('✅ CSV file generated: lkcfes-234-staff-scopus.csv');
console.log(`   Total records: ${data.results.length}`);
console.log();

// Show sample
console.log('Sample (first 5 rows):');
console.log(csv.split('\n').slice(0, 6).join('\n'));
