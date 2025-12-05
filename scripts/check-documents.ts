import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocuments() {
    console.log('\n=== Checking Documents in Database ===\n');

    const documents = await prisma.document.findMany({
        select: {
            id: true,
            filename: true,
            originalName: true,
            category: true,
            accessLevel: true,
        }
    });

    console.log(`Total documents: ${documents.length}\n`);

    documents.forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.originalName}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Filename: ${doc.filename}`);
        console.log(`   Category: ${doc.category}`);
        console.log(`   Access Level: ${doc.accessLevel}`);
        console.log('');
    });

    // Check for sabbatical leave specifically
    const sabbatical = documents.find(d =>
        d.originalName?.toLowerCase().includes('sabbatical') ||
        d.filename?.toLowerCase().includes('sabbatical')
    );

    if (sabbatical) {
        console.log('✅ Found sabbatical leave document:');
        console.log(JSON.stringify(sabbatical, null, 2));
    } else {
        console.log('❌ No sabbatical leave document found');
    }

    // Check system prompt
    console.log('\n=== Checking System Prompt ===\n');
    const systemPrompt = await prisma.systemPrompt.findUnique({
        where: { name: 'default_rag' }
    });

    if (systemPrompt) {
        console.log('System Prompt Found:');
        console.log('Active:', systemPrompt.isActive);
        console.log('Content length:', systemPrompt.content.length);
        console.log('\nChecking for download instructions...');
        if (systemPrompt.content.includes('download:')) {
            console.log('✅ Contains download: format instruction');
        } else {
            console.log('❌ Missing download: format instruction');
        }
    } else {
        console.log('❌ No system prompt found - using default');
    }

    await prisma.$disconnect();
}

checkDocuments().catch(console.error);
