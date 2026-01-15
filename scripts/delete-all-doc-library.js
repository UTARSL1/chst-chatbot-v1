const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAll() {
    try {
        // Delete batches first (this will cascade delete entries)
        const deletedBatches = await prisma.documentLibraryBatch.deleteMany({});
        console.log(`✓ Deleted ${deletedBatches.count} batches (and their entries via cascade)`);

        console.log(`\n✅ All document library data deleted!`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

deleteAll();
