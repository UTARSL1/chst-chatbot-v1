const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteBatch() {
    try {
        // Find the batch
        const batch = await prisma.documentLibraryBatch.findFirst({
            where: {
                batchName: 'IPSR Policies - January 2026'
            }
        });

        if (!batch) {
            console.log('❌ Batch not found');
            return;
        }

        console.log(`Found batch: ${batch.batchName}`);
        console.log(`Created: ${batch.createdAt}`);
        console.log(`Total sections: ${batch.totalSections}`);

        // Delete all entries from this batch
        const deleted = await prisma.documentLibraryEntry.deleteMany({
            where: {
                createdBy: batch.createdBy,
                createdAt: {
                    gte: batch.createdAt
                }
            }
        });

        console.log(`✓ Deleted ${deleted.count} entries`);

        // Delete the batch
        await prisma.documentLibraryBatch.delete({
            where: {
                id: batch.id
            }
        });

        console.log(`✓ Deleted batch`);
        console.log(`\n✅ Cleanup complete!`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

deleteBatch();
