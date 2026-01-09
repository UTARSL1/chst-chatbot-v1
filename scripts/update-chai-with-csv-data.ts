import fs from 'fs';

const mainData = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));
const csvData = JSON.parse(fs.readFileSync('lkcfes-71-staff-results.json', 'utf-8'));

// Find Chai in both files
const chaiMain = mainData.results.find((r: any) => r.email === 'chaity@utar.edu.my');
const chaiCsv = csvData.results.find((r: any) => r.name === 'Ts Dr Chai Tong Yuen');

if (chaiMain && chaiCsv) {
    console.log('Updating Chai Tong Yuen with CSV data:');
    console.log(`  Current publications: ${chaiMain.totalPublications}`);
    console.log(`  CSV publications: ${chaiCsv.totalPublications}`);

    // Update with CSV data
    chaiMain.scopusAuthorId = chaiCsv.scopusAuthorId;
    chaiMain.scopusStatus = 'Available';
    chaiMain.publications = chaiCsv.publications;
    chaiMain.totalPublications = chaiCsv.totalPublications;

    console.log(`  Updated publications: ${chaiMain.totalPublications}`);
    console.log(`    2023: ${chaiMain.publications.find((p: any) => p.year === 2023)?.count}`);
    console.log(`    2024: ${chaiMain.publications.find((p: any) => p.year === 2024)?.count}`);
    console.log(`    2025: ${chaiMain.publications.find((p: any) => p.year === 2025)?.count}`);

    // Recalculate statistics
    const availableStaff = mainData.results.filter((r: any) => r.scopusStatus !== 'Not Available');

    const calc2023 = availableStaff.reduce((sum: number, r: any) => {
        const pub = r.publications?.find((p: any) => p.year === 2023);
        return sum + (pub?.count || 0);
    }, 0);

    const calc2024 = availableStaff.reduce((sum: number, r: any) => {
        const pub = r.publications?.find((p: any) => p.year === 2024);
        return sum + (pub?.count || 0);
    }, 0);

    const calc2025 = availableStaff.reduce((sum: number, r: any) => {
        const pub = r.publications?.find((p: any) => p.year === 2025);
        return sum + (pub?.count || 0);
    }, 0);

    const totalPubs = calc2023 + calc2024 + calc2025;
    const avgPerStaff = availableStaff.length > 0 ? totalPubs / availableStaff.length : 0;

    mainData.metadata.statistics = {
        publications2023: calc2023,
        publications2024: calc2024,
        publications2025: calc2025,
        totalPublications: totalPubs,
        averagePerStaff: parseFloat(avgPerStaff.toFixed(2)),
    };

    mainData.metadata.lastUpdated = new Date().toISOString();

    fs.writeFileSync('lkcfes-scopus-publications.json', JSON.stringify(mainData, null, 2), 'utf-8');

    console.log('\n✅ Updated successfully!');
    console.log(`\nNew totals:`);
    console.log(`  2023: ${calc2023}`);
    console.log(`  2024: ${calc2024}`);
    console.log(`  2025: ${calc2025}`);
    console.log(`  Total: ${totalPubs}`);
} else {
    console.log('❌ Could not find Chai in one or both files');
}
