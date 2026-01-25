/**
 * Test script to verify Scopus publication details API
 */

// Make this a module
export { };

const TEST_AG_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const TEST_AG_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';

async function testScopusAPI() {
    // Test with a known author ID from DMBE
    const testAuthorId = '37012425700'; // Ir. Prof. Dr. Chee Pei Song
    const testYears = [2023, 2024, 2025];

    const yearQuery = `AND (${testYears.map(y => `PUBYEAR IS ${y}`).join(' OR ')})`;
    const query = `AU-ID(${testAuthorId}) ${yearQuery}`;

    const url = new URL(TEST_AG_ENDPOINT);
    url.searchParams.append('query', query);
    url.searchParams.append('apiKey', TEST_AG_API_KEY);
    url.searchParams.append('count', '10');
    url.searchParams.append('start', '0');
    url.searchParams.append('httpAccept', 'application/json');
    url.searchParams.append('field', 'dc:identifier,eid,doi,dc:title,dc:creator,author,prism:publicationName,prism:coverDate,citedby-count');

    console.log('Testing Scopus API...');
    console.log('URL:', url.toString());
    console.log('');

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        console.log('Response Status:', response.status);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
        console.log('');

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error Response:', errorText);
            return;
        }

        const data = await response.json();
        console.log('Total Results:', data['search-results']?.['opensearch:totalResults']);
        console.log('');

        const entries = data['search-results']?.entry || [];
        console.log(`Found ${entries.length} publications`);
        console.log('');

        if (entries.length > 0) {
            console.log('First publication:');
            console.log(JSON.stringify(entries[0], null, 2));
        } else {
            console.log('No publications found!');
            console.log('Full response:');
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testScopusAPI();
