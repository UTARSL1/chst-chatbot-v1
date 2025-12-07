const cheerio = require('cheerio');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function testSearch() {
    const url = "https://www2.utar.edu.my/staffListSearchV2.jsp?searchDept=CCSN&searchDiv=All&searchName=&searchExpertise=&searchResult=Y";
    console.log(`Fetching ${url}`);

    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        let targetTableHtml = "";

        // Select leaf tables only to avoid duplication
        $('table:not(:has(table))').each((_, table) => {
            const tableText = $(table).text();
            if (tableText.includes('Lim Eng Hock')) {
                targetTableHtml = $.html(table);

                // Check parsing
                const name = $(table).find('b').first().text().trim();
                const position = $(table).find('i').first().text().trim(); // Is it always <i>?

                const emailEl = $(table).find('a[href*="mailto"]'); // Loose match
                const emailHref = emailEl.attr('href');
                const emailText = emailEl.text();

                console.log("--- Extraction Test ---");
                console.log("Name:", name);
                console.log("Position (from <i>):", position);
                console.log("Email Href:", emailHref);
                console.log("Email Text:", emailText);
                console.log("Full Text:", tableText.replace(/\s+/g, ' '));
            }
        });

        if (targetTableHtml) {
            fs.writeFileSync('debug_html.txt', targetTableHtml);
            console.log("Wrote debug HTML to debug_html.txt");
        } else {
            console.log("Could not find table with Lim Eng Hock");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

testSearch();
