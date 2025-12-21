import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);

        const admin = await prisma.user.upsert({
            where: { email: 'admin@utar.edu.my' },
            update: {},
            create: {
                email: 'admin@utar.edu.my',
                name: 'Admin',
                password: hashedPassword,
                role: 'chairperson',
                isApproved: true,
                isVerified: true,
            },
        });

        console.log('✅ Admin account created:', admin.email);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
