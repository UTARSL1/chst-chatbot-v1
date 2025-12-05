import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocuments() {
    console.log('Checking document database state...\n');

    const documents = await prisma.document.findMany({
        select: {
            id: true,
            filename: true,
            originalName: true,
            status: true,
            accessLevel: true,
            chunkCount: true,
            vectorIds: true,
        },
        orderBy: {
            uploadedAt: 'desc',
        },
        take: 10,
    });

    console.log(`Total documents found: ${documents.length}\n`);

    if (documents.length === 0) {
        console.log('❌ No documents found in database!');
        console.log('You need to upload documents first.');
        return;
    }

    documents.forEach((doc, index) => {
        console.log(`\n--- Document ${index + 1} ---`);
        console.log(`ID: ${doc.id}`);
        console.log(`Filename (UUID): ${doc.filename}`);
        console.log(`Original Name: ${doc.originalName || '❌ MISSING'}`);
        console.log(`Status: ${doc.status}`);
        console.log(`Access Level: ${doc.accessLevel}`);
        console.log(`Chunk Count: ${doc.chunkCount || 'N/A'}`);
        console.log(`Has Vector IDs: ${doc.vectorIds && (doc.vectorIds as any[]).length > 0 ? '✅' : '❌'}`);

        if (doc.status !== 'processed') {
            console.log('⚠️  Document not processed!');
        }
        if (!doc.originalName) {
            console.log('⚠️  Missing originalName - download links won\'t work!');
        }
    });

    await prisma.$disconnect();
}

checkDocuments().catch(console.error);
