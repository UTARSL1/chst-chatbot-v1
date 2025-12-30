// Local sync script - run this to update staff_directory.json locally
// This must be run locally because Vercel has a 10-second timeout for serverless functions
// and the sync takes 2-5 minutes to complete.

import { syncStaffDirectory } from './staff-directory';

console.log('=== Starting Local Staff Directory Sync ===\n');
console.log('This will update lib/tools/staff_directory.json\n');

// Sync all UTAR faculties
const faculties = [
    'FAM',      // Faculty of Accountancy and Management
    'FAS',      // Faculty of Arts and Social Science
    'FCS',      // Faculty of Chinese Studies
    'FCI',      // Faculty of Creative Industries
    'FEd',      // Faculty of Education
    'FEGT',     // Faculty of Engineering and Green Technology
    'FICT',     // Faculty of Information and Communication Technology
    'FSc',      // Faculty of Science
    'LKC FES',  // Lee Kong Chian Faculty of Engineering and Science
    'MK FMHS',  // M. Kandiah Faculty of Medicine and Health Sciences
    'THP FBF'   // Teh Hong Piow Faculty of Business and Finance
];

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
        process.exit(0);
    })
    .catch(error => {
        console.error('\n=== Sync Failed ===');
        console.error(error.message);
        console.error(error.stack);
        process.exit(1);
    });
