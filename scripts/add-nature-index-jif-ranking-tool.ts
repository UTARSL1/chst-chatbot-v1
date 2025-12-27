import { prisma } from '../lib/db';

async function addNatureIndexJifRankingTool() {
    const toolName = 'nature_index_journals_ranked_by_jif';
    const description = 'Get top N Nature Index journals ranked by Journal Impact Factor (JIF)';
    const allRoles = ['public', 'student', 'member', 'chairperson'];

    try {
        const existing = await prisma.toolPermission.findUnique({
            where: { toolName }
        });

        if (existing) {
            console.log(`✅ Tool "${toolName}" already exists in database`);
            console.log(`   Allowed roles: ${existing.allowedRoles.join(', ')}`);
        } else {
            await prisma.toolPermission.create({
                data: {
                    toolName,
                    description,
                    allowedRoles: allRoles
                }
            });
            console.log(`✅ Successfully added "${toolName}" to database`);
            console.log(`   Allowed roles: ${allRoles.join(', ')}`);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addNatureIndexJifRankingTool();
