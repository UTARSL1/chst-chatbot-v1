
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@utar.edu.my';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            role: 'chairperson',
            isApproved: true,
        },
        create: {
            email,
            name: 'Admin User',
            passwordHash: hashedPassword,
            role: 'chairperson',
            isApproved: true,
        },
    });

    console.log(`Admin user created/updated: ${user.email} / ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
