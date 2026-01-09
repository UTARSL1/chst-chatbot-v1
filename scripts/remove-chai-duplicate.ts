import fs from 'fs';

const data = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

console.log(`Before: ${data.results.length} records`);

// Remove "Ts Dr Chai Tong Yuen" with empty email and empty department
data.results = data.results.filter((r: any) => {
    const isDuplicate = r.name === 'Ts Dr Chai Tong Yuen' &&
        (!r.email || r.email.trim() === '') &&
        (!r.departmentAcronym || r.departmentAcronym.trim() === '');

    if (isDuplicate) {
        console.log(`Removing duplicate: ${r.name} (no email, no dept)`);
    }

    return !isDuplicate;
});

console.log(`After: ${data.results.length} records`);

data.metadata.totalStaff = data.results.length;
data.metadata.lastUpdated = new Date().toISOString();

fs.writeFileSync('lkcfes-scopus-publications.json', JSON.stringify(data, null, 2), 'utf-8');

if (data.results.length === 234) {
    console.log('\n✅ SUCCESS! Exactly 234 records!');
} else {
    console.log(`\n⚠️  Expected 234, have ${data.results.length}`);
}
