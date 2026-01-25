const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./lkcfes-scopus-publications.json', 'utf-8'));

const deptMap = new Map();

data.results.forEach(staff => {
    const dept = staff.departmentAcronym;
    if (!deptMap.has(dept)) {
        deptMap.set(dept, {
            acronym: dept,
            fullName: staff.department,
            count: 0
        });
    }
    deptMap.get(dept).count++;
});

const departments = Array.from(deptMap.values()).sort((a, b) => a.acronym.localeCompare(b.acronym));

console.log('=== LKC FES DEPARTMENTS ===\n');
console.log(`Total Departments: ${departments.length}`);
console.log(`Total Staff: ${data.metadata.totalStaff}\n`);

departments.forEach(dept => {
    console.log(`${dept.acronym.padEnd(6)} - ${dept.count.toString().padStart(3)} staff - ${dept.fullName}`);
});

console.log('\n=== READY FOR EXPORT ===');
console.log('✓ DMBE - Already tested and working');
console.log('→ Ready to enable:', departments.filter(d => d.acronym !== 'DMBE').map(d => d.acronym).join(', '));
