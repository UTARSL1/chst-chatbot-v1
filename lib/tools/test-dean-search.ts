// Quick test for department='all' fix
import { searchStaffFromDirectory } from './search-from-directory';

console.log('=== Testing department="all" fix ===\n');

console.log('Test: Search for Dean in LKC FES with department="all"');
const results = searchStaffFromDirectory({
    faculty: 'LKC FES',
    department: 'all',
    role: 'Dean'
});

console.log(`Found: ${results.length} staff`);
if (results.length > 0) {
    console.log('✓ SUCCESS: Lookup table search worked!');
    console.log(`Dean: ${results[0].name}`);
    console.log(`Email: ${results[0].email}`);
    console.log(`Administrative Posts: ${results[0].administrativePosts?.join(', ')}`);
} else {
    console.log('✗ FAILED: No results found');
}
