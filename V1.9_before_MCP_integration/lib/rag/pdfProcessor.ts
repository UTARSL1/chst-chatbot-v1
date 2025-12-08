import { readFile } from 'fs/promises';

/**
 * Extract text from PDF file
 * @param input - Path to PDF file or Buffer
 * @returns Extracted text content
 */
export async function extractTextFromPDF(input: string | Buffer): Promise<string> {
    try {
        // Use pdf-parse-fork which is more compatible with Next.js
        const pdf = require('pdf-parse-fork');

        let dataBuffer: Buffer;
        if (Buffer.isBuffer(input)) {
            dataBuffer = input;
        } else {
            dataBuffer = await readFile(input);
        }

        const data = await pdf(dataBuffer);
        return data.text;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw error;
    }
}

/**
 * Get PDF metadata
 * @param input - Path to PDF file or Buffer
 * @returns PDF metadata
 */
export async function getPDFMetadata(input: string | Buffer) {
    try {
        const pdf = require('pdf-parse-fork');

        let dataBuffer: Buffer;
        if (Buffer.isBuffer(input)) {
            dataBuffer = input;
        } else {
            dataBuffer = await readFile(input);
        }

        const data = await pdf(dataBuffer);

        return {
            pages: data.numpages,
            info: data.info,
            metadata: data.metadata,
            version: data.version,
        };
    } catch (error) {
        console.error('Error getting PDF metadata:', error);
        throw new Error('Failed to get PDF metadata');
    }
}
