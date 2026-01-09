const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
require('dotenv/config');

const prisma = new PrismaClient();

async function testLogin() {
    const email = 'admin2@utar.edu.my';
    const password = 'utar123';

    // Find user (same way auth does it)
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log('✅ User found:', {
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        isVerified: user.isVerified
    });

    console.log('\nStored hash:', user.passwordHash);

    // Test password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log('\n🔐 Password test result:', isValid ? '✅ VALID' : '❌ INVALID');

    if (!isValid) {
        console.log('\n⚠️  Password does not match. Generating new hash...');
        const newHash = await bcrypt.hash(password, 12);
        console.log('New hash to use:', newHash);
    }

    await prisma.$disconnect();
}

testLogin().catch(console.error);
