const cheerio = require('cheerio');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function testParam(deptValue) {
    const url = `https://www2.utar.edu.my/staffListSearchV2.jsp?searchDept=${encodeURIComponent(deptValue)}&searchDiv=All&searchName=&searchExpertise=&searchResult=Y`;
    console.log(`Testing searchDept='${deptValue}'...`);

    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        // Check if we found Lim Eng Hock
        const found = $('body').text().includes('Lim Eng Hock');
        console.log(`Result for '${deptValue}': ${found ? "FOUND STAFF" : "NO RESULTS"}`);

    } catch (err) {
        console.error("Error:", err);
    }
}

async function runTests() {
    await testParam("CCSN");
    await testParam("Centre for Communicaton Systems and Networks"); // Copy exact typo from HTML line 158 if exists
    await testParam("Centre for Communication Systems and Networks"); // Correct spelling
}

runTests();
