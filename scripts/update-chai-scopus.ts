import fs from 'fs';

const data = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

// Find and update Chai Tong Yuen
const chai = data.results.find((r: any) => r.email === 'chaity@utar.edu.my');

if (chai) {
    console.log('Found Ts Dr Chai Tong Yuen');
    console.log(`  Current Scopus ID: ${chai.scopusAuthorId}`);
    console.log(`  Current Status: ${chai.scopusStatus || 'N/A'}`);

    chai.scopusAuthorId = '40661042200';
    chai.scopusStatus = 'Available';

    // Note: Publications were already scraped in the CSV batch, so we keep them
    console.log(`  Updated Scopus ID: ${chai.scopusAuthorId}`);
    console.log(`  Updated Status: ${chai.scopusStatus}`);
    console.log(`  Publications: ${chai.totalPublications}`);

    data.metadata.lastUpdated = new Date().toISOString();

    fs.writeFileSync('lkcfes-scopus-publications.json', JSON.stringify(data, null, 2), 'utf-8');

    console.log('\n✅ Updated successfully!');
} else {
    console.log('❌ Chai Tong Yuen not found');
}
