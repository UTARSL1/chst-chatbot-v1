import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

// Use direct connection for bulk operations to avoid Supabase pooler timeouts
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DIRECT_URL || process.env.DATABASE_URL
        }
    }
});


async function importCompleteJCR2025() {
    const csvPath = path.join(process.cwd(), 'data', 'jcr', '2025', '2025 JCR_complete.csv');

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ CSV file not found: ${csvPath}`);
        process.exit(1);
    }

    console.log(`📂 Reading ${csvPath}...`);
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    console.log(`📝 Parsing CSV...`);
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true
    }) as Record<string, string>[];

    console.log(`📊 Parsed ${records.length} rows`);
    console.log(`🔄 Starting import for JCR 2025 (complete)...\n`);

    let existingComplete = 0; // Initialize existingComplete outside the try block

    try {
        console.log(`🔌 Connecting to database...`);
        await prisma.$connect();
        console.log(`✅ Database connected`);

        // Check if we already have complete data
        console.log(`🔍 Checking for existing complete data...`);
        existingComplete = await prisma.jcrJournalMetric.count({
            where: {
                jifYear: 2025,
                source: 'JCR_complete'
            }
        });
        console.log(`📊 Found ${existingComplete} existing complete records`);
    } catch (error) {
        console.error(`❌ Database error during initial check:`, error);
        throw error;
    }

    if (existingComplete > 0) {
        console.log(`⚠️  Found ${existingComplete} existing JCR_complete records. Deleting them first...`);
        await prisma.jcrJournalMetric.deleteMany({
            where: {
                jifYear: 2025,
                source: 'JCR_complete'
            }
        });
        console.log(`✅ Cleared existing JCR_complete data\n`);
    }

    // Prepare data for insertion
    const dataToInsert = [];
    let errorCount = 0;

    for (const row of records) {
        const journalName = row['Journal Name'];
        if (!journalName) {
            errorCount++;
            continue;
        }

        const normalizedTitle = journalName.toLowerCase().trim().replace(/\s+/g, ' ');

        const parseNum = (s: string | null) => {
            if (!s || s === 'N/A' || s === '' || s === '-') return null;
            const clean = s.replace(/,/g, '').replace(/%/g, '');
            const val = parseFloat(clean);
            return isNaN(val) ? null : val;
        };

        // Extract quartile from "JIF Quartile" field (e.g., "Q1" or "Q1|Q2")
        const quartileField = row['JIF Quartile'] || '';
        let quartile = 'N/A';
        if (quartileField.includes('Q1')) quartile = 'Q1';
        else if (quartileField.includes('Q2')) quartile = 'Q2';
        else if (quartileField.includes('Q3')) quartile = 'Q3';
        else if (quartileField.includes('Q4')) quartile = 'Q4';

        dataToInsert.push({
            fullTitle: journalName,
            normalizedTitle,
            issnPrint: (row['ISSN'] && row['ISSN'] !== 'N/A' && row['ISSN'] !== '-') ? row['ISSN'] : null,
            issnElectronic: (row['eISSN'] && row['eISSN'] !== 'N/A' && row['eISSN'] !== '-') ? row['eISSN'] : null,
            category: row['Category'] || 'Unknown',
            edition: null, // Not present in this format
            jifYear: 2025,
            jifValue: parseNum(row['JIF']),
            jifQuartile: quartile,
            jciValue: parseNum(row['JCI']),
            percentCitableOa: null, // Not present in this format
            source: 'JCR_complete'
        });
    }

    // Batch Insert
    console.log(`🚀 Bulk inserting ${dataToInsert.length} records...`);
    const INSERT_BATCH_SIZE = 200;
    let successCount = 0;

    for (let i = 0; i < dataToInsert.length; i += INSERT_BATCH_SIZE) {
        const batch = dataToInsert.slice(i, i + INSERT_BATCH_SIZE);
        await prisma.jcrJournalMetric.createMany({
            data: batch
        });
        successCount += batch.length;
        process.stdout.write(`\r✅ Inserted ${successCount}/${dataToInsert.length} records`);
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`\n\n✅ Import complete for JCR 2025 (complete)!`);
    console.log(`   Success: ${successCount} records`);
    console.log(`   Errors: ${errorCount} records`);

    // Show final counts
    const completeCount = await prisma.jcrJournalMetric.count({
        where: {
            jifYear: 2025,
            source: 'JCR_complete'
        }
    });

    const incompleteCount = await prisma.jcrJournalMetric.count({
        where: {
            jifYear: 2025,
            source: 'JCR_incomplete'
        }
    });

    console.log(`\n📊 Final JCR 2025 counts:`);
    console.log(`   - JCR_complete: ${completeCount} records`);
    console.log(`   - JCR_incomplete: ${incompleteCount} records`);
}

async function main() {
    try {
        await importCompleteJCR2025();
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
