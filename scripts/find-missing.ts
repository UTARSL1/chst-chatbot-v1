import fs from 'fs';
import path from 'path';

const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

const publicationData = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

// Get all LKC FES staff emails
const allStaffEmails = new Set<string>();
const lkcfes = staffDirectory.faculties?.['LKC FES'];

if (lkcfes) {
    const departments = lkcfes.departments || {};

    for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
        if (deptKey === 'FGO' || deptKey === 'DLMSA') continue;

        const staff = deptData.staff || [];
        for (const member of staff) {
            allStaffEmails.add(member.email);
        }
    }
}

// Get emails in publication JSON
const pubEmails = new Set(publicationData.results.map((r: any) => r.email));

// Find missing
const missing: string[] = [];
for (const email of allStaffEmails) {
    if (!pubEmails.has(email)) {
        missing.push(email);
    }
}

console.log(`Total in directory: ${allStaffEmails.size}`);
console.log(`Total in publication JSON: ${pubEmails.size}`);
console.log(`Missing: ${missing.length}`);
console.log();
console.log('Missing emails:');
missing.forEach(e => console.log(`  - ${e}`));
