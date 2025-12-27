import { prisma } from '../lib/db';
import { getAccessibleLevels } from '../lib/utils';

async function diagnoseKnowledgeNotes() {
    console.log('=== Knowledge Note Diagnosis ===\n');

    // 1. Check all knowledge notes in database
    console.log('1. Checking all knowledge notes in database...');
    const allNotes = await prisma.knowledgeNote.findMany({
        select: {
            id: true,
            title: true,
            isActive: true,
            status: true,
            accessLevel: true,
            tags: true,
        }
    });

    console.log(`   Total notes in database: ${allNotes.length}\n`);

    // 2. Find RSS note specifically
    console.log('2. Looking for RSS knowledge note...');
    const rssNotes = allNotes.filter(note =>
        note.title.toLowerCase().includes('rss') ||
        note.title.toLowerCase().includes('research scholar')
    );

    if (rssNotes.length > 0) {
        console.log(`   Found ${rssNotes.length} RSS-related note(s):\n`);
        rssNotes.forEach(note => {
            console.log(`   📋 Title: "${note.title}"`);
            console.log(`      ID: ${note.id}`);
            console.log(`      isActive: ${note.isActive}`);
            console.log(`      status: ${note.status}`);
            console.log(`      accessLevel: [${note.accessLevel.join(', ')}]`);
            console.log(`      tags: [${(note.tags || []).join(', ')}]`);
            console.log('');
        });
    } else {
        console.log('   ❌ No RSS-related notes found!\n');
    }

    // 3. Check what access levels chairperson has
    console.log('3. Checking chairperson access levels...');
    const chairpersonLevels = getAccessibleLevels('chairperson');
    console.log(`   Chairperson access levels: [${chairpersonLevels.join(', ')}]\n`);

    // 4. Test the actual query used in knowledgeSearch
    console.log('4. Testing actual knowledge search query...');
    const searchResults = await prisma.knowledgeNote.findMany({
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

    console.log(`   Query returned: ${searchResults.length} notes\n`);

    if (searchResults.length > 0) {
        console.log('   Notes accessible to chairperson:');
        searchResults.forEach(note => {
            console.log(`   - "${note.title}" (accessLevel: [${note.accessLevel.join(', ')}])`);
        });
    } else {
        console.log('   ❌ No notes accessible to chairperson with current query!');
    }

    // 5. Check if RSS note would match if we ignore access levels
    console.log('\n5. Testing query WITHOUT access level filter...');
    const noAccessFilterResults = await prisma.knowledgeNote.findMany({
        where: {
            isActive: true,
            status: 'active',
        },
        select: {
            id: true,
            title: true,
            accessLevel: true,
        }
    });

    const rssInResults = noAccessFilterResults.filter(note =>
        note.title.toLowerCase().includes('rss') ||
        note.title.toLowerCase().includes('research scholar')
    );

    if (rssInResults.length > 0) {
        console.log(`   ✅ Found ${rssInResults.length} RSS note(s) when ignoring access levels:`);
        rssInResults.forEach(note => {
            console.log(`      - "${note.title}"`);
            console.log(`        accessLevel: [${note.accessLevel.join(', ')}]`);
            console.log(`        Chairperson has: [${chairpersonLevels.join(', ')}]`);

            // Check if there's overlap
            const hasOverlap = note.accessLevel.some(level => chairpersonLevels.includes(level));
            console.log(`        Has overlap: ${hasOverlap ? '✅ YES' : '❌ NO'}`);
        });
    }

    console.log('\n=== Diagnosis Complete ===');
}

diagnoseKnowledgeNotes()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
