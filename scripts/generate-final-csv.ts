import fs from 'fs';

const data = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

console.log('Generating properly formatted CSV file...');
console.log();

// Helper function to escape CSV fields
function escapeCsvField(field: string): string {
    if (!field) return '';

    // If field contains comma, newline, or quotes, wrap in quotes and escape internal quotes
    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
        return `"${field.replace(/"/g, '""')}"`;
    }

    return field;
}

// Create CSV header
let csv = 'Name,Email,Scopus ID\n';

// Add each staff member
for (const staff of data.results) {
    const name = escapeCsvField(staff.name);
    const email = staff.email || '';
    const scopusId = (staff.scopusAuthorId === 'N/A' || !staff.scopusAuthorId) ? 'NA' : staff.scopusAuthorId;

    csv += `${name},${email},${scopusId}\n`;
}

// Save CSV file
fs.writeFileSync('lkcfes-234-staff-final.csv', csv, 'utf-8');

console.log('✅ CSV file generated: lkcfes-234-staff-final.csv');
console.log(`   Total records: ${data.results.length}`);
console.log();

// Show sample
console.log('Sample (first 10 rows):');
const lines = csv.split('\n').slice(0, 11);
lines.forEach((line, idx) => {
    if (idx === 0) {
        console.log(`${line}`);
        console.log('-'.repeat(80));
    } else if (line) {
        console.log(`${line}`);
    }
});

console.log();
console.log('Note: Names with special characters are properly quoted for CSV format');
