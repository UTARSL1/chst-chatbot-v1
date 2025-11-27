const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testPassword() {
    try {
        // Get the user
        const user = await prisma.user.findUnique({
            where: { email: 'humyc@utar.edu.my' },
        });

        if (!user) {
            console.log('❌ User not found!');
            return;
        }

        console.log('✅ User found:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Is Approved: ${user.isApproved}`);
        console.log(`   Password Hash: ${user.passwordHash.substring(0, 20)}...`);
        console.log('');

        // Test password
        const testPassword = process.argv[2];
        if (!testPassword) {
            console.log('ℹ️  Usage: node test-password.js YOUR_PASSWORD');
            return;
        }

        console.log(`🔄 Testing password: ${testPassword}`);
        const isValid = await bcrypt.compare(testPassword, user.passwordHash);

        if (isValid) {
            console.log('✅ Password is CORRECT!');
        } else {
            console.log('❌ Password is INCORRECT!');
            console.log('');
            console.log('Debugging info:');
            console.log(`   Password length: ${testPassword.length}`);
            console.log(`   Hash length: ${user.passwordHash.length}`);
            console.log(`   Hash starts with: ${user.passwordHash.substring(0, 7)}`);
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

testPassword();
