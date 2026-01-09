import fs from 'fs';
import path from 'path';

// Load inaccessible staff
const inaccessibleData = JSON.parse(fs.readFileSync('lkcfes-inaccessible-scopus.json', 'utf-8'));
const inaccessibleStaff = inaccessibleData.staff;

// Load staff directory to get ORCID IDs
const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

function extractOrcidId(orcidUrl: string): string {
    if (!orcidUrl || orcidUrl.trim() === '') {
        return 'NA';
    }

    const match = orcidUrl.match(/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/);
    return match ? match[1] : 'NA';
}

// Get ORCID for each staff
const staffWithOrcid: any[] = [];

const lkcfes = staffDirectory.faculties?.['LKC FES'];
if (lkcfes) {
    const departments = lkcfes.departments || {};

    for (const inaccessible of inaccessibleStaff) {
        let orcidId = 'NA';

        // Search through all departments
        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            const staff = deptData.staff || [];
            const member = staff.find((m: any) => m.email === inaccessible.email);

            if (member) {
                orcidId = extractOrcidId(member.orcidUrl || '');
                break;
            }
        }

        staffWithOrcid.push({
            name: inaccessible.name,
            email: inaccessible.email,
            orcidId,
        });
    }
}

console.log(`Total staff without Scopus IDs: ${staffWithOrcid.length}`);
console.log('');
console.log('ORCID IDs (semicolon-separated):');
console.log('');

const orcidIds = staffWithOrcid.map(s => s.orcidId);
console.log(orcidIds.join('; '));

console.log('');
console.log('');
console.log('Detailed list:');
console.log('');

staffWithOrcid.forEach((s, idx) => {
    console.log(`${idx + 1}. ${s.name} (${s.email}): ${s.orcidId}`);
});

// Count how many have ORCID vs NA
const withOrcid = orcidIds.filter(id => id !== 'NA').length;
const withoutOrcid = orcidIds.filter(id => id === 'NA').length;

console.log('');
console.log('Summary:');
console.log(`  Staff with ORCID: ${withOrcid}`);
console.log(`  Staff without ORCID (NA): ${withoutOrcid}`);
