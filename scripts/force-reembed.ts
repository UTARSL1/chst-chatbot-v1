import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from '../lib/rag/embeddings';
import { storeDocumentLibraryEntry } from '../lib/rag/vectorStore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 FORCE Re-embedding ALL Document Library Entries...');
    console.log('This will update Pinecone metadata with sourceFile field.\n');

    // Fetch ALL active entries (ignore vectorId)
    const entries = await prisma.documentLibraryEntry.findMany({
        where: {
            isActive: true,
            status: 'active'
        }
    });

    console.log(`Found ${entries.length} entries to re-embed.\n`);

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        console.log(`[${i + 1}/${entries.length}] Re-embedding "${entry.documentTitle || entry.title}"...`);

        try {
            // Create text to embed
            const textToEmbed = `Document: ${entry.documentTitle || ''}\nSection: ${entry.title}\nContent:\n${entry.content}`;

            // Generate embedding
            const embedding = await generateEmbedding(textToEmbed);

            // Store in Pinecone (upsert will update existing)
            const vectorId = await storeDocumentLibraryEntry(entry, embedding);

            // Update database with new vectorId
            await prisma.documentLibraryEntry.update({
                where: { id: entry.id },
                data: { vectorId }
            });

            console.log(`  ✅ Updated vector ${vectorId}`);

            // Rate limiting
            await new Promise(r => setTimeout(r, 200));

        } catch (error) {
            console.error(`  ❌ Failed:`, error);
        }
    }

    console.log('\n🎉 Re-embedding complete! All vectors now have sourceFile metadata.');
}

main()
    .catch(e => {
        console.error('Fatal Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
