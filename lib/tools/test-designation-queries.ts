import { queryDesignationStats, compareDesignationsAcrossDepartments } from './query-designation-stats';

console.log('=== Testing Designation Query Functions ===\n');

// Test 1: How many associate professors in DMBE?
console.log('Test 1: How many associate professors in DMBE?');
const test1 = queryDesignationStats({
    acronym: 'DMBE',
    designation: 'Associate Professor'
});
console.log(JSON.stringify(test1, null, 2));
console.log('\n---\n');

// Test 2: How many professors and senior professors in LKC FES?
console.log('Test 2: Professors in LKC FES');
const test2a = queryDesignationStats({
    acronym: 'LKC FES',
    designation: 'Professor'
});
console.log(JSON.stringify(test2a, null, 2));

console.log('\nTest 2b: Senior Professors in LKC FES');
const test2b = queryDesignationStats({
    acronym: 'LKC FES',
    designation: 'Senior Professor'
});
console.log(JSON.stringify(test2b, null, 2));
console.log('\n---\n');

// Test 3: List all professors in LKC FES
console.log('Test 3: List all professors in LKC FES');
const test3 = queryDesignationStats({
    acronym: 'LKC FES',
    designation: 'Professor'
});
console.log(`Count: ${test3?.count}`);
console.log('Staff:');
test3?.staff.forEach((s: any) => console.log(`  - ${s.name} (${s.email})`));
console.log('\n---\n');

// Test 4: Compare professors across departments in LKC FES
console.log('Test 4: Compare professors across departments in LKC FES');
const test4 = compareDesignationsAcrossDepartments({
    acronym: 'LKC FES',
    designation: 'Professor'
});
console.log(JSON.stringify(test4, null, 2));
console.log('\n---\n');

// Test 5: All designation stats for LKC FES
console.log('Test 5: All designation stats for LKC FES');
const test5 = queryDesignationStats({
    acronym: 'LKC FES'
});
console.log(`Total staff: ${test5?.totalStaff}`);
console.log('Designation breakdown:');
console.log(JSON.stringify(test5?.designationCounts, null, 2));
console.log('\n---\n');

// Test 6: How many assistant professors in D3E?
console.log('Test 6: How many assistant professors in D3E?');
const test6 = queryDesignationStats({
    acronym: 'D3E',
    designation: 'Assistant Professor'
});
console.log(JSON.stringify(test6, null, 2));
console.log('\n---\n');

// Test 7: Compare Senior Professors across LKC FES departments
console.log('Test 7: Compare Senior Professors across LKC FES departments');
const test7 = compareDesignationsAcrossDepartments({
    acronym: 'LKC FES',
    designation: 'Senior Professor'
});
console.log(JSON.stringify(test7, null, 2));
console.log('\n---\n');

// Test 8: How many lecturers in DC (Department of Chemistry)?
console.log('Test 8: How many lecturers in DC?');
const test8 = queryDesignationStats({
    acronym: 'DC',
    designation: 'Lecturer'
});
console.log(JSON.stringify(test8, null, 2));
console.log('\n---\n');

// Test 9: All designations in DMBE
console.log('Test 9: All designations in DMBE');
const test9 = queryDesignationStats({
    acronym: 'DMBE'
});
console.log(JSON.stringify(test9?.designationCounts, null, 2));
console.log('\n---\n');

// Test 10: Compare Associate Professors across all LKC FES departments
console.log('Test 10: Compare Associate Professors across all LKC FES departments');
const test10 = compareDesignationsAcrossDepartments({
    acronym: 'LKC FES',
    designation: 'Associate Professor'
});
console.log(`Total departments: ${test10?.totalDepartments}`);
console.log(`Departments with Associate Professors: ${test10?.departmentsWithDesignation}`);
console.log('\nTop 5 departments:');
test10?.departments.slice(0, 5).forEach((d: any) => {
    console.log(`  ${d.acronym}: ${d.count} Associate Professors`);
});
