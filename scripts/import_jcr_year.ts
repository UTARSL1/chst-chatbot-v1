import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function importJCR(year: number) {
    const csvPath = path.join(process.cwd(), 'data', 'jcr', year.toString(), `JCR_${year}.csv`);

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ CSV file not found: ${csvPath}`);
        process.exit(1);
    }

    console.log(`📂 Reading ${csvPath}...`);
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split(/\r?\n/);

    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Journal name') && (lines[i].includes('ISSN') || lines[i].includes('Total Citations'))) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
        console.error('❌ Could not find header row');
        process.exit(1);
    }

    console.log(`✅ Found header at line ${headerIndex + 1}`);
    let csvData = lines.slice(headerIndex).join('\n');

    // Sanitize CSV
    csvData = csvData.replace(/"%,$/gm, '"');
    csvData = csvData.replace(/"%,/g, '",');
    csvData = csvData.replace(/"%[\r\n]/g, '"\n');

    const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true
    }) as Record<string, string>[];

    console.log(`📊 Parsed ${records.length} rows`);
    console.log(`🔄 Starting import for year ${year}...\n`);

    // 1. Delete existing records for this year
    console.log(`🗑️  Deleting existing records for year ${year}...`);
    await prisma.jcrJournalMetric.deleteMany({
        where: { jifYear: year }
    });
    console.log(`✅ Cleared existing ${year} data`);

    // 2. Prepare all data objects
    const dataToInsert = [];
    let errorCount = 0; // Initialize errorCount for potential future use or if parsing fails
    for (const row of records) {
        const keys = Object.keys(row);
        const jifColName = keys.find(k => k.includes('JIF') && !k.includes('Quartile') && !k.includes('Percentile'));
        const jciColName = keys.find(k => k.includes('JCI') && !k.includes('Percentile'));

        const journalName = row['Journal name'] || row['Full Journal Title'];
        if (!journalName) {
            errorCount++;
            continue; // Skip rows without a journal name
        }

        const normalizedTitle = journalName.toLowerCase().trim().replace(/\s+/g, ' ');

        const parseNum = (s: string | null) => {
            if (!s || s === 'N/A' || s === '') return null;
            const clean = s.replace(/,/g, '').replace(/%/g, '');
            const val = parseFloat(clean);
            return isNaN(val) ? null : val;
        };

        dataToInsert.push({
            fullTitle: journalName,
            normalizedTitle,
            issnPrint: (row['ISSN'] && row['ISSN'] !== 'N/A') ? row['ISSN'] : null,
            issnElectronic: (row['eISSN'] && row['eISSN'] !== 'N/A') ? row['eISSN'] : null,
            category: row['Category'] || 'Unknown',
            edition: row['Edition'] || null,
            jifYear: year,
            jifValue: parseNum(jifColName ? row[jifColName] : null),
            jifQuartile: row['JIF Quartile'] || 'N/A',
            jciValue: parseNum(jciColName ? row[jciColName] : null),
            percentCitableOa: parseNum(row['% of Citable OA']),
            source: 'JCR'
        });
    }

    // 3. Batch Insert
    console.log(`🚀 Bulk inserting ${dataToInsert.length} records...`);
    const INSERT_BATCH_SIZE = 200; // Reduced from 1000
    let successCount = 0;

    for (let i = 0; i < dataToInsert.length; i += INSERT_BATCH_SIZE) {
        const batch = dataToInsert.slice(i, i + INSERT_BATCH_SIZE);
        await prisma.jcrJournalMetric.createMany({
            data: batch
        });
        successCount += batch.length;
        process.stdout.write(`\r✅ Inserted ${successCount}/${dataToInsert.length} records`);
        // Add small delay to let connection pool breathe
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`\n\n✅ Import complete for JCR ${year}!`);
    console.log(`   Success: ${successCount} records`);
    console.log(`   Errors: ${errorCount} records`);
}

async function main() {
    const year = parseInt(process.argv[2] || '2022');
    console.log(`\n🚀 Starting JCR ${year} import...\n`);

    try {
        await importJCR(year);
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
