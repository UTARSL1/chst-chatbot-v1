import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

/**
 * Get chunk count comparison between database and Pinecone
 * Returns: { documentId: { dbCount: number, pineconeCount: number } }
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get all documents from database
        const documents = await prisma.document.findMany({
            where: { status: 'processed' },
            select: {
                id: true,
                filename: true,
                originalName: true,
                chunkCount: true,
            }
        });

        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

        const comparison: Record<string, {
            filename: string;
            originalName: string;
            dbCount: number;
            pineconeCount: number;
            mismatch: boolean;
        }> = {};

        // For each document, count vectors in Pinecone
        for (const doc of documents) {
            try {
                // Query Pinecone with metadata filter to count chunks
                const stats = await index.query({
                    vector: new Array(1536).fill(0), // Dummy vector
                    topK: 10000, // Large number to get all chunks
                    filter: { filename: doc.filename },
                    includeMetadata: false,
                    includeValues: false,
                });

                const pineconeCount = stats.matches?.length || 0;
                const dbCount = doc.chunkCount || 0;

                comparison[doc.id] = {
                    filename: doc.filename,
                    originalName: doc.originalName,
                    dbCount,
                    pineconeCount,
                    mismatch: dbCount !== pineconeCount,
                };

                console.log(`[Chunk Comparison] ${doc.originalName}: DB=${dbCount}, Pinecone=${pineconeCount}`);
            } catch (error) {
                console.error(`[Chunk Comparison] Error checking ${doc.originalName}:`, error);
                comparison[doc.id] = {
                    filename: doc.filename,
                    originalName: doc.originalName,
                    dbCount: doc.chunkCount || 0,
                    pineconeCount: -1, // Error indicator
                    mismatch: true,
                };
            }
        }

        return NextResponse.json({ comparison }, { status: 200 });
    } catch (error: any) {
        console.error('[Chunk Comparison] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
