// Check if DCL, DLMSA, FGO have staff on UTAR website
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

async function checkEmptyDepartments() {
    const baseUrl = 'https://www2.utar.edu.my';

    const departments = [
        { name: 'DCL (Chemical Engineering)', id: '3352' },
        { name: 'DLMSA (Lab Management)', id: '3353' },
        { name: 'FGO (Faculty General Office)', id: '3354' }
    ];

    console.log('=== Checking Empty Departments ===\n');

    for (const dept of departments) {
        const searchParams = new URLSearchParams();
        searchParams.set('searchDept', 'LKC FES');
        searchParams.set('searchDiv', dept.id);
        searchParams.set('searchName', '');
        searchParams.set('searchExpertise', '');
        searchParams.set('submit', 'Search');
        searchParams.set('searchResult', 'Y');

        const url = `${baseUrl}/staffListSearchV2.jsp?${searchParams.toString()}`;

        console.log(`\n${dept.name} (ID: ${dept.id})`);
        console.log(`URL: ${url}`);

        try {
            const html = await httpsGet(url);
            const $ = cheerio.load(html);
            const staffTables = $('table[onclick*="staffListDetailV2.jsp"]');

            console.log(`  Staff found: ${staffTables.length}`);

            if (staffTables.length > 0) {
                console.log('  SearchIds:');
                staffTables.each((i, table) => {
                    const onclick = $(table).attr('onclick') || '';
                    const match = onclick.match(/staffListDetailV2\.jsp\?searchId=([A-Z0-9]+)/i);
                    if (match) {
                        console.log(`    - ${match[1]}`);
                    }
                });
            } else {
                console.log('  ❌ No staff found on UTAR website');
            }
        } catch (error: any) {
            console.log(`  Error: ${error.message}`);
        }
    }
}

checkEmptyDepartments().catch(console.error);
