// Test scraping adjunct staff detail
import https from 'https';
import * as cheerio from 'cheerio';

function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, { rejectUnauthorized: false }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function testAdjunctStaff() {
    const baseUrl = 'https://www2.utar.edu.my';
    const searchIds = ['AP25009', 'AP24003', 'AP24009'];

    for (const searchId of searchIds) {
        console.log(`\n=== Testing ${searchId} ===`);
        const detailUrl = `${baseUrl}/staffListDetailV2.jsp?searchId=${searchId}`;
        console.log(`URL: ${detailUrl}`);

        try {
            const html = await httpsGet(detailUrl);
            const $ = cheerio.load(html);

            let name = "";
            let email = "";

            $('tr').each((_, row) => {
                const label = $(row).find('td').first().text().trim();
                const valueText = $(row).find('td').last().text().trim();

                if (label.includes('Name')) name = valueText.replace(/^:\s*/, '');
                if (label.includes('Email')) email = valueText.replace(/^:\s*/, '');
            });

            console.log(`  Name: "${name}"`);
            console.log(`  Email: "${email}"`);
            console.log(`  Valid: ${!!(name && email)}`);

        } catch (error: any) {
            console.log(`  Error: ${error.message}`);
        }
    }
}

testAdjunctStaff().catch(console.error);
