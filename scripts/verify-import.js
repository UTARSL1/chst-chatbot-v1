const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    try {
        // Get a few sample entries
        const entries = await prisma.documentLibraryEntry.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                documentTitle: true,
                title: true,
                department: true,
                documentType: true,
                accessLevel: true
            }
        });

        console.log('\n📊 Sample Entries:\n');
        entries.forEach((entry, i) => {
            console.log(`${i + 1}. Document: "${entry.documentTitle}"`);
            console.log(`   Section: "${entry.title}"`);
            console.log(`   Department: ${entry.department}`);
            console.log(`   Type: ${entry.documentType}`);
            console.log(`   Access: [${entry.accessLevel.join(', ')}]`);
            console.log('');
        });

        // Get statistics
        const total = await prisma.documentLibraryEntry.count();
        const withDocTitle = await prisma.documentLibraryEntry.count({
            where: { documentTitle: { not: null } }
        });

        console.log(`\n📈 Statistics:`);
        console.log(`   Total entries: ${total}`);
        console.log(`   With documentTitle: ${withDocTitle}`);
        console.log(`   Missing documentTitle: ${total - withDocTitle}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
