
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.jcrJournalMetric.groupBy({
        by: ['jifYear'],
        _count: {
            id: true
        },
        orderBy: {
            jifYear: 'asc'
        }
    });

    console.log("JCR Record Counts by Year:");
    counts.forEach(c => {
        console.log(`- ${c.jifYear}: ${c._count.id} records`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
