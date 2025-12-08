
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInventory() {
    console.log('Testing inventory query...');

    const userRole = 'chairperson';
    const accessLevels = ['student', 'member', 'chairperson'];

    console.log('Role:', userRole);
    console.log('Access Levels:', accessLevels);

    try {
        const allDocuments = await prisma.document.findMany({
            where: {
                accessLevel: {
                    in: accessLevels,
                },
                status: 'processed',
            },
            select: {
                filename: true,
                category: true,
                department: true,
            },
            orderBy: [
                { category: 'asc' },
                { filename: 'asc' },
            ],
        });

        console.log('Success! Found documents:', allDocuments.length);
        console.log(JSON.stringify(allDocuments, null, 2));
    } catch (error) {
        console.error('Error executing query:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testInventory();
