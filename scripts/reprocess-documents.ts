import { PrismaClient } from '@prisma/client';
import { supabase } from '../lib/supabase';
import { extractTextFromPDF } from '../lib/rag/pdfProcessor';
import { chunkText, cleanText, generateEmbeddings } from '../lib/rag/embeddings';
import { storeDocumentChunks, deleteDocumentVectors } from '../lib/rag/vectorStore';

const prisma = new PrismaClient();

async function reprocessDocument(documentId: string) {
    const document = await prisma.document.findUnique({
        where: { id: documentId },
    });

    if (!document) {
        throw new Error(`Document ${documentId} not found`);
    }

    console.log(`\nReprocessing: ${document.originalName}`);
    console.log(`Filename: ${document.filename}`);

    // 1. Delete old vectors from Pinecone
    if (document.vectorIds && (document.vectorIds as string[]).length > 0) {
        console.log('Deleting old vectors from Pinecone...');
        await deleteDocumentVectors(document.vectorIds as string[]);
    }

    // 2. Download file from Supabase
    console.log('Downloading file from Supabase...');
    const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.filePath);

    if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // 3. Convert to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Extract text
    console.log('Extracting text from PDF...');
    const rawText = await extractTextFromPDF(buffer);
    const cleanedText = cleanText(rawText);

    // 5. Chunk text
    console.log('Chunking text...');
    const chunks = chunkText(cleanedText, 500, 50);
    console.log(`Created ${chunks.length} chunks`);

    // 6. Generate embeddings
    console.log('Generating embeddings...');
    const embeddings = await generateEmbeddings(chunks);

    // 7. Store in Pinecone with NEW metadata format (including originalName)
    console.log('Storing in Pinecone with updated metadata...');
    const chunkData = chunks.map((content, index) => ({
        content,
        embedding: embeddings[index],
    }));

    const vectorIds = await storeDocumentChunks(
        chunkData,
        document.id,
        document.filename,
        document.originalName, // ← This is the key fix!
        document.accessLevel as any
    );

    // 8. Update document in database
    await prisma.document.update({
        where: { id: document.id },
        data: {
            vectorIds: vectorIds,
            chunkCount: chunks.length,
            processedAt: new Date(),
        },
    });

    console.log(`✅ Successfully reprocessed ${document.originalName}`);
    console.log(`   Stored ${vectorIds.length} vectors with originalName metadata\n`);
}

async function reprocessAllDocuments() {
    console.log('🔄 Reprocessing all documents to add originalName to vector metadata...\n');

    const documents = await prisma.document.findMany({
        where: {
            status: 'processed',
        },
        select: {
            id: true,
            originalName: true,
        },
    });

    console.log(`Found ${documents.length} processed documents\n`);

    for (const doc of documents) {
        try {
            await reprocessDocument(doc.id);
        } catch (error) {
            console.error(`❌ Error reprocessing ${doc.originalName}:`, error);
        }
    }

    console.log('\n✅ All documents reprocessed!');
    console.log('Download links should now work correctly.');

    await prisma.$disconnect();
}

reprocessAllDocuments().catch(console.error);
