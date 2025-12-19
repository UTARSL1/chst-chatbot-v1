// Local sync script - run this to update staff_directory.json locally
import { syncStaffDirectory } from './staff-directory.js';

console.log('=== Starting Local Staff Directory Sync ===\n');
console.log('This will update lib/tools/staff_directory.json\n');

// Sync LKC FES (add more faculties as needed)
const faculties = ['LKC FES'];

console.log(`Syncing faculties: ${faculties.join(', ')}\n`);

syncStaffDirectory(faculties)
    .then(result => {
        console.log('\n=== Sync Complete ===');
        console.log(`Status: ${result.status}`);
        console.log(`Duration: ${result.duration}`);
        console.log(`Total staff: ${result.totalStaff}`);
        console.log(`Changes: +${result.changes.added}, ~${result.changes.updated}, -${result.changes.deleted}`);
        console.log('\nNext steps:');
        console.log('1. Review changes: git diff lib/tools/staff_directory.json');
        console.log('2. Commit: git add lib/tools/staff_directory.json');
        console.log('3. Commit: git commit -m "chore: update staff directory"');
        console.log('4. Push: git push');
    })
    .catch(error => {
        console.error('\n=== Sync Failed ===');
        console.error(error.message);
        process.exit(1);
    });
