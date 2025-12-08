import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    // Check for existing unused code
    const existingCode = await prisma.signupCode.findFirst({
        where: { isUsed: false },
    });

    if (existingCode) {
        console.log(`Found existing unused code: ${existingCode.code}`);
        return;
    }

    // Generate new code
    const code = 'CHST-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    await prisma.signupCode.create({
        data: {
            code,
            isUsed: false,
        },
    });

    console.log(`Generated new chairperson code: ${code}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
