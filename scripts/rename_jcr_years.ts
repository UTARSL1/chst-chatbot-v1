import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function renameJcrYears() {
    console.log('\n🔄 Starting JCR year renaming process...\n');

    try {
        // First, check what years we have
        const counts = await prisma.jcrJournalMetric.groupBy({
            by: ['jifYear'],
            _count: {
                id: true
            },
            orderBy: {
                jifYear: 'asc'
            }
        });

        console.log('📊 Current JCR Record Counts by Year:');
        counts.forEach(c => {
            console.log(`   - ${c.jifYear}: ${c._count.id} records`);
        });

        console.log('\n⚠️  About to rename:');
        console.log('   - JCR 2022 → JCR 2023');
        console.log('   - JCR 2023 → JCR 2024');
        console.log('   - JCR 2024 → JCR 2025');
        console.log('\n🚀 Starting updates...\n');

        // We need to update in reverse order to avoid conflicts
        // Step 1: Update 2024 → 2025
        const count2024 = await prisma.jcrJournalMetric.updateMany({
            where: { jifYear: 2024 },
            data: { jifYear: 2025 }
        });
        console.log(`✅ Updated ${count2024.count} records: 2024 → 2025`);

        // Step 2: Update 2023 → 2024
        const count2023 = await prisma.jcrJournalMetric.updateMany({
            where: { jifYear: 2023 },
            data: { jifYear: 2024 }
        });
        console.log(`✅ Updated ${count2023.count} records: 2023 → 2024`);

        // Step 3: Update 2022 → 2023
        const count2022 = await prisma.jcrJournalMetric.updateMany({
            where: { jifYear: 2022 },
            data: { jifYear: 2023 }
        });
        console.log(`✅ Updated ${count2022.count} records: 2022 → 2023`);

        // Verify the changes
        console.log('\n📊 Updated JCR Record Counts by Year:');
        const newCounts = await prisma.jcrJournalMetric.groupBy({
            by: ['jifYear'],
            _count: {
                id: true
            },
            orderBy: {
                jifYear: 'asc'
            }
        });

        newCounts.forEach(c => {
            console.log(`   - ${c.jifYear}: ${c._count.id} records`);
        });

        console.log('\n✅ JCR year renaming completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Error during JCR year renaming:', error);
        throw error;
    }
}

async function main() {
    try {
        await renameJcrYears();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
