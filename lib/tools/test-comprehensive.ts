// Comprehensive test for lookup table integration
import { searchStaff } from './index';

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Staff Directory Lookup Table - Comprehensive Test Suite  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const tests = [];
    let passedTests = 0;
    let totalDuration = 0;

    // Test 1: Search by department acronym (D3E)
    console.log('📋 Test 1: Search D3E Department');
    const start1 = Date.now();
    try {
        const results = await searchStaff({ acronym: 'D3E' });
        const duration = Date.now() - start1;
        totalDuration += duration;

        console.log(`   ✓ Found: ${results.length} staff`);
        console.log(`   ✓ Duration: ${duration}ms`);
        console.log(`   ✓ Sample: ${results.slice(0, 3).map(s => s.name).join(', ')}`);

        if (results.length === 38 && duration < 1000) {
            console.log('   ✅ PASS\n');
            passedTests++;
        } else {
            console.log(`   ❌ FAIL: Expected 38 staff in <1s, got ${results.length} in ${duration}ms\n`);
        }
    } catch (error: any) {
        console.log(`   ❌ ERROR: ${error.message}\n`);
    }

    // Test 2: Search by faculty acronym (LKC FES)
    console.log('📋 Test 2: Search LKC FES Faculty');
    const start2 = Date.now();
    try {
        const results = await searchStaff({ acronym: 'LKC FES' });
        const duration = Date.now() - start2;
        totalDuration += duration;

        console.log(`   ✓ Found: ${results.length} staff`);
        console.log(`   ✓ Duration: ${duration}ms`);
        console.log(`   ✓ Unique departments: ${new Set(results.map(s => s.department)).size}`);

        if (results.length === 278 && duration < 1000) {
            console.log('   ✅ PASS\n');
            passedTests++;
        } else {
            console.log(`   ❌ FAIL: Expected 278 staff in <1s, got ${results.length} in ${duration}ms\n`);
        }
    } catch (error: any) {
        console.log(`   ❌ ERROR: ${error.message}\n`);
    }

    // Test 3: Search by name (fuzzy search)
    console.log('📋 Test 3: Search by Name "Wong"');
    const start3 = Date.now();
    try {
        const results = await searchStaff({ faculty: 'LKC FES', name: 'Wong' });
        const duration = Date.now() - start3;
        totalDuration += duration;

        console.log(`   ✓ Found: ${results.length} staff`);
        console.log(`   ✓ Duration: ${duration}ms`);
        console.log(`   ✓ Names: ${results.map(s => s.name).join(', ')}`);

        if (results.length > 0 && duration < 1000) {
            console.log('   ✅ PASS\n');
            passedTests++;
        } else {
            console.log(`   ❌ FAIL: Expected results in <1s\n`);
        }
    } catch (error: any) {
        console.log(`   ❌ ERROR: ${error.message}\n`);
    }

    // Test 4: Search by role (Dean)
    console.log('📋 Test 4: Search for "Dean"');
    const start4 = Date.now();
    try {
        const results = await searchStaff({ faculty: 'LKC FES', role: 'Dean' });
        const duration = Date.now() - start4;
        totalDuration += duration;

        console.log(`   ✓ Found: ${results.length} staff`);
        console.log(`   ✓ Duration: ${duration}ms`);
        if (results.length > 0) {
            console.log(`   ✓ Dean: ${results[0].name}`);
            console.log(`   ✓ Position: ${results[0].position}`);
        }

        if (results.length > 0 && duration < 1000) {
            console.log('   ✅ PASS\n');
            passedTests++;
        } else {
            console.log(`   ❌ FAIL: Expected Dean in <1s\n`);
        }
    } catch (error: any) {
        console.log(`   ❌ ERROR: ${error.message}\n`);
    }

    // Test 5: Search by expertise
    console.log('📋 Test 5: Search Expertise "Machine Learning"');
    const start5 = Date.now();
    try {
        const results = await searchStaff({ faculty: 'LKC FES', expertise: 'Machine Learning' });
        const duration = Date.now() - start5;
        totalDuration += duration;

        console.log(`   ✓ Found: ${results.length} staff`);
        console.log(`   ✓ Duration: ${duration}ms`);
        console.log(`   ✓ Sample: ${results.slice(0, 3).map(s => s.name).join(', ')}`);

        if (results.length > 0 && duration < 1000) {
            console.log('   ✅ PASS\n');
            passedTests++;
        } else {
            console.log(`   ❌ FAIL: Expected results in <1s\n`);
        }
    } catch (error: any) {
        console.log(`   ❌ ERROR: ${error.message}\n`);
    }

    // Test 6: Search specific department (DMBE)
    console.log('📋 Test 6: Search DMBE Department');
    const start6 = Date.now();
    try {
        const results = await searchStaff({ acronym: 'DMBE' });
        const duration = Date.now() - start6;
        totalDuration += duration;

        console.log(`   ✓ Found: ${results.length} staff`);
        console.log(`   ✓ Duration: ${duration}ms`);

        if (results.length === 18 && duration < 1000) {
            console.log('   ✅ PASS\n');
            passedTests++;
        } else {
            console.log(`   ❌ FAIL: Expected 18 staff in <1s, got ${results.length} in ${duration}ms\n`);
        }
    } catch (error: any) {
        console.log(`   ❌ ERROR: ${error.message}\n`);
    }

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                      Test Summary                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n✅ Passed: ${passedTests}/6 tests`);
    console.log(`⏱️  Average Duration: ${(totalDuration / 6).toFixed(2)}ms`);
    console.log(`🚀 Performance: ${totalDuration < 600 ? 'EXCELLENT' : totalDuration < 3000 ? 'GOOD' : 'NEEDS IMPROVEMENT'}`);
    console.log(`\n📊 Expected Performance: <100ms per query`);
    console.log(`📊 Baseline (live scraping): 20,000-30,000ms per query`);
    console.log(`📊 Speedup: ~${Math.round(25000 / (totalDuration / 6))}x faster\n`);

    if (passedTests === 6) {
        console.log('🎉 ALL TESTS PASSED! Lookup table is working perfectly!\n');
    } else {
        console.log(`⚠️  ${6 - passedTests} test(s) failed. Please review.\n`);
    }
}

runTests().catch(console.error);
