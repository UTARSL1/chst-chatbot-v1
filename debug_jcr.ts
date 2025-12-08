
import { PrismaClient } from '@prisma/client';
import { getJournalMetricsByTitle, ensureJcrCacheLoaded } from './lib/jcrCache';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking direct DB...");
    const directResult = await prisma.jcrJournalMetric.findFirst({
        where: {
            fullTitle: { contains: 'Scientific', mode: 'insensitive' }
        }
    });
    console.log("DB Sample Match:", directResult ? directResult.fullTitle : "None");

    const exactResult = await prisma.jcrJournalMetric.findFirst({
        where: {
            normalizedTitle: 'scientific reports'
        }
    });
    console.log("DB Exact Match (normalized 'scientific reports'):", exactResult ? "Found" : "Not Found");

    console.log("\nChecking Cache Logic...");
    await ensureJcrCacheLoaded();

    // Test Exact
    console.log("Testing search 'Scientific Reports'...");
    const r1 = getJournalMetricsByTitle('Scientific Reports');
    console.log("Result:", r1.found ? "Found" : r1.reason);

    // Test Fuzzy
    console.log("Testing search 'Scientific Report' (Approx)...");
    const r2 = getJournalMetricsByTitle('Scientific Report');
    console.log("Result:", r2.found ? "Found" : r2.reason);
    if (r2.found) console.log("Matched Journal:", r2.journal?.fullTitle);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
