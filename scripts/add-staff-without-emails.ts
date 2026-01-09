/**
 * Add the 6 Missing Staff Without Emails
 * 
 * These staff don't have email addresses in the directory,
 * so we'll add them with their searchId as a unique identifier
 */

import fs from 'fs';

const publicationData = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

// The 7 staff without emails (but one might already be in the JSON)
const staffWithoutEmails = [
    { searchId: 'AP25034', name: 'Prof. Dr Thomas Chung-Kuang Yang', dept: 'DCL', deptName: 'Department of Chemical Engineering' },
    { searchId: 'AP25022', name: 'Prof. Dr Baochun Chen', dept: 'DCI', deptName: 'Department of Computer and Information Science' },
    { searchId: 'AP25009', name: 'Prof. Dr Bala Venkatesh', dept: 'D3E', deptName: 'Department of Electrical and Electronic Engineering' },
    { searchId: 'AP24003', name: 'Ts Liew Choon Lian', dept: 'D3E', deptName: 'Department of Electrical and Electronic Engineering' },
    { searchId: 'AP24009', name: 'Prof. Dr Loo Kok Keong', dept: 'D3E', deptName: 'Department of Electrical and Electronic Engineering' },
    { searchId: 'AP25039', name: 'Ar. IDr. David Yek Tak Wai', dept: 'DASD', deptName: 'Department of Architecture and Sustainable Design' },
    { searchId: 'AP25023', name: 'Prof. Dr Tan Choon Sooi', dept: 'DMME', deptName: 'Department of Mechanical and Material Engineering' },
];

// Check which ones are already in the JSON (by name)
const existingNames = new Set(publicationData.results.map((r: any) => r.name));
const missing = staffWithoutEmails.filter(s => !existingNames.has(s.name));

console.log(`Staff without emails already in JSON: ${staffWithoutEmails.length - missing.length}`);
console.log(`Staff to add: ${missing.length}`);
console.log();

// Add missing staff
for (const staff of missing) {
    console.log(`Adding: ${staff.name}`);

    publicationData.results.push({
        searchId: staff.searchId,
        name: staff.name,
        email: '', // Empty email
        department: staff.deptName,
        departmentAcronym: staff.dept,
        scopusAuthorId: 'N/A',
        scopusStatus: 'Not Available',
        publications: [
            { year: 2023, count: 0, success: false },
            { year: 2024, count: 0, success: false },
            { year: 2025, count: 0, success: false },
        ],
        totalPublications: 0,
    });
}

// Update metadata
publicationData.metadata.totalStaff = publicationData.results.length;
publicationData.metadata.lastUpdated = new Date().toISOString();

// Save
fs.writeFileSync(
    'lkcfes-scopus-publications.json',
    JSON.stringify(publicationData, null, 2),
    'utf-8'
);

console.log();
console.log(`✅ Total staff now: ${publicationData.results.length}`);

if (publicationData.results.length === 234) {
    console.log('✅ SUCCESS! Exactly 234 records!');
} else {
    console.log(`⚠️  Expected 234, have ${publicationData.results.length}`);
}
