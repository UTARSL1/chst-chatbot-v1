import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

async function testCSVParsing() {
    const csvPath = path.join(process.cwd(), 'data', 'jcr', '2025', '2025 JCR_complete.csv');

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

    console.log(`✅ Parsed ${records.length} rows`);
    console.log(`\n📋 Sample record (first row):`);
    console.log(JSON.stringify(records[0], null, 2));

    console.log(`\n📋 Column headers:`);
    console.log(Object.keys(records[0]).join(', '));
}

testCSVParsing().catch(console.error);
