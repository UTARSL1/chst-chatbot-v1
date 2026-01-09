import fs from 'fs';
import path from 'path';

// Load staff directory to get ORCID IDs
const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

// Load the list of staff with 0 publications
const verificationData = JSON.parse(fs.readFileSync('lkcfes-needs-manual-verification.json', 'utf-8'));

const zeroPublications = verificationData.staff.filter((s: any) =>
    s.issue === 'Zero publications - likely incorrect Scopus ID'
);

// Extract ORCID IDs for these staff
const staffWithOrcid: any[] = [];

// Search through staff directory
const lkcfes = staffDirectory.faculties?.['LKC FES'];
if (lkcfes) {
    const departments = lkcfes.departments || {};

    for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
        const staff = deptData.staff || [];

        for (const member of staff) {
            // Check if this staff member is in our zero publications list
            const isInZeroList = zeroPublications.some((s: any) => s.email === member.email);

            if (isInZeroList) {
                staffWithOrcid.push({
                    name: member.name,
                    email: member.email,
                    orcidUrl: member.orcidUrl || '',
                    orcidId: extractOrcidId(member.orcidUrl || ''),
                });
            }
        }
    }
}

function extractOrcidId(orcidUrl: string): string {
    if (!orcidUrl || orcidUrl.trim() === '') {
        return 'NO ORCID';
    }

    const match = orcidUrl.match(/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/);
    return match ? match[1] : 'INVALID ORCID';
}

console.log(`Total staff with 0 publications: ${zeroPublications.length}`);
console.log(`Staff found in directory: ${staffWithOrcid.length}`);
console.log('');
console.log('ORCID IDs (semicolon-separated):');
console.log('');

const orcidIds = staffWithOrcid.map(s => s.orcidId);
console.log(orcidIds.join('; '));

console.log('');
console.log('');
console.log('Detailed list:');
console.log('');
staffWithOrcid.forEach(s => {
    console.log(`${s.name} (${s.email}): ${s.orcidId}`);
});
