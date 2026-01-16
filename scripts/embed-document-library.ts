import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from '../lib/rag/embeddings';
import { storeDocumentLibraryEntry } from '../lib/rag/vectorStore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Document Library Embedding Process...');
    console.log('Checking for entries missing vector IDs...');

    // Fetch active entries without vectorId
    const entries = await prisma.documentLibraryEntry.findMany({
        where: {
            isActive: true,
            status: 'active',
            vectorId: null
        }
    });

    if (entries.length === 0) {
        console.log('✅ All entries already have vector IDs. Nothing to do.');
        return;
    }

    console.log(`Found ${entries.length} entries to process.`);

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        console.log(`[${i + 1}/${entries.length}] Processing "${entry.documentTitle} - ${entry.title}"...`);

        try {
            // Create text to embed: Title + Content
            // We give weight to title by prepending it
            const textToEmbed = `Document: ${entry.documentTitle || ''}\nSection: ${entry.title}\nContent:\n${entry.content}`;

            // Generate embedding
            const embedding = await generateEmbedding(textToEmbed);

            // Store in Pinecone
            // Note: entry has all required fields as per schema match
            const vectorId = await storeDocumentLibraryEntry(entry, embedding);

            // Update database
            await prisma.documentLibraryEntry.update({
                where: { id: entry.id },
                data: { vectorId }
            });

            console.log(`  ✅ Stored vector ${vectorId}`);

            // Simple rate limiting to be nice to APIs
            await new Promise(r => setTimeout(r, 200));

        } catch (error) {
            console.error(`  ❌ Failed to process entry ${entry.id}:`, error);
        }
    }

    console.log('🎉 Embedding process complete!');
}

main()
    .catch(e => {
        console.error('Fatal Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
