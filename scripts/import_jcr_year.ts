
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const jifYearArg = args[0];

    if (!jifYearArg) {
        console.error('Please provide a JIF year (e.g., 2024)');
        process.exit(1);
    }

    const jifYear = parseInt(jifYearArg, 10);
    if (isNaN(jifYear)) {
        console.error(`Invalid year provided: ${jifYearArg}`);
        process.exit(1);
    }

    const csvPath = path.join(process.cwd(), 'data', 'jcr', jifYearArg, `JCR_${jifYearArg}.csv`);

    if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found at: ${csvPath}`);
        process.exit(1);
    }

    console.log(`Reading CSV from ${csvPath}...`);

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
        console.error('Could not find header row containing "Journal name"');
        process.exit(1);
    }

    console.log(`Found header at line ${headerIndex + 1}`);

    let csvData = lines.slice(headerIndex).join('\n');

    // Sanitize: JCR CSVs often have trailing '%' signs after quotes, e.g., "100"%,
    // 1. Remove trailing comma produced by the "%, at EOL"
    csvData = csvData.replace(/"%,$/gm, '"'); // Quote + Percent + Comma at End of Line -> Quote
    // 2. Remove % after quote in middle of line
    csvData = csvData.replace(/"%,/g, '",');
    // 3. Handle end of line % without comma
    csvData = csvData.replace(/"%[\r\n]/g, '"\n');

    // Cast to specific type to avoid unknown errors
    const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true
    }) as Record<string, string>[];

    console.log(`Parsed ${records.length} rows. Starting upsert...`);

    let count = 0;

    for (const row of records) {
        const keys = Object.keys(row);
        const jifColName = keys.find(k => k.includes('JIF') && !k.includes('Quartile') && !k.includes('Percentile'));
        const jciColName = keys.find(k => k.includes('JCI') && !k.includes('Percentile'));

        // Try various common column names
        const journalName = row['Journal name'] || row['Full Journal Title'];

        if (!journalName) continue;

        const issn = row['ISSN'];
        const eIssn = row['eISSN'];
        const category = row['Category'];
        const edition = row['Edition'];
        const jifStr = jifColName ? row[jifColName] : null;
        const quartile = row['JIF Quartile'];
        const jciStr = jciColName ? row[jciColName] : null;
        const oaStr = row['% of Citable OA'];

        const normalizedTitle = journalName.toLowerCase().trim().replace(/\s+/g, ' ');

        const parseNum = (s: string | null) => {
            if (!s || s === 'N/A' || s === '') return null;
            const clean = s.replace(/,/g, '').replace(/%/g, '');
            const val = parseFloat(clean);
            return isNaN(val) ? null : val;
        };

        const jifValue = parseNum(jifStr);
        const jciValue = parseNum(jciStr);
        const oaValue = parseNum(oaStr);

        try {
            const whereClause: any = {
                normalizedTitle,
                category: category || 'Unknown',
                jifYear
            };
            // Only add edition to query if it's present to avoid mis-matching, 
            // but if DB has it, we must match it. 
            // FindFirst is safest.
            if (edition) whereClause.edition = edition;

            const existing = await prisma.jcrJournalMetric.findFirst({
                where: whereClause
            });

            const data = {
                fullTitle: journalName,
                normalizedTitle,
                issnPrint: (issn && issn !== 'N/A') ? issn : null,
                issnElectronic: (eIssn && eIssn !== 'N/A') ? eIssn : null,
                category: category || 'Unknown',
                edition: edition || null,
                jifYear,
                jifValue,
                jifQuartile: quartile || 'N/A',
                jciValue,
                percentCitableOa: oaValue,
                source: 'JCR'
            };

            if (existing) {
                await prisma.jcrJournalMetric.update({
                    where: { id: existing.id },
                    data
                });
            } else {
                await prisma.jcrJournalMetric.create({
                    data
                });
            }

            count++;
            if (count % 100 === 0) process.stdout.write('.');
        } catch (e) {
            console.error(`\nError processing ${journalName}:`, e);
        }
    }

    console.log(`\nImported ${count} records for year ${jifYear}.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
