import fs from 'fs';
import path from 'path';

/**
 * Simple script to add researchCentreMembership field to all staff
 * Sets 'NA' as default for everyone
 */

// Load staff directory
const staffDirectoryPath = path.join(__dirname, '../lib/tools/staff_directory.json');
const staffDirectory = JSON.parse(fs.readFileSync(staffDirectoryPath, 'utf-8'));

console.log('🔍 Adding researchCentreMembership field to all staff...');

let totalStaff = 0;

// Add field to all staff
for (const [facultyKey, faculty] of Object.entries(staffDirectory.faculties)) {
    const facultyData = faculty as any;
    if (facultyData.departments) {
        for (const [deptKey, dept] of Object.entries(facultyData.departments)) {
            const deptData = dept as any;
            if (deptData.staff && Array.isArray(deptData.staff)) {
                for (const staff of deptData.staff) {
                    // Add field if it doesn't exist
                    if (!staff.researchCentreMembership) {
                        staff.researchCentreMembership = 'NA';
                        totalStaff++;
                    }
                }
            }
        }
    }
}

// Save updated staff directory
fs.writeFileSync(staffDirectoryPath, JSON.stringify(staffDirectory, null, 2), 'utf-8');

console.log(`✅ Added researchCentreMembership field to ${totalStaff} staff members`);
console.log(`📁 Updated file: ${staffDirectoryPath}`);
console.log('\n✨ Done! All staff now have researchCentreMembership = "NA" by default');
console.log('You can now manually update specific staff to "CHST" or other research centres');
