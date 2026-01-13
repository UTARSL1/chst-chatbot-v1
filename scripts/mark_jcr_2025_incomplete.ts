import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markIncomplete() {
    console.log('\n🔄 Marking existing JCR 2025 records as incomplete...\n');

    try {
        // Check current count
        const currentCount = await prisma.jcrJournalMetric.count({
            where: { jifYear: 2025 }
        });

        console.log(`📊 Found ${currentCount} existing JCR 2025 records`);

        // Update source field to mark as incomplete
        const result = await prisma.jcrJournalMetric.updateMany({
            where: {
                jifYear: 2025,
                source: 'JCR'
            },
            data: {
                source: 'JCR_incomplete'
            }
        });

        console.log(`✅ Marked ${result.count} records as JCR_incomplete\n`);

        // Verify
        const incompleteCount = await prisma.jcrJournalMetric.count({
            where: {
                jifYear: 2025,
                source: 'JCR_incomplete'
            }
        });

        console.log(`📊 Verification: ${incompleteCount} records now marked as JCR_incomplete`);

    } catch (error) {
        console.error('\n❌ Error:', error);
        throw error;
    }
}

async function main() {
    try {
        await markIncomplete();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
