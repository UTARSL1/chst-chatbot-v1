
import { searchStaffFromDirectory } from './search-from-directory';
import { normalizeDesignation } from './designation-utils';

async function testProfessorSearch() {
    console.log('Testing Professor Search logic in LKC FES...');
    console.log('------------------------------------------------');

    // Test Professor (should be 14)
    const profResults = searchStaffFromDirectory({
        acronym: 'LKC FES',
        designation: 'Professor'
    });
    console.log(`Designation: 'Professor' -> Count: ${profResults.length}`);
    if (profResults.length === 14) console.log('✓ CORRECT (14)');
    else console.error(`❌ WRONG (Expected 14, got ${profResults.length})`);

    // Test Senior Professor (should be 6)
    const seniorProfResults = searchStaffFromDirectory({
        acronym: 'LKC FES',
        designation: 'Senior Professor'
    });
    console.log(`Designation: 'Senior Professor' -> Count: ${seniorProfResults.length}`);
    if (seniorProfResults.length === 6) console.log('✓ CORRECT (6)');
    else console.error(`❌ WRONG (Expected 6, got ${seniorProfResults.length})`);

    // Test formatting check
    console.log('\nVerifying no overlap:');
    const overlap = profResults.filter(p => p.designation.toLowerCase().includes('senior'));
    if (overlap.length === 0) console.log('✓ "Professor" results do not contain "Senior Professor"');
    else console.log('❌ overlap found!');
}

testProfessorSearch();
