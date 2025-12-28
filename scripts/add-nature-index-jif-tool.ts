import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addNatureIndexJifTool() {
    try {
        // Check if tool already exists
        const existing = await prisma.toolPermission.findUnique({
            where: { toolName: 'nature_index_journal_list_with_jif' }
        });

        if (existing) {
            console.log('✅ Tool permission already exists for nature_index_journal_list_with_jif');
            console.log(`   Current allowed roles: ${existing.allowedRoles.join(', ')}`);
            await prisma.$disconnect();
            return;
        }

        // Create new tool permission
        const newTool = await prisma.toolPermission.create({
            data: {
                toolName: 'nature_index_journal_list_with_jif',
                description: 'Get top N Nature Index journals ranked by Journal Impact Factor (JIF)',
                allowedRoles: ['public', 'student', 'member', 'chairperson'] // All roles
            }
        });

        console.log('✅ Successfully added tool permission:');
        console.log(`   Tool: ${newTool.toolName}`);
        console.log(`   Description: ${newTool.description}`);
        console.log(`   Allowed Roles: ${newTool.allowedRoles.join(', ')}`);

    } catch (error) {
        console.error('❌ Error adding tool permission:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addNatureIndexJifTool().catch(console.error);
