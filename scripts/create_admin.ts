import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 10) : 'undefined');
    const email = 'admin2@utar.edu.my';
    const password = 'admin123';
    const name = 'Admin 2';

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        console.log(`User with email ${email} already exists.`);
        return;
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            name,
            role: 'chairperson',
            isApproved: true,
            isVerified: true,
        },
    });

    console.log(`User created: ${user.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
