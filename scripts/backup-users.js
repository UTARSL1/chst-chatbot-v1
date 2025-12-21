const { PrismaClient } = require('@prisma/client');
const { writeFileSync } = require('fs');

const prisma = new PrismaClient();

async function backupUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                name: true,
                password: true,
                role: true,
                isApproved: true,
                isVerified: true,
                recoveryEmail: true,
                createdAt: true,
            },
        });

        const csv = [
            'email,name,password,role,isApproved,isVerified,recoveryEmail,createdAt',
            ...users.map(u =>
                `${u.email},"${(u.name || '').replace(/"/g, '""')}",${u.password},${u.role},${u.isApproved},${u.isVerified},${u.recoveryEmail || ''},${u.createdAt.toISOString()}`
            )
        ].join('\n');

        const filename = `backup-users-${new Date().toISOString().split('T')[0]}.csv`;
        writeFileSync(filename, csv);

        console.log(`✅ Backup created: ${filename}`);
        console.log(`📊 Total users backed up: ${users.length}`);
    } catch (error) {
        console.error('❌ Backup failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

backupUsers();
