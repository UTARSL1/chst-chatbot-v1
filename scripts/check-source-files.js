const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkSourceFiles() {
    const entries = await prisma.documentLibraryEntry.findMany({
        where: { isActive: true },
        select: {
            id: true,
            title: true,
            documentTitle: true,
            sourceFile: true
        },
        take: 10
    });

    console.log('Document Library Entries:\n');
    entries.forEach((entry, i) => {
        console.log(`${i + 1}. Title: ${entry.title}`);
        console.log(`   Document: ${entry.documentTitle}`);
        console.log(`   SourceFile: "${entry.sourceFile}"`);
        console.log('');
    });

    const emptyCount = entries.filter(e => !e.sourceFile).length;
    console.log(`\n⚠️  ${emptyCount} out of ${entries.length} entries have EMPTY sourceFile!`);
}

checkSourceFiles().finally(() => prisma.$disconnect());
