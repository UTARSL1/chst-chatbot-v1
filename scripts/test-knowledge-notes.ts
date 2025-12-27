// Quick test to verify knowledge notes exist in database
import { prisma } from '../lib/db';

async function testKnowledgeNotes() {
    console.log('=== Testing Knowledge Note Database ===\n');

    // 1. Get ALL knowledge notes (no filters)
    console.log('1. Fetching ALL knowledge notes (no filters)...');
    const allNotes = await prisma.knowledgeNote.findMany({
        select: {
            id: true,
            title: true,
            isActive: true,
            status: true,
            accessLevel: true,
        }
    });
    console.log(`   Total notes: ${allNotes.length}`);
    allNotes.forEach(note => {
        console.log(`   - "${note.title}"`);
        console.log(`     isActive: ${note.isActive}, status: ${note.status}`);
        console.log(`     accessLevel: [${note.accessLevel.join(', ')}]`);
    });

    // 2. Test with chairperson access levels
    console.log('\n2. Testing with chairperson access levels...');
    const chairpersonLevels = ['public', 'student', 'member', 'chairperson'];
    console.log(`   Access levels: [${chairpersonLevels.join(', ')}]`);

    const chairpersonNotes = await prisma.knowledgeNote.findMany({
        where: {
            isActive: true,
            status: 'active',
            accessLevel: {
                hasSome: chairpersonLevels,
            },
        },
        select: {
            id: true,
            title: true,
            accessLevel: true,
        }
    });

    console.log(`   Notes accessible to chairperson: ${chairpersonNotes.length}`);
    chairpersonNotes.forEach(note => {
        console.log(`   - "${note.title}"`);
        console.log(`     accessLevel: [${note.accessLevel.join(', ')}]`);
    });

    // 3. Find RSS note specifically
    console.log('\n3. Looking for RSS note...');
    const rssNotes = allNotes.filter(note =>
        note.title.toLowerCase().includes('rss') ||
        note.title.toLowerCase().includes('research scholar')
    );

    if (rssNotes.length > 0) {
        console.log(`   Found ${rssNotes.length} RSS note(s):`);
        rssNotes.forEach(note => {
            console.log(`   ✅ "${note.title}"`);
            console.log(`      isActive: ${note.isActive}`);
            console.log(`      status: ${note.status}`);
            console.log(`      accessLevel: [${note.accessLevel.join(', ')}]`);

            // Check if chairperson can access it
            const hasOverlap = note.accessLevel.some(level => chairpersonLevels.includes(level));
            console.log(`      Chairperson can access: ${hasOverlap ? '✅ YES' : '❌ NO'}`);
        });
    } else {
        console.log('   ❌ No RSS notes found!');
    }

    await prisma.$disconnect();
}

testKnowledgeNotes()
    .then(() => {
        console.log('\n=== Test Complete ===');
        process.exit(0);
    })
    .catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
