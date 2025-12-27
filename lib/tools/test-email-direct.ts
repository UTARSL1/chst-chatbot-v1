import { searchStaffFromDirectory } from './search-from-directory';

async function testEmailSearch() {
    console.log('=== Testing Email Search: humyc@utar.edu.my ===\n');

    const results = searchStaffFromDirectory({
        email: 'humyc@utar.edu.my'
    });

    console.log(`Found ${results.length} staff member(s)\n`);

    if (results.length > 0) {
        results.forEach(staff => {
            console.log('Staff Details:');
            console.log(`  Name: ${staff.name}`);
            console.log(`  Email: ${staff.email}`);
            console.log(`  Position: ${staff.position}`);
            console.log(`  Designation: ${staff.designation}`);
            console.log(`  Faculty: ${staff.faculty}`);
            console.log(`  Department: ${staff.department}`);
            console.log(`  Search ID: ${staff.searchId}`);
        });
    } else {
        console.log('No staff found.');
    }
}

testEmailSearch().catch(console.error);
