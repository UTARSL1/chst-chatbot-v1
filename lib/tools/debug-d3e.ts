// Debug script to check D3E pagination with cheerio
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

async function checkD3EPagination() {
    const baseUrl = 'https://www2.utar.edu.my';
    const searchParams = new URLSearchParams();
    searchParams.set('searchDept', 'LKC FES');
    searchParams.set('searchDiv', '97'); // D3E department ID
    searchParams.set('searchName', '');
    searchParams.set('searchExpertise', '');
    searchParams.set('submit', 'Search');
    searchParams.set('searchResult', 'Y');

    const url = `${baseUrl}/staffListSearchV2.jsp?${searchParams.toString()}`;

    console.log('=== D3E Pagination Debug ===\n');
    console.log(`URL: ${url}\n`);

    // Check page 1
    console.log('Fetching Page 1...');
    const page1Html = await httpsGet(url);
    const $1 = cheerio.load(page1Html);
    const page1Tables = $1('table[onclick*="staffListDetailV2.jsp"]');
    console.log(`Page 1: Found ${page1Tables.length} staff cards`);
    console.log(`Page 1 contains "iPage=2": ${page1Html.includes('iPage=2')}`);

    // Extract searchIds from page 1
    const page1Ids: string[] = [];
    page1Tables.each((_, table) => {
        const onclick = $1(table).attr('onclick') || '';
        const match = onclick.match(/staffListDetailV2\.jsp\?searchId=([A-Z0-9]+)/i);
        if (match) page1Ids.push(match[1]);
    });
    console.log(`Page 1 searchIds: ${page1Ids.slice(0, 5).join(', ')}... (showing first 5)`);

    // Check page 2
    const page2Url = `${url}&iPage=2`;
    console.log(`\nFetching Page 2: ${page2Url}`);
    const page2Html = await httpsGet(page2Url);
    const $2 = cheerio.load(page2Html);
    const page2Tables = $2('table[onclick*="staffListDetailV2.jsp"]');
    console.log(`Page 2: Found ${page2Tables.length} staff cards`);
    console.log(`Page 2 contains "iPage=3": ${page2Html.includes('iPage=3')}`);

    // Extract searchIds from page 2
    const page2Ids: string[] = [];
    page2Tables.each((_, table) => {
        const onclick = $2(table).attr('onclick') || '';
        const match = onclick.match(/staffListDetailV2\.jsp\?searchId=([A-Z0-9]+)/i);
        if (match) page2Ids.push(match[1]);
    });
    if (page2Ids.length > 0) {
        console.log(`Page 2 searchIds: ${page2Ids.join(', ')}`);
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total staff cards: ${page1Tables.length + page2Tables.length}`);
    console.log(`Page 1: ${page1Tables.length}, Page 2: ${page2Tables.length}`);
}

checkD3EPagination().catch(console.error);
