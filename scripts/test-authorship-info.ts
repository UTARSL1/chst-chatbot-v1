/**
 * Test script to check what authorship information Scopus API provides
 */

const fs = require('fs');
const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';

async function testAuthorshipInfo() {
    const testAuthorId = '37012425700';
    const query = `AU-ID(${testAuthorId}) AND PUBYEAR IS 2024`;

    const url = new URL(SCOPUS_SEARCH_ENDPOINT);
    url.searchParams.append('query', query);
    url.searchParams.append('apiKey', SCOPUS_API_KEY);
    url.searchParams.append('count', '1');
    url.searchParams.append('start', '0');
    url.searchParams.append('httpAccept', 'application/json');
    url.searchParams.append('field', 'dc:identifier,dc:title,author,dc:creator');

    console.log('Fetching authorship data...');

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            console.error('Error:', response.status);
            return;
        }

        const data = await response.json();
        const entries = data['search-results']?.entry || [];

        if (entries.length === 0) {
            console.log('No publications found');
            return;
        }

        const pub = entries[0];

        // Save full response to file
        fs.writeFileSync('scopus-author-test.json', JSON.stringify(pub, null, 2));
        console.log('✓ Saved full response to scopus-author-test.json');

        console.log('\n=== SUMMARY ===');
        console.log('Title:', pub['dc:title']);
        console.log('First Author (dc:creator):', pub['dc:creator']);
        console.log('Total Authors:', pub['author']?.length || 0);

        if (pub['author'] && pub['author'].length > 0) {
            console.log('\n=== AUTHOR FIELDS AVAILABLE ===');
            const firstAuthor = pub['author'][0];
            console.log('Fields in author object:', Object.keys(firstAuthor));

            // Check for corresponding author indicator
            const hasCorresponding = pub['author'].some((a: any) =>
                a['@corresponding'] || a['corresponding']
            );
            console.log('Has corresponding author marker:', hasCorresponding);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testAuthorshipInfo();
