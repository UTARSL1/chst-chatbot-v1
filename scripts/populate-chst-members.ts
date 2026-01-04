import fs from 'fs';
import path from 'path';

/**
 * Script to populate CHST member data into staff_directory.json
 * Adds researchCentreMembership field to staff members who are CHST members
 */

interface CHSTMember {
    name: string;
    faculty: string;
    membershipType: 'Full Membership' | 'Associate Membership';
}

interface CHSTMapping {
    version: string;
    lastUpdated: string;
    description: string;
    members: CHSTMember[];
}

// Load CHST members mapping
const chstMappingPath = path.join(__dirname, '../lib/tools/chst_members.json');
const chstMapping: CHSTMapping = JSON.parse(fs.readFileSync(chstMappingPath, 'utf-8'));

// Load staff directory
const staffDirectoryPath = path.join(__dirname, '../lib/tools/staff_directory.json');
const staffDirectory = JSON.parse(fs.readFileSync(staffDirectoryPath, 'utf-8'));

console.log('🔍 Starting CHST member population...');
console.log(`📋 Total CHST members to process: ${chstMapping.members.length}`);

let matchedCount = 0;
let notFoundCount = 0;
let totalStaff = 0;
const notFoundMembers: string[] = [];

// Helper function to normalize names for matching
function normalizeName(name: string): string {
    // Remove common titles - handle multiple consecutive titles
    const titlePattern = /^(Ir\.?|Dr\.?|Prof\.?|Ts\.?|ChM\.?|Mr\.?|Ms\.?|Mrs\.?|Miss\.?|\s)+/gi;

    let normalized = name.replace(titlePattern, '').trim();

    return normalized
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[\/\(\)]/g, '') // Remove slashes and parentheses
        .replace(/a\/p/gi, 'ap') // Normalize a/p to ap
        .replace(/a p/gi, 'ap') // Normalize a p to ap
        .trim();
}

// First, set all staff to 'NA' by default
for (const [facultyKey, faculty] of Object.entries(staffDirectory.faculties)) {
    const facultyData = faculty as any;
    if (facultyData.departments) {
        for (const [deptKey, dept] of Object.entries(facultyData.departments)) {
            const deptData = dept as any;
            if (deptData.staff && Array.isArray(deptData.staff)) {
                for (const staff of deptData.staff) {
                    staff.researchCentreMembership = 'NA';
                    totalStaff++;
                }
            }
        }
    }
}

console.log(`📊 Total staff in directory: ${totalStaff}`);
console.log(`🏷️  Setting all staff to 'NA' by default...`);

// Now update CHST members
for (const chstMember of chstMapping.members) {
    const normalizedChstName = normalizeName(chstMember.name);
    let found = false;

    // Search through all faculties and departments
    for (const [facultyKey, faculty] of Object.entries(staffDirectory.faculties)) {
        const facultyData = faculty as any;
        if (facultyData.departments) {
            for (const [deptKey, dept] of Object.entries(facultyData.departments)) {
                const deptData = dept as any;
                if (deptData.staff && Array.isArray(deptData.staff)) {
                    for (const staff of deptData.staff) {
                        const normalizedStaffName = normalizeName(staff.name);

                        // Match by normalized name
                        if (normalizedStaffName === normalizedChstName) {
                            // Set CHST membership
                            staff.researchCentreMembership = 'CHST';

                            console.log(`✅ Matched: ${staff.name} → CHST`);
                            matchedCount++;
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }
            }
            if (found) break;
        }
    }

    if (!found) {
        console.log(`❌ Not found: ${chstMember.name}`);
        notFoundCount++;
        notFoundMembers.push(chstMember.name);
    }
}

// Save updated staff directory
fs.writeFileSync(staffDirectoryPath, JSON.stringify(staffDirectory, null, 2), 'utf-8');

console.log('\n📊 Summary:');
console.log(`✅ CHST members tagged: ${matchedCount}`);
console.log(`❌ Not found: ${notFoundCount}`);
console.log(`📋 Total staff with 'NA': ${totalStaff - matchedCount}`);

if (notFoundMembers.length > 0) {
    console.log('\n⚠️  Members not found in staff directory:');
    notFoundMembers.forEach(name => console.log(`   - ${name}`));
}

console.log('\n✨ CHST member population complete!');
console.log(`📁 Updated file: ${staffDirectoryPath}`);
