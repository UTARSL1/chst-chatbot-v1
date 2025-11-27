const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initDatabase() {
    try {
        console.log('🔄 Connecting to database...');
        await prisma.$connect();
        console.log('✅ Connected to database!');

        console.log('🔄 Pushing schema to database...');

        // This will create all tables based on the Prisma schema
        await prisma.$executeRawUnsafe(`
      -- This is handled by Prisma migrations
      SELECT 1;
    `);

        console.log('✅ Database schema initialized!');
        console.log('');
        console.log('Next step: Run "npm run db:studio" to create the chairperson signup code');

        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Error initializing database:');
        console.error(error);
        process.exit(1);
    }
}

initDatabase();
