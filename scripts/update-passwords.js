const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updatePassword() {
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash('password123', 10);

        console.log('Hashed password:', hashedPassword);

        // Update admin account
        await prisma.user.update({
            where: { email: 'admin@utar.edu.my' },
            data: { passwordHash: hashedPassword },
        });

        console.log('✅ Admin password updated successfully!');

        // Update member account
        const hashedPassword2 = await bcrypt.hash('Canaliculus@34', 10);
        await prisma.user.update({
            where: { email: 'humyc@utar.edu.my' },
            data: { passwordHash: hashedPassword2 },
        });

        console.log('✅ Member password updated successfully!');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updatePassword();
