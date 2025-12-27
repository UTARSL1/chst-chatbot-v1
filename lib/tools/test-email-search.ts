import { searchStaffFromDirectory } from './search-from-directory';

async function testEmailSearch() {
    console.log('=== Testing Email Search Functionality ===\n');

    // Test 1: Search by email (should work now)
    console.log('Test 1: Search by email "humyc@utar.edu.my"');
    const results1 = searchStaffFromDirectory({
        faculty: 'All',
        email: 'humyc@utar.edu.my'
    }, console.log);

    console.log(`Found ${results1.length} staff member(s)`);
    if (results1.length > 0) {
        console.log('Staff details:');
        results1.forEach(staff => {
            console.log(`  - Name: ${staff.name}`);
            console.log(`    Email: ${staff.email}`);
            console.log(`    Department: ${staff.department}`);
            console.log(`    Position: ${staff.position}`);
        });
    } else {
        console.log('  No staff found with this email.');
        console.log('  This could mean:');
        console.log('  1. The email address is incorrect (typo?)');
        console.log('  2. The staff directory has not been synced yet');
        console.log('  3. This person is not in the staff directory');
    }

    console.log('\n=== Test Complete ===');
}

testEmailSearch().catch(console.error);
