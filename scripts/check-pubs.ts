
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPublicationTypes() {
    try {
        console.log('Checking publication types...');

        const publications = await prisma.publication.findMany({
            select: {
                wosQuartile: true
            },
            distinct: ['wosQuartile']
        });

        console.log('Distinct Quartiles found in DB:');
        publications.forEach(p => console.log(`- "${p.wosQuartile}"`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPublicationTypes();
