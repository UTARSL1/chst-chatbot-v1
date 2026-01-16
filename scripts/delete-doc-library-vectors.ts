import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

dotenv.config();

async function deleteDocumentLibraryVectors() {
    console.log('🗑️  Deleting all Document Library vectors from Pinecone...\n');

    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!
    });

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    try {
        // Delete all vectors with type = 'document-library'
        await index.deleteMany({
            filter: {
                type: 'document-library'
            }
        });

        console.log('✅ All Document Library vectors deleted from Pinecone.');
        console.log('\nNow run: npx tsx scripts/embed-document-library.ts');
        console.log('This will re-create vectors with sourceFile metadata.\n');

    } catch (error) {
        console.error('❌ Error deleting vectors:', error);
        process.exit(1);
    }
}

deleteDocumentLibraryVectors();
