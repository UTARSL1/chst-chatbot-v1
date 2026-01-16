import { getIndexStats, getIndex } from '../lib/rag/vectorStore';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log('Fetching Pinecone stats...');
    const stats = await getIndexStats();
    console.log('Detailed Stats:', JSON.stringify(stats, null, 2));

    // Try to query specifically for document-library type
    const index = await getIndex();

    // We can't count by filter efficiently in Pinecone regular tier without list query
    // But we can check total count
}

main();
