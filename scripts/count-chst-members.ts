import fs from 'fs';
import path from 'path';

/**
 * Script to count CHST members in staff_directory.json
 */

// Load staff directory
const staffDirectoryPath = path.join(__dirname, '../lib/tools/staff_directory.json');
const staffDirectory = JSON.parse(fs.readFileSync(staffDirectoryPath, 'utf-8'));

console.log('🔍 Counting CHST members...\n');

let chstCount = 0;
let naCount = 0;
let totalStaff = 0;
const chstMembers: any[] = [];

// Count CHST members
for (const [facultyKey, faculty] of Object.entries(staffDirectory.faculties)) {
    const facultyData = faculty as any;
    if (facultyData.departments) {
        for (const [deptKey, dept] of Object.entries(facultyData.departments)) {
            const deptData = dept as any;
            if (deptData.staff && Array.isArray(deptData.staff)) {
                for (const staff of deptData.staff) {
                    totalStaff++;

                    if (staff.researchCentreMembership === 'CHST') {
                        chstCount++;
                        chstMembers.push({
                            name: staff.name,
                            faculty: staff.facultyAcronym,
                            department: staff.departmentAcronym,
                            email: staff.email
                        });
                    } else if (staff.researchCentreMembership === 'NA') {
                        naCount++;
                    }
                }
            }
        }
    }
}

console.log('📊 Summary:');
console.log(`✅ CHST members: ${chstCount}`);
console.log(`📋 NA (no research centre): ${naCount}`);
console.log(`👥 Total staff: ${totalStaff}`);

if (chstMembers.length > 0) {
    console.log('\n👥 CHST Members List:');
    chstMembers.forEach((member, index) => {
        console.log(`${index + 1}. ${member.name} (${member.faculty} - ${member.department})`);
    });
}
