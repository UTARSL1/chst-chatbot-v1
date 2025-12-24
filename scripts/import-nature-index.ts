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
        const fileContent = fs.readFileSync(csvPath, 'utf-8');

        // Parse CSV
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        console.log(`Found ${records.length} records in CSV`);

        // Clear existing data
        console.log('Clearing existing Nature Index data...');
        await prisma.natureIndexInstitution.deleteMany({});

        // Prepare data for insertion
        const institutions = records.map((record: any) => {
            const institution = record['Institution'] || record['institution'];
            const country = record['Country/territory'] || record['Country'] || record['country'];
            const count = parseInt(record['Count'] || record['count'] || '0');
            const share = parseFloat(record['Share'] || record['share'] || '0');
            const position = parseInt(record['Position'] || record['position'] || '0');

            return {
                position,
                institution,
                normalizedName: institution.toLowerCase().trim(),
                country,
                count,
                share
            };
        });

        // Batch insert
        console.log('Inserting records...');
        const batchSize = 100;
        for (let i = 0; i < institutions.length; i += batchSize) {
            const batch = institutions.slice(i, i + batchSize);
            await prisma.natureIndexInstitution.createMany({
                data: batch
            });
            console.log(`Inserted ${Math.min(i + batchSize, institutions.length)}/${institutions.length} records`);
        }

        console.log('✅ Import completed successfully!');
        console.log(`Total institutions imported: ${institutions.length}`);

        // Show sample data
        const sample = await prisma.natureIndexInstitution.findMany({
            take: 5,
            orderBy: { position: 'asc' }
        });

        console.log('\nTop 5 institutions:');
        sample.forEach(inst => {
            console.log(`  ${inst.position}. ${inst.institution} (${inst.country}) - Count: ${inst.count}, Share: ${inst.share}`);
        });

    } catch (error) {
        console.error('Error importing Nature Index data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

importNatureIndex();
