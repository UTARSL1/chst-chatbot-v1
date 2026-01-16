/**
 * Upload existing PDFs to Supabase Storage
 * Use this for documents that are already in the database but not yet uploaded
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET_NAME = 'document-library';

async function uploadExistingPDFs() {
    console.log('🚀 Uploading existing PDFs to Supabase Storage...\n');

    // Check multiple possible locations for PDFs
    const possibleDirs = [
        path.join(process.cwd(), 'documents', 'to-process'),
        path.join(process.cwd(), 'documents', 'student'),
        path.join(process.cwd(), 'documents', 'member'),
        path.join(process.cwd(), 'documents', 'chairperson'),
        path.join(process.cwd(), 'public', 'documents'),
    ];

    let allPdfs: Array<{ file: string, dir: string }> = [];

    for (const dir of possibleDirs) {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'));
            files.forEach(file => allPdfs.push({ file, dir }));
        }
    }

    if (allPdfs.length === 0) {
        console.log('❌ No PDFs found in any documents folder.');
        console.log('   Checked locations:');
        possibleDirs.forEach(d => console.log(`   - ${d}`));
        return;
    }

    console.log(`📄 Found ${allPdfs.length} PDF(s):\n`);
    allPdfs.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.file} (from ${path.basename(item.dir)})`);
    });
    console.log('');

    let uploadedCount = 0;
    let skippedCount = 0;

    for (const { file, dir } of allPdfs) {
        const filePath = path.join(dir, file);
        const fileBuffer = fs.readFileSync(filePath);

        console.log(`📤 Uploading ${file}...`);

        const { data, error } = await supabase
            .storage
            .from(BUCKET_NAME)
            .upload(file, fileBuffer, {
                contentType: 'application/pdf',
                upsert: true // Overwrite if exists
            });

        if (error) {
            if (error.message.includes("Bucket not found")) {
                console.error('\n❌ BUCKET NOT FOUND!');
                console.error('   Please ensure "document-library" bucket exists and is public.\n');
                process.exit(1);
            }
            console.error(`   ❌ Upload failed: ${error.message}`);
            skippedCount++;
        } else {
            console.log(`   ✅ Uploaded: ${data?.path}`);
            uploadedCount++;
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 UPLOAD COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Uploaded: ${uploadedCount} file(s)`);
    if (skippedCount > 0) {
        console.log(`⚠️  Skipped: ${skippedCount} file(s)`);
    }
    console.log('\n📝 PDFs are now available for download in the chatbot.\n');
}

uploadExistingPDFs();
