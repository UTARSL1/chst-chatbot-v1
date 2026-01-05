const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding RC Quick Access links...');

    const rcLinks = [
        {
            name: 'CHST Teams Portal',
            url: 'https://teams.microsoft.com/l/team/19%3A50c3f438061846c2809c8318fcf1ac17%40thread.tacv2/conversations?groupId=9795c98d-9bc0-4453-8150-0b2495001652&tenantId=4edf9354-0b3b-429a-bb8f-f21f957f1d1c',
            section: 'rc',
            roles: ['member', 'chairperson'], // Only for members and chairpersons
            order: 1,
            isSystem: true
        },
        {
            name: 'CHST LinkedIn Community',
            url: 'https://www.linkedin.com/company/hst-research-group/',
            section: 'rc',
            roles: ['public', 'student', 'member', 'chairperson'], // All roles
            order: 2,
            isSystem: true
        },
        {
            name: 'CHST Official Website',
            url: 'http://chst.research.utar.edu.my/',
            section: 'rc',
            roles: ['public', 'student', 'member', 'chairperson'], // All roles
            order: 3,
            isSystem: true
        },
        {
            name: 'CHST Resource Hub',
            url: 'https://www.dropbox.com/scl/fo/1lgconbww9vjda2vgsgiz/ALgvtMRZGD2J9oZrFzK9Gns?rlkey=ce7gkp0455zu90q6jpf7879hw&dl=0',
            section: 'rc',
            roles: ['member', 'chairperson'], // Only for members and chairpersons
            order: 4,
            isSystem: true
        }
    ];

    // Get a chairperson user to use as createdBy
    const chairperson = await prisma.user.findFirst({
        where: { role: 'chairperson' }
    });

    if (!chairperson) {
        console.error('No chairperson found. Please create a chairperson user first.');
        return;
    }

    for (const link of rcLinks) {
        // Check if link already exists
        const existing = await prisma.quickAccessLink.findFirst({
            where: {
                name: link.name,
                section: 'rc'
            }
        });

        if (existing) {
            console.log(`✓ Link already exists: ${link.name}`);
            continue;
        }

        await prisma.quickAccessLink.create({
            data: {
                ...link,
                createdBy: chairperson.id
            }
        });

        console.log(`✓ Created: ${link.name}`);
    }

    console.log('✅ RC Quick Access links seeded successfully!');
}

main()
    .catch(e => {
        console.error('Error seeding RC links:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
