import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedKnowledgeBase() {
    console.log('🌱 Seeding knowledge base defaults...');

    // Seed default departments
    const departments = [
        { name: 'Human Resources', abbreviation: 'HR', icon: '👥', color: '#3b82f6' },
        { name: 'IPSR (Research)', abbreviation: 'IPSR', icon: '🔬', color: '#8b5cf6' },
        { name: 'Consultancy', abbreviation: 'CONS', icon: '💼', color: '#10b981' },
        { name: 'CHST', abbreviation: 'CHST', icon: '🎓', color: '#f59e0b' },
        { name: 'Finance', abbreviation: 'FIN', icon: '💰', color: '#ef4444' },
        { name: 'Academic Affairs', abbreviation: 'AA', icon: '📚', color: '#06b6d4' },
        { name: 'Student Affairs', abbreviation: 'SA', icon: '🎒', color: '#ec4899' },
        { name: 'General', abbreviation: 'GEN', icon: '📋', color: '#6b7280' },
    ];

    for (const dept of departments) {
        await prisma.department.upsert({
            where: { name: dept.name },
            update: {},
            create: dept,
        });
    }
    console.log(`✅ Created ${departments.length} departments`);

    // Seed default document types
    const documentTypes = [
        { name: 'Policy', icon: '📋', color: '#3b82f6' },
        { name: 'Form', icon: '📝', color: '#10b981' },
        { name: 'Procedure', icon: '📊', color: '#8b5cf6' },
        { name: 'FAQ', icon: '💡', color: '#f59e0b' },
        { name: 'Announcement', icon: '📢', color: '#ef4444' },
        { name: 'Meeting Minute', icon: '📅', color: '#06b6d4' },
    ];

    for (const type of documentTypes) {
        await prisma.documentType.upsert({
            where: { name: type.name },
            update: {},
            create: type,
        });
    }
    console.log(`✅ Created ${documentTypes.length} document types`);

    console.log('🎉 Knowledge base seeding complete!');
}

seedKnowledgeBase()
    .catch((e) => {
        console.error('❌ Error seeding knowledge base:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
