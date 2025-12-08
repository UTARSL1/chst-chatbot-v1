
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Searching for Scientific Reports...");
    const results = await prisma.jcrJournalMetric.findMany({
        where: {
            fullTitle: {
                contains: 'SCIENTIFIC REPORTS',
                mode: 'insensitive'
            }
        },
        take: 5
    });

    console.log(`Found ${results.length} records.`);
    results.forEach(r => {
        console.log(`- ${r.fullTitle} (${r.jifYear}) Q:${r.jifQuartile}`);
    });
}

main().finally(() => prisma.$disconnect());
