import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET_NAME = 'document-library';

async function uploadFiles() {
    console.log(`🚀 Starting upload to Supabase Storage bucket: ${BUCKET_NAME}`);

    // Source directory (using the public/documents folder we populated)
    const sourceDir = path.join(process.cwd(), 'public', 'documents');

    if (!fs.existsSync(sourceDir)) {
        console.error(`Source directory not found: ${sourceDir}`);
        return;
    }

    const files = fs.readdirSync(sourceDir).filter(f => f.toLowerCase().endsWith('.pdf'));

    if (files.length === 0) {
        console.log("No PDF files found to upload.");
        return;
    }

    console.log(`Found ${files.length} files.`);

    // Check if bucket exists, create if not (requires Service Role)
    // Note: Creating buckets via API might fail if RLS prevents it or if using Anon key.
    // Ideally user creates bucket in dashboard. We'll try to just upload.

    for (const file of files) {
        const filePath = path.join(sourceDir, file);
        const fileBuffer = fs.readFileSync(filePath);

        console.log(`Uploading ${file}...`);

        const { data, error } = await supabase
            .storage
            .from(BUCKET_NAME)
            .upload(file, fileBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (error) {
            console.error(`❌ Upload failed for ${file}:`, error.message);
            if (error.message.includes("Bucket not found")) {
                console.error("⚠️  PLEASE CREATE PUBLIC BUCKET 'document-library' IN SUPABASE DASHBOARD ⚠️");
                return;
            }
        } else {
            console.log(`✅ Uploaded: ${data?.path}`);
        }
    }

    console.log("🎉 Upload process finished.");
}

uploadFiles();
