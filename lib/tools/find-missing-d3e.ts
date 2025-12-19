// Debug script to identify missing D3E staff
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

async function findMissingStaff() {
    const baseUrl = 'https://www2.utar.edu.my';
    const searchParams = new URLSearchParams();
    searchParams.set('searchDept', 'LKC FES');
    searchParams.set('searchDiv', '97');
    searchParams.set('searchName', '');
    searchParams.set('searchExpertise', '');
    searchParams.set('submit', 'Search');
    searchParams.set('searchResult', 'Y');

    const url = `${baseUrl}/staffListSearchV2.jsp?${searchParams.toString()}`;

    console.log('=== Finding Missing D3E Staff ===\n');

    // Get all searchIds from UTAR website
    const allSearchIds: string[] = [];

    for (let page = 1; page <= 2; page++) {
        const pageUrl = page === 1 ? url : `${url}&iPage=${page}`;
        console.log(`Fetching page ${page}...`);
        const html = await httpsGet(pageUrl);
        const $ = cheerio.load(html);
        const tables = $('table[onclick*="staffListDetailV2.jsp"]');

        tables.each((_, table) => {
            const onclick = $(table).attr('onclick') || '';
            const match = onclick.match(/staffListDetailV2\.jsp\?searchId=([A-Z0-9]+)/i);
            if (match) allSearchIds.push(match[1]);
        });

        console.log(`  Found ${tables.length} staff on page ${page}`);
    }

    console.log(`\nTotal searchIds from UTAR: ${allSearchIds.length}`);
    console.log(`SearchIds: ${allSearchIds.join(', ')}\n`);

    // Load staff directory JSON
    const fs = require('fs');
    const jsonPath = './lib/tools/staff_directory.json';
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const d3eStaff = data.faculties['LKC FES'].departments.D3E.staff;
    const jsonSearchIds = d3eStaff.map((s: any) => s.searchId);

    console.log(`Total in JSON: ${jsonSearchIds.length}`);
    console.log(`JSON SearchIds: ${jsonSearchIds.join(', ')}\n`);

    // Find missing
    const missing = allSearchIds.filter(id => !jsonSearchIds.includes(id));

    if (missing.length > 0) {
        console.log(`\n❌ MISSING ${missing.length} STAFF:`);
        missing.forEach(id => console.log(`  - ${id}`));
    } else {
        console.log('\n✅ No missing staff!');
    }
}

findMissingStaff().catch(console.error);
