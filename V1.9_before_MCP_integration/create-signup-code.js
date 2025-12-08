const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSignupCode() {
    try {
        console.log('🔄 Creating chairperson signup code...');

        const code = await prisma.signupCode.create({
            data: {
                code: 'CHST-ADMIN-2025',
                isUsed: false,
            },
        });

        console.log('✅ Chairperson signup code created!');
        console.log('');
        console.log('📋 Code Details:');
        console.log(`   Code: ${code.code}`);
        console.log(`   ID: ${code.id}`);
        console.log(`   Created: ${code.createdAt}`);
        console.log('');
        console.log('🎯 Next step: Start the app!');
        console.log('   Run: npm run dev');
        console.log('');
        console.log('Then visit: http://localhost:3000');
        console.log('Sign up with this code to create your chairperson account!');

        await prisma.$disconnect();
    } catch (error) {
        if (error.code === 'P2002') {
            console.log('ℹ️  Signup code already exists!');
            console.log('   Code: CHST-ADMIN-2025');
            console.log('');
            console.log('🎯 You can start the app now!');
            console.log('   Run: npm run dev');
        } else {
            console.error('❌ Error:');
            console.error(error);
            process.exit(1);
        }
    }
}

createSignupCode();
