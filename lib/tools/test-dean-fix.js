// Test for department='all' fix
const { searchStaffFromDirectory } = require('./search-from-directory');

console.log('=== Testing Lookup Table Fix ===\n');

console.log('Test: Search for Dean in LKC FES with department="all"');
console.log('Query params: { faculty: "LKC FES", department: "all", role: "Dean" }\n');

const results = searchStaffFromDirectory({
    faculty: 'LKC FES',
    department: 'all',
    role: 'Dean'
});

console.log(`\nResults: Found ${results.length} staff member(s)`);

if (results.length > 0) {
    console.log('\n✅ SUCCESS: Lookup table search worked!');
    console.log('\nDean Details:');
    console.log(`  Name: ${results[0].name}`);
    console.log(`  Email: ${results[0].email}`);
    console.log(`  Position: ${results[0].position}`);
    console.log(`  Administrative Posts: ${results[0].administrativePosts?.join(', ') || 'None'}`);
    console.log(`  Department: ${results[0].department}`);
} else {
    console.log('\n❌ FAILED: No results found from lookup table');
    console.log('This means the fix did not work as expected.');
}
