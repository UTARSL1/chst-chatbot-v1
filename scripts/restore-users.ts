import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

async function restoreUsers(filename: string) {
    try {
        const csv = readFileSync(filename, 'utf-8');
        const lines = csv.split('\n').slice(1); // Skip header

        let restored = 0;
        for (const line of lines) {
            if (!line.trim()) continue;

            const [email, name, password, role, isApproved, isVerified, recoveryEmail, createdAt] = line.split(',');

            await prisma.user.upsert({
                where: { email },
                update: {},
                create: {
                    email,
                    name: name || null,
                    password,
                    role: role as any,
                    isApproved: isApproved === 'true',
                    isVerified: isVerified === 'true',
                    recoveryEmail: recoveryEmail || null,
                    createdAt: new Date(createdAt),
                },
            });

            restored++;
        }

        console.log(`✅ Restored ${restored} users from ${filename}`);
    } catch (error) {
        console.error('❌ Restore failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Usage: npx ts-node scripts/restore-users.ts backup-users-2025-12-22.csv
const filename = process.argv[2];
if (!filename) {
    console.error('❌ Please provide backup filename');
    process.exit(1);
}

restoreUsers(filename);
