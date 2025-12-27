import { PrismaClient } from '@prisma/client';
import { ensureJcrCacheLoaded, getJournalMetricsByTitle } from '../lib/jcrCache';

const prisma = new PrismaClient();

async function testMappings() {
    console.log('Loading JCR cache...');
    await ensureJcrCacheLoaded();

    // Test the direct mapping for Nature Index journals
    const testJournals = [
        'British Journal of Surgery',
        'Journal of Physiology',
        'The Lancet',
        'The New England Journal of Medicine',
        'JAMA: The Journal of the American Medical Association',
        'Environmental Science and Technology',
        'Angewandte Chemie International Edition',
        'The ISME Journal: Multidisciplinary Journal of Microbial Ecology',
        'Proceedings of the Royal Society B',
        'The Astrophysical Journal Letters',
    ];

    console.log('\nTesting Nature Index journal name mappings:\n');

    for (const journal of testJournals) {
        const result = getJournalMetricsByTitle(journal, [2024]);
        if (result.found) {
            console.log(`✓ ${journal}`);
            console.log(`  -> Matched: ${result.journal.fullTitle}`);
            console.log(`  -> JIF 2024: ${result.metrics[0]?.jifValue || 'N/A'}\n`);
        } else {
            console.log(`✗ ${journal}`);
            console.log(`  -> ${result.reason}\n`);
        }
    }

    // Check total records in database
    const count = await prisma.jcrJournalMetric.count({ where: { jifYear: 2024 } });
    console.log(`\nTotal JCR 2024 records in database: ${count}`);

    await prisma.$disconnect();
}

testMappings().catch(console.error);
