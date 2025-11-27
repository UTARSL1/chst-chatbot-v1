import { readFile } from 'fs/promises';

/**
 * Extract text from PDF file
 * @param filePath - Path to PDF file
 * @returns Extracted text content
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
    try {
        // Use pdf-parse-fork which is more compatible with Next.js
        const pdf = require('pdf-parse-fork');
        const dataBuffer = await readFile(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw error;
    }
}

/**
 * Get PDF metadata
 * @param filePath - Path to PDF file
 * @returns PDF metadata
 */
export async function getPDFMetadata(filePath: string) {
    try {
        const pdf = require('pdf-parse-fork');
        const dataBuffer = await readFile(filePath);
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
