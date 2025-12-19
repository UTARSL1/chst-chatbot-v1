// Test h-index scraping on a single staff member
import https from 'https';

// Copy of scrapeHIndex function for testing
async function scrapeHIndex(googleScholarUrl: string): Promise<number | null> {
    if (!googleScholarUrl) return null;

    try {
        console.log(`Scraping h-index from: ${googleScholarUrl}`);

        const html = await new Promise<string>((resolve, reject) => {
            https.get(googleScholarUrl, { rejectUnauthorized: false }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });

        // Pattern: ">h-index</a></td><td class="gsc_rsb_std">28</td>
        const regex = /h-index<\/a><\/td><td class="gsc_rsb_std">(\d+)<\/td>/g;
        const matches = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            matches.push(parseInt(match[1]));
        }

        console.log(`Found ${matches.length} h-index values:`, matches);

        if (matches.length >= 2) {
            // Second match is "since 2020" (last 5 years)
            const hIndex = matches[1];
            console.log(`✓ h-index (last 5 years): ${hIndex}`);
            return hIndex;
        } else if (matches.length === 1) {
            console.log(`✓ h-index: ${matches[0]} (only one value found)`);
            return matches[0];
        }

        console.log('✗ No h-index found');
        return null;
    } catch (error: any) {
        console.error(`✗ Failed to scrape: ${error.message}`);
        return null;
    }
}

// Test with a known Google Scholar URL
const testUrl = 'https://scholar.google.com/citations?user=M3PvUXcAAAAJ&hl=en'; // Dr Goh Choon Hian

console.log('=== Testing H-Index Scraping ===\n');
scrapeHIndex(testUrl).then(hIndex => {
    console.log(`\nFinal result: ${hIndex !== null ? hIndex : 'null'}`);
    if (hIndex !== null) {
        console.log('\n✅ H-index scraping works!');
    } else {
        console.log('\n❌ H-index scraping failed');
    }
});
