
// Native fetch used


const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const AUTHOR_ID = '35366710400'; // Dr. Steven Lim

async function testSearchCitations() {
    console.log(`Testing Search API for citation data: Author ID ${AUTHOR_ID}`);
    const query = `AU-ID(${AUTHOR_ID})`;
    const url = `https://api.elsevier.com/content/search/scopus?query=${encodeURIComponent(query)}&apiKey=${SCOPUS_API_KEY}&httpAccept=application/json&count=25&sort=citedby-count`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log(`Search Failed: ${response.status} ${await response.text()}`);
            return;
        }

        const data = await response.json();
        const entries = data['search-results']['entry'];
        if (entries) {
            console.log(`Entries returned: ${entries.length}`);
            if (entries.length > 0) {
                console.log('Top Cited Paper:', entries[0]['dc:title'], 'Citations:', entries[0]['citedby-count']);
                console.log('Last Paper:', entries[entries.length - 1]['dc:title'], 'Citations:', entries[entries.length - 1]['citedby-count']);

                // Calc H-index
                let hIndex = 0;
                entries.forEach((entry: any, index: number) => {
                    const rank = index + 1;
                    const citations = parseInt(entry['citedby-count'] || '0');
                    if (citations >= rank) {
                        hIndex = rank;
                    }
                });
                console.log('Calculated H-Index (from this batch):', hIndex);
            }
        } else {
            console.log('No entries found.');
        }

    } catch (e) {
        console.error(e);
    }
}

testSearchCitations();
