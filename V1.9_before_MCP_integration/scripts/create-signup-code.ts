import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    // Generate a random signup code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g., "A1B2C3D4"

    const signupCode = await prisma.signupCode.create({
        data: {
            code: code,
            isUsed: false,
            expiresAt: null, // No expiration
        },
    });

    console.log('\n✅ Chairperson Signup Code Created!');
    console.log('=====================================');
    console.log(`Code: ${signupCode.code}`);
    console.log(`Created: ${signupCode.createdAt}`);
    console.log(`Status: Available (not used)`);
    console.log('=====================================');
    console.log('\nUse this code to sign up as a chairperson.');
    console.log('The code does not expire.\n');
}

main()
    .catch((e) => {
        console.error('Error creating signup code:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
