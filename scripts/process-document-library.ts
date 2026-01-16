/**
 * Master Script: Process Document Library
 * 
 * This script automates the entire document library workflow:
 * 1. Converts PDFs to Markdown
 * 2. Parses and imports to database
 * 3. Generates embeddings
 * 4. Uploads PDFs to Supabase Storage
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET_NAME = 'document-library';

async function main() {
    console.log('🚀 Starting Document Library Processing Pipeline...\n');

    const toProcessDir = path.join(process.cwd(), 'documents', 'to-process');

    // Check if there are PDFs to process
    if (!fs.existsSync(toProcessDir)) {
        console.error('❌ documents/to-process directory not found!');
        process.exit(1);
    }

    const pdfs = fs.readdirSync(toProcessDir).filter(f => f.toLowerCase().endsWith('.pdf'));

    if (pdfs.length === 0) {
        console.log('ℹ️  No PDFs found in documents/to-process/');
        console.log('   Please add PDF files to process and run again.');
        return;
    }

    console.log(`📄 Found ${pdfs.length} PDF(s) to process:\n`);
    pdfs.forEach((pdf, i) => console.log(`   ${i + 1}. ${pdf}`));
    console.log('');

    // Step 1: Convert PDFs to Markdown
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Converting PDFs to Markdown');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        execSync('python scripts/batch-convert-pdfs.py', { stdio: 'inherit' });
        console.log('\n✅ PDF conversion complete\n');
    } catch (error) {
        console.error('❌ PDF conversion failed:', error);
        process.exit(1);
    }

    // Step 2: Parse Markdown documents
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Parsing Markdown Documents');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        execSync('node scripts/parse-markdown-documents.js', { stdio: 'inherit' });
        console.log('\n✅ Document parsing complete\n');
    } catch (error) {
        console.error('❌ Document parsing failed:', error);
        process.exit(1);
    }

    // Step 3: Import to database
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Importing to Database');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const batchName = `Import ${new Date().toISOString().split('T')[0]}`;

    try {
        execSync(`node scripts/bulk-import-knowledge.js "${batchName}"`, { stdio: 'inherit' });
        console.log('\n✅ Database import complete\n');
    } catch (error) {
        console.error('❌ Database import failed:', error);
        process.exit(1);
    }

    // Step 4: Generate embeddings
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: Generating Embeddings');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        execSync('npx tsx scripts/embed-document-library.ts', { stdio: 'inherit' });
        console.log('\n✅ Embedding generation complete\n');
    } catch (error) {
        console.error('❌ Embedding generation failed:', error);
        process.exit(1);
    }

    // Step 5: Upload PDFs to Supabase Storage
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: Uploading PDFs to Supabase Storage');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const pdfFile of pdfs) {
        const filePath = path.join(toProcessDir, pdfFile);
        const fileBuffer = fs.readFileSync(filePath);

        console.log(`📤 Uploading ${pdfFile}...`);

        const { data, error } = await supabase
            .storage
            .from(BUCKET_NAME)
            .upload(pdfFile, fileBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (error) {
            if (error.message.includes("Bucket not found")) {
                console.error('\n❌ BUCKET NOT FOUND!');
                console.error('⚠️  Please create the "document-library" bucket in Supabase Dashboard first.');
                console.error('   See DOCUMENT_LIBRARY_STORAGE_GUIDE.md for instructions.\n');
                process.exit(1);
            }
            console.error(`   ❌ Upload failed: ${error.message}`);
        } else {
            console.log(`   ✅ Uploaded: ${data?.path}`);
        }
    }

    console.log('\n✅ Supabase upload complete\n');

    // Final Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 PROCESSING COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Processed ${pdfs.length} document(s)`);
    console.log('✅ Database updated with sections and metadata');
    console.log('✅ Embeddings generated for semantic search');
    console.log('✅ PDFs uploaded to Supabase Storage');
    console.log('\n📝 The AI can now retrieve and link these documents in responses.\n');
}

main().catch(error => {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
});
