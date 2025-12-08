
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting manual verification of all users...');

    try {
        const result = await prisma.user.updateMany({
            data: {
                isVerified: true,
            },
        });

        console.log(`✅ Successfully verified ${result.count} users.`);
    } catch (error) {
        console.error('❌ Error updating users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
