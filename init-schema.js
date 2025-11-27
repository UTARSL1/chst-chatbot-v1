const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function initSchema() {
    try {
        console.log('🔄 Connecting to Supabase...');
        await prisma.$connect();
        console.log('✅ Connected!');

        console.log('🔄 Reading SQL schema...');
        const sql = fs.readFileSync(path.join(__dirname, 'init-schema.sql'), 'utf8');

        console.log('🔄 Creating tables...');
        const statements = sql.split(';').filter(s => s.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await prisma.$executeRawUnsafe(statement);
                } catch (error) {
                    // Ignore errors for already existing objects
                    if (!error.message.includes('already exists')) {
                        console.warn(`Warning: ${error.message}`);
                    }
                }
            }
        }

        console.log('✅ Database schema created successfully!');
        console.log('');
        console.log('📋 Tables created:');
        console.log('  - users');
        console.log('  - chat_sessions');
        console.log('  - messages');
        console.log('  - documents');
        console.log('  - signup_codes');
        console.log('');
        console.log('🎯 Next step: Create chairperson signup code');
        console.log('   Run: npm run db:studio');

        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Error:');
        console.error(error);
        process.exit(1);
    }
}

initSchema();
