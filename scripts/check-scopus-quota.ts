/**
 * Check Scopus API quota and rate limits
 */

const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';

async function checkAPIQuota() {
    const url = new URL(SCOPUS_SEARCH_ENDPOINT);
    url.searchParams.append('query', 'AU-ID(37012425700)');
    url.searchParams.append('apiKey', SCOPUS_API_KEY);
    url.searchParams.append('count', '1');

    console.log('Checking Scopus API quota and limits...\n');

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        console.log('=== API RESPONSE HEADERS ===\n');

        // Check rate limit headers
        const headers = {
            'X-RateLimit-Limit': response.headers.get('X-RateLimit-Limit'),
            'X-RateLimit-Remaining': response.headers.get('X-RateLimit-Remaining'),
            'X-RateLimit-Reset': response.headers.get('X-RateLimit-Reset'),
            'X-ELS-Status': response.headers.get('X-ELS-Status'),
            'X-ELS-APIKey': response.headers.get('X-ELS-APIKey'),
        };

        console.log('Rate Limit Info:');
        console.log(`  Total Quota: ${headers['X-RateLimit-Limit'] || 'Not specified'}`);
        console.log(`  Remaining: ${headers['X-RateLimit-Remaining'] || 'Not specified'}`);
        console.log(`  Reset Time: ${headers['X-RateLimit-Reset'] || 'Not specified'}`);
        console.log(`  API Status: ${headers['X-ELS-Status'] || 'OK'}`);

        console.log('\n=== COST ANALYSIS ===\n');

        const remaining = parseInt(headers['X-RateLimit-Remaining'] || '0');
        const limit = parseInt(headers['X-RateLimit-Limit'] || '0');

        if (limit > 0) {
            const used = limit - remaining;
            const percentUsed = ((used / limit) * 100).toFixed(1);

            console.log(`Quota Used: ${used} / ${limit} (${percentUsed}%)`);
            console.log(`Quota Remaining: ${remaining} requests`);

            if (limit >= 20000) {
                console.log('\n✅ You have INSTITUTIONAL ACCESS');
                console.log('   - Likely FREE as part of UTAR Scopus subscription');
                console.log('   - Weekly quota: ~20,000 requests');
                console.log('   - No additional cost per API call');
            } else if (limit >= 5000) {
                console.log('\n⚠️  You have DEVELOPER ACCESS');
                console.log('   - May have usage limits');
                console.log('   - Check with Elsevier for pricing');
            } else {
                console.log('\n⚠️  Limited quota detected');
                console.log('   - May be trial or restricted access');
            }
        } else {
            console.log('⚠️  Could not determine quota limits');
            console.log('   This may indicate:');
            console.log('   - Unlimited access (institutional)');
            console.log('   - Or headers not exposed by API');
        }

        console.log('\n=== EXPORT COST ESTIMATE ===\n');
        console.log('Individual Staff Export:');
        console.log('  - API calls: 1 per staff member');
        console.log('  - Time: ~1-2 seconds');
        console.log('  - Cost: FREE (if institutional access)');

        console.log('\nDepartment Export (e.g., DMBE with 15 staff):');
        console.log('  - API calls: 15 (one per staff member)');
        console.log('  - Time: ~12-15 seconds');
        console.log('  - Cost: FREE (if institutional access)');

        console.log('\nFaculty Export (LKC FES with 234 staff):');
        console.log('  - API calls: 234 (one per staff member)');
        console.log('  - Time: ~2-3 minutes');
        console.log('  - Cost: FREE (if institutional access)');
        console.log(`  - Quota impact: ${remaining >= 234 ? '✓ Sufficient' : '✗ Insufficient'} (${remaining} remaining)`);

    } catch (error) {
        console.error('Error:', error);
    }
}

checkAPIQuota();
