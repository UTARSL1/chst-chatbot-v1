import { extractTextFromPDF } from '../lib/rag/pdfProcessor';
import { join } from 'path';

async function test() {
    try {
        // Inspect pdf-parse export
        const pdfParse = require('pdf-parse');
        console.log('pdf-parse type:', typeof pdfParse);
        console.log('pdf-parse keys:', Object.keys(pdfParse));

        // Use a known PDF file path - adjust this if needed
        // I'll try to find one dynamically or use a dummy path if I can't find one
        // For now, let's try to list files in documents/member to find one
        const fs = require('fs');
        const path = require('path');

        const documentsDir = path.join(process.cwd(), 'documents', 'member');
        if (!fs.existsSync(documentsDir)) {
            console.error('Documents directory not found:', documentsDir);
            return;
        }

        const files = fs.readdirSync(documentsDir);
        const pdfFile = files.find((f: string) => f.endsWith('.pdf'));

        if (!pdfFile) {
            console.error('No PDF file found in documents/member for testing');
            return;
        }

        const filePath = path.join(documentsDir, pdfFile);
        console.log('Testing extraction on:', filePath);

        const text = await extractTextFromPDF(filePath);
        console.log('Extraction successful!');
        console.log('Text length:', text.length);
        console.log('First 100 chars:', text.substring(0, 100));

    } catch (error: any) {
        const fs = require('fs');
        fs.writeFileSync('error.txt', `Message: ${error.message}\nStack: ${error.stack}`);
        console.log('Error written to error.txt');
    }
}

test();
