import { searchDocumentLibrary } from '../lib/rag/documentLibrarySearch';

async function testSearch() {
    const query = "What are the English proficiency requirements for a PhD student from a country where English is not the medium of instruction?";
    const accessLevels = ['student', 'member', 'chairperson'];

    console.log('Testing Document Library search...\n');
    console.log('Query:', query);
    console.log('Access Levels:', accessLevels);
    console.log('\n---\n');

    const results = await searchDocumentLibrary(query, accessLevels, 10);

    console.log(`\nFound ${results.length} results:\n`);
    results.forEach((result, i) => {
        console.log(`${i + 1}. ${result.documentTitle}`);
        console.log(`   Section: ${result.title}`);
        console.log(`   Score: (calculated during search)`);
        console.log('');
    });
}

testSearch();
