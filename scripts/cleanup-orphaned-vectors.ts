import { PrismaClient } from '@prisma/client';
import { Pinecone } from '@pinecone-database/pinecone';

const prisma = new PrismaClient();

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

async function cleanupOrphanedVectors() {
    console.log('🧹 Starting orphaned vector cleanup...\n');

    try {
        // Get all documents from database
        const documents = await prisma.document.findMany({
            where: {
                status: 'processed',
                vectorIds: { not: { equals: null } }
            },
            select: {
                id: true,
                filename: true,
                originalName: true,
                vectorIds: true
            }
        });

        console.log(`Found ${documents.length} documents in database with vectors\n`);

        // Create a set of all valid vector IDs
        const validVectorIds = new Set<string>();
        documents.forEach(doc => {
            const vectorIds = doc.vectorIds as string[];
            if (vectorIds && Array.isArray(vectorIds)) {
                vectorIds.forEach(id => validVectorIds.add(id));
            }
        });

        console.log(`Total valid vector IDs: ${validVectorIds.size}\n`);

        // Query Pinecone to find all vectors
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

        // Get stats to see total vectors
        const stats = await index.describeIndexStats();
        console.log(`Total vectors in Pinecone: ${stats.totalRecordCount}\n`);

        // Since we can't list all vectors easily, we'll use the documentId metadata
        // to find orphaned ones by querying with a dummy vector
        console.log('Note: To fully clean up orphaned vectors, you would need to:');
        console.log('1. Export all vector IDs from Pinecone');
        console.log('2. Compare against valid IDs from database');
        console.log('3. Delete the orphaned ones\n');

        console.log('For now, listing documents that might have orphaned vectors:\n');

        // Check each document's vectors
        for (const doc of documents) {
            const vectorIds = doc.vectorIds as string[];
            if (!vectorIds || vectorIds.length === 0) continue;

            try {
                // Try to fetch a sample vector to verify it exists
                const fetchResult = await index.fetch([vectorIds[0]]);
                if (!fetchResult.records || Object.keys(fetchResult.records).length === 0) {
                    console.log(`⚠️  Document "${doc.originalName}" has missing vectors`);
                }
            } catch (error) {
                console.log(`❌ Error checking vectors for "${doc.originalName}":`, error);
            }
        }

        console.log('\n✅ Cleanup check complete!');
        console.log('\nTo delete specific orphaned vectors, you can use:');
        console.log('await index.deleteMany([vector-id-1, vector-id-2, ...]);');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupOrphanedVectors().catch(console.error);
