import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function importNatureIndex() {
    try {
        console.log('Starting Nature Index import...');

        // Read CSV file
        const csvPath = path.join(process.cwd(), 'data', 'nature_index.csv');
        if (!fs.existsSync(csvPath)) {
            console.error(`❌ CSV file not found: ${csvPath}`);
            return;
        }

        const fileContent = fs.readFileSync(csvPath, 'utf-8');

        // Parse CSV
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        console.log(`Found ${records.length} records in CSV`);

        // Prepare data for insertion
        const institutions = [];
        for (const record of (records as any[])) {
            const institution = record['Institution'] || record['institution'];
            if (!institution) continue;

            const country = record['Country/territory'] || record['Country'] || record['country'] || '';

            // Clean numbers
            const countStr = (record['Count'] || record['count'] || '0').replace(/,/g, '');
            const shareStr = (record['Share'] || record['share'] || '0').replace(/,/g, '');
            const posStr = (record['Position'] || record['position'] || '0').replace(/,/g, '');

            const count = parseInt(countStr);
            // Use string for Decimal to be safe
            const share = parseFloat(shareStr);
            const position = parseInt(posStr);

            institutions.push({
                position: isNaN(position) ? 0 : position,
                institution: institution,
                normalizedName: institution.toLowerCase().trim(),
                country: country,
                count: isNaN(count) ? 0 : count,
                share: isNaN(share) ? 0 : share,
            });
        }

        // Batch insert
        console.log(`Inserting ${institutions.length} records...`);
        const batchSize = 1000;
        let insertedCount = 0;

        for (let i = 0; i < institutions.length; i += batchSize) {
            const batch = institutions.slice(i, i + batchSize);
            try {
                await prisma.natureIndexInstitution.createMany({
                    data: batch,
                    skipDuplicates: true
                });
                insertedCount += batch.length;
                process.stdout.write(`\rInserted ${insertedCount}/${institutions.length} records`);
            } catch (err: any) {
                console.error(`\nBatch failed at index ${i}: ${err.message}`);
                // Try smaller sub-batch if large batch fails? 
                // For now just error out to see.
            }
            // Small delay to prevent connection saturation
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n✅ Import completed successfully!');

    } catch (error) {
        console.error('Error importing Nature Index data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

importNatureIndex();
