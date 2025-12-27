import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listToolPermissions() {
    const perms = await prisma.toolPermission.findMany({
        orderBy: { toolName: 'asc' }
    });

    console.log('=== TOOL PERMISSIONS ===\n');
    for (const perm of perms) {
        console.log(`Tool: ${perm.toolName}`);
        console.log(`  Description: ${perm.description || 'N/A'}`);
        console.log(`  Allowed Roles: ${perm.allowedRoles.join(', ')}`);
        console.log('');
    }

    await prisma.$disconnect();
}

listToolPermissions().catch(console.error);
