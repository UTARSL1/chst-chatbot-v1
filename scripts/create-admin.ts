import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminAccount() {
    try {
        // Admin account details
        const email = 'admin@utar.edu.my';
        const password = 'password123';
        const name = 'Admin User';

        // Check if admin already exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email }
        });

        if (existingAdmin) {
            console.log('❌ Admin account already exists with email:', email);
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create admin account
        const admin = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
                role: 'chairperson',
                isApproved: true,
                isVerified: true,
            }
        });

        console.log('✅ Admin account created successfully!');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('👤 Name:', name);
        console.log('🎭 Role:', admin.role);
        console.log('\n⚠️  Please change the password after first login!');

    } catch (error) {
        console.error('❌ Error creating admin account:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdminAccount();
