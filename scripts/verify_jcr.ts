
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.jcrJournalMetric.count();
    console.log(`Total JCR records: ${count}`);

    const years = await prisma.jcrJournalMetric.findMany({
        select: { jifYear: true },
        distinct: ['jifYear'],
        orderBy: { jifYear: 'asc' }
    });
    console.log('Years present:', years.map(y => y.jifYear));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
