import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for text using OpenAI's text-embedding-ada-002 model
 * @param text - Text to generate embeddings for
 * @returns Array of numbers representing the embedding vector (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: text,
        });

        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw new Error('Failed to generate embedding');
    }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: texts,
        });

        return response.data.map((item) => item.embedding);
    } catch (error) {
        console.error('Error generating embeddings:', error);
        throw new Error('Failed to generate embeddings');
    }
}

/**
 * Chunk text into smaller pieces for embedding
 * @param text - Text to chunk
 * @param chunkSize - Maximum tokens per chunk (default: 500)
 * @param overlap - Number of tokens to overlap between chunks (default: 50)
 * @returns Array of text chunks
 */
export function chunkText(
    text: string,
    chunkSize: number = 500,
    overlap: number = 50
): string[] {
    // Simple chunking by characters (approximate tokens)
    // 1 token ≈ 4 characters for English text
    const charChunkSize = chunkSize * 4;
    const charOverlap = overlap * 4;

    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        const endIndex = Math.min(startIndex + charChunkSize, text.length);
        const chunk = text.substring(startIndex, endIndex);

        // Only add non-empty chunks
        if (chunk.trim().length > 0) {
            chunks.push(chunk.trim());
        }

        // Move to next chunk with overlap
        startIndex += charChunkSize - charOverlap;

        // Prevent infinite loop
        if (startIndex >= text.length) break;
    }

    return chunks;
}

/**
 * Clean and preprocess text before embedding
 * @param text - Raw text to clean
 * @returns Cleaned text
 */
export function cleanText(text: string): string {
    return text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters (optional)
        .trim();
}
