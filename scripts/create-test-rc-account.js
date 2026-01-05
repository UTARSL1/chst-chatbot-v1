/**
 * Create test RC member account
 * Email: tanlf@utar.edu.my
 * Password: password123
 * Role: member
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestAccount() {
    try {
        // Hash the password
        const passwordHash = await bcrypt.hash('password123', 10);

        // Create the user
        const user = await prisma.user.create({
            data: {
                email: 'tanlf@utar.edu.my',
                passwordHash: passwordHash,
                name: 'Tan Lee Fan',
                role: 'member',
                isApproved: true,
                isVerified: true,
            }
        });

        console.log('✅ Test account created successfully!');
        console.log('📧 Email: tanlf@utar.edu.my');
        console.log('🔑 Password: password123');
        console.log('👤 Role: member (RC Member)');
        console.log('🆔 Staff ID: 05251 (will be matched automatically)');
        console.log('\n🎯 This account can access:');
        console.log('   - Quick Access (RC)');
        console.log('   - RC Management dashboards');
        console.log('   - Own publication data (Staff ID: ?05251)');
        console.log('   - Own postgraduate supervision data');

    } catch (error) {
        if (error.code === 'P2002') {
            console.log('⚠️  Account already exists!');
            console.log('📧 Email: tanlf@utar.edu.my');
            console.log('🔑 Password: password123');
        } else {
            console.error('❌ Error creating account:', error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

createTestAccount();
