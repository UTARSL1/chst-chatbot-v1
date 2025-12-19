// Test lookup table search
import { searchStaff } from './index';

async function testLookupSearch() {
    console.log('=== Testing Lookup Table Search ===\n');

    // Test 1: Search by faculty
    console.log('Test 1: Search D3E department');
    const startTime1 = Date.now();
    const d3eStaff = await searchStaff({ acronym: 'D3E' });
    const duration1 = Date.now() - startTime1;
    console.log(`  Found: ${d3eStaff.length} staff`);
    console.log(`  Duration: ${duration1}ms`);
    console.log(`  Sample: ${d3eStaff.slice(0, 3).map((s: any) => s.name).join(', ')}\n`);

    // Test 2: Search by name
    console.log('Test 2: Search by name "Wong"');
    const startTime2 = Date.now();
    const wongStaff = await searchStaff({ faculty: 'LKC FES', name: 'Wong' });
    const duration2 = Date.now() - startTime2;
    console.log(`  Found: ${wongStaff.length} staff`);
    console.log(`  Duration: ${duration2}ms`);
    console.log(`  Names: ${wongStaff.map((s: any) => s.name).join(', ')}\n`);

    // Test 3: Search by role
    console.log('Test 3: Search for "Dean"');
    const startTime3 = Date.now();
    const deanStaff = await searchStaff({ faculty: 'LKC FES', role: 'Dean' });
    const duration3 = Date.now() - startTime3;
    console.log(`  Found: ${deanStaff.length} staff`);
    console.log(`  Duration: ${duration3}ms`);
    if (deanStaff.length > 0) {
        console.log(`  Dean: ${deanStaff[0].name} - ${deanStaff[0].position}\n`);
    }

    // Test 4: Search by expertise
    console.log('Test 4: Search expertise "Machine Learning"');
    const startTime4 = Date.now();
    const mlStaff = await searchStaff({ faculty: 'LKC FES', expertise: 'Machine Learning' });
    const duration4 = Date.now() - startTime4;
    console.log(`  Found: ${mlStaff.length} staff`);
    console.log(`  Duration: ${duration4}ms`);
    console.log(`  Sample: ${mlStaff.slice(0, 3).map((s: any) => s.name).join(', ')}\n`);

    console.log('=== Performance Summary ===');
    console.log(`Average query time: ${(duration1 + duration2 + duration3 + duration4) / 4}ms`);
    console.log('Expected: < 100ms (vs 20,000-30,000ms for live scraping)');
}

testLookupSearch().catch(console.error);
