import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { AccessLevel, DocumentChunk } from '@/types';

// Initialize Pinecone client
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

const indexName = process.env.PINECONE_INDEX_NAME || 'chst-documents';

/**
 * Get Pinecone index
 */
export async function getIndex() {
    return pinecone.index(indexName);
}

/**
 * Store document chunks in Pinecone
 * @param chunks - Array of document chunks with embeddings
 * @param documentId - ID of the document
 * @param filename - Name of the file
 * @param accessLevel - Access level for the document
 * @returns Array of vector IDs
 */
export async function storeDocumentChunks(
    chunks: { content: string; embedding: number[] }[],
    documentId: string,
    filename: string,
    originalName: string,
    accessLevel: AccessLevel
): Promise<string[]> {
    try {
        const index = await getIndex();
        const vectorIds: string[] = [];

        // Prepare vectors for upsert
        const vectors = chunks.map((chunk, index) => {
            const vectorId = uuidv4();
            vectorIds.push(vectorId);

            return {
                id: vectorId,
                values: chunk.embedding,
                metadata: {
                    documentId,
                    filename,
                    originalName,
                    accessLevel,
                    chunkIndex: index,
                    content: chunk.content.substring(0, 1000), // Store first 1000 chars in metadata
                },
            };
        });

        // Upsert vectors in batches of 100
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await index.upsert(batch);
        }

        return vectorIds;
    } catch (error) {
        console.error('Error storing document chunks:', error);
        throw new Error('Failed to store document chunks in vector database');
    }
}

/**
 * Search for similar documents based on query embedding
 * @param queryEmbedding - Embedding vector of the query
 * @param accessLevels - Array of access levels the user can access
 * @param topK - Number of results to return
 * @returns Array of matching document chunks
 */
export async function searchSimilarDocuments(
    queryEmbedding: number[],
    accessLevels: string[],
    topK: number = 5
): Promise<DocumentChunk[]> {
    try {
        const index = await getIndex();

        // Query Pinecone with access level filter
        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK,
            includeMetadata: true,
            filter: {
                accessLevel: { $in: accessLevels },
            },
        });

        // Transform results to DocumentChunk format
        const chunks: DocumentChunk[] = queryResponse.matches.map((match) => ({
            id: match.id,
            content: (match.metadata?.content as string) || '',
            metadata: {
                documentId: (match.metadata?.documentId as string) || '',
                filename: (match.metadata?.filename as string) || '',
                originalName: (match.metadata?.originalName as string) || (match.metadata?.filename as string) || '',
                accessLevel: (match.metadata?.accessLevel as AccessLevel) || 'student',
                chunkIndex: (match.metadata?.chunkIndex as number) || 0,
            },
        }));

        return chunks;
    } catch (error) {
        console.error('Error searching similar documents:', error);
        throw new Error('Failed to search vector database');
    }
}

/**
 * Delete document vectors from Pinecone
 * @param vectorIds - Array of vector IDs to delete
 */
export async function deleteDocumentVectors(vectorIds: string[]): Promise<void> {
    try {
        const index = await getIndex();

        // Delete vectors in batches
        const batchSize = 100;
        for (let i = 0; i < vectorIds.length; i += batchSize) {
            const batch = vectorIds.slice(i, i + batchSize);
            await index.deleteMany(batch);
        }
    } catch (error) {
        console.error('Error deleting document vectors:', error);
        throw new Error('Failed to delete document vectors');
    }
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
    try {
        const index = await getIndex();
        const stats = await index.describeIndexStats();
        return stats;
    } catch (error) {
        console.error('Error getting index stats:', error);
        throw new Error('Failed to get index statistics');
    }
}

/**
 * Store Document Library entry in Pinecone
 */
export async function storeDocumentLibraryEntry(
    entry: {
        id: string,
        documentTitle: string | null,
        title: string,
        content: string,
        accessLevel: string[],
        department: string | null,
        documentType: string | null
    },
    embedding: number[]
): Promise<string> {
    try {
        const index = await getIndex();
        const vectorId = uuidv4();

        // Ensure accessLevel is a flat array of strings for Pinecone
        const accessLevels = Array.isArray(entry.accessLevel) ? entry.accessLevel : [entry.accessLevel];

        await index.upsert([{
            id: vectorId,
            values: embedding,
            metadata: {
                type: 'document-library',
                documentLibraryId: entry.id,
                documentTitle: entry.documentTitle || '',
                title: entry.title,
                content: entry.content.substring(0, 2000), // Store snippet
                accessLevel: accessLevels,
                department: entry.department || '',
                documentType: entry.documentType || ''
            }
        }]);

        return vectorId;
    } catch (error) {
        console.error('Error storing document library entry:', error);
        throw new Error('Failed to store document library entry in vector database');
    }
}

/**
 * Search Document Library vectors
 * Returns matches with score and metadata
 */
export async function searchDocumentLibraryVectors(
    queryEmbedding: number[],
    accessLevels: string[],
    topK: number = 5
): Promise<any[]> {
    try {
        const index = await getIndex();

        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK,
            includeMetadata: true,
            filter: {
                type: 'document-library',
                accessLevel: { $in: accessLevels }
            },
        });

        return queryResponse.matches.map(match => ({
            id: match.id,
            score: match.score,
            metadata: match.metadata
        }));
    } catch (error) {
        console.error('Error searching document library vectors:', error);
        return []; // Return empty on error to gracefully failover
    }
}
