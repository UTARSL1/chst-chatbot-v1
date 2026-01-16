const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function clearVectorIds() {
    console.log('Clearing vectorId from all Document Library entries...');

    const result = await prisma.documentLibraryEntry.updateMany({
        where: { vectorId: { not: null } },
        data: { vectorId: null }
    });

    console.log(`✅ Cleared ${result.count} vector IDs`);
    console.log('\nNow run: npx tsx scripts/embed-document-library.ts');
}

clearVectorIds().finally(() => prisma.$disconnect());
