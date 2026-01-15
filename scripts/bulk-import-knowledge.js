const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Bulk import parsed knowledge base entries into Document Library
 * @param {string} userId - Admin user ID
 * @param {string} batchName - Name for this import batch
 */
async function bulkImportKnowledge(userId, batchName = null) {
    const parsedFile = path.join(__dirname, '../documents/parsed/parsed-knowledge-base.json');

    // Check if file exists
    if (!fs.existsSync(parsedFile)) {
        console.error('❌ Parsed data file not found:', parsedFile);
        console.log('Please run: node scripts/parse-documents.js first');
        return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        console.error('❌ User not found:', userId);
        return;
    }

    console.log(`\n📥 Importing to Document Library as user: ${user.email}\n`);

    const data = JSON.parse(fs.readFileSync(parsedFile, 'utf8'));

    // Create batch record
    const batch = await prisma.documentLibraryBatch.create({
        data: {
            batchName: batchName || `Import ${new Date().toISOString().split('T')[0]}`,
            totalDocuments: data.length,
            totalSections: data.reduce((sum, doc) => sum + doc.sectionsCount, 0),
            status: 'processing',
            createdBy: userId
        }
    });

    console.log(`📦 Batch ID: ${batch.id}\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of data) {
        console.log(`\n📄 Processing: ${doc.sourceFile} (${doc.sectionsCount} sections)`);

        for (let i = 0; i < doc.sections.length; i++) {
            const section = doc.sections[i];

            try {
                // Check if already exists (by title and source file)
                const existing = await prisma.documentLibraryEntry.findFirst({
                    where: {
                        title: section.title,
                        sourceFile: section.metadata.sourceFile,
                        sectionIndex: i
                    }
                });

                if (existing) {
                    console.log(`  ⊘ Skipping duplicate: ${section.title}`);
                    skipped++;
                    continue;
                }

                // Create document library entry
                await prisma.documentLibraryEntry.create({
                    data: {
                        documentTitle: section.documentTitle,  // Parent document title
                        title: section.title,  // Section title
                        content: section.content,
                        department: section.metadata.department,
                        documentType: section.metadata.documentType,
                        tags: section.metadata.tags,
                        priority: section.metadata.priority || 'standard',
                        accessLevel: section.metadata.accessLevel || ['student', 'member', 'chairperson'],
                        status: 'active',
                        isActive: true,
                        sourceFile: section.metadata.sourceFile,
                        sectionIndex: i,
                        metadata: {
                            sourceFile: section.metadata.sourceFile,
                            department: section.metadata.department,
                            documentType: section.metadata.documentType,
                            batchId: batch.id
                        },
                        createdBy: userId
                    }
                });

                imported++;
                console.log(`  ✓ Imported: ${section.title}`);

            } catch (error) {
                errors++;
                console.error(`  ✗ Error importing "${section.title}":`, error.message);
            }
        }
    }

    // Update batch record
    await prisma.documentLibraryBatch.update({
        where: { id: batch.id },
        data: {
            importedCount: imported,
            skippedCount: skipped,
            errorCount: errors,
            status: 'completed',
            completedAt: new Date(),
            importLog: {
                documents: data.map(d => ({
                    file: d.sourceFile,
                    sections: d.sectionsCount
                }))
            }
        }
    });

    // Generate summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 Import Summary');
    console.log('='.repeat(60));
    console.log(`✓ Successfully imported: ${imported}`);
    console.log(`⊘ Skipped (duplicates):  ${skipped}`);
    console.log(`✗ Errors:                ${errors}`);
    console.log(`📝 Total processed:      ${imported + skipped + errors}`);
    console.log('='.repeat(60));

    // Save import log
    const logFile = path.join(__dirname, '../documents/parsed/import-log.txt');
    const log = `
Knowledge Base Import Log
=========================
Date: ${new Date().toISOString()}
User: ${user.email} (${userId})

Results:
- Imported: ${imported}
- Skipped: ${skipped}
- Errors: ${errors}
- Total: ${imported + skipped + errors}

Documents Processed: ${data.length}
`;

    fs.writeFileSync(logFile, log);
    console.log(`\n📄 Import log saved to: ${logFile}\n`);
}

/**
 * Validate parsed data before import
 */
async function validateParsedData() {
    const parsedFile = path.join(__dirname, '../documents/parsed/parsed-knowledge-base.json');

    if (!fs.existsSync(parsedFile)) {
        console.error('❌ Parsed data file not found');
        return false;
    }

    const data = JSON.parse(fs.readFileSync(parsedFile, 'utf8'));

    console.log('\n🔍 Validating parsed data...\n');

    let valid = true;
    let totalSections = 0;

    for (const doc of data) {
        console.log(`📄 ${doc.sourceFile}: ${doc.sectionsCount} sections`);

        for (const section of doc.sections) {
            totalSections++;
            const issues = [];

            if (!section.title || section.title.length < 5) {
                issues.push('Title too short');
            }

            if (!section.content || section.content.length < 50) {
                issues.push('Content too short');
            }

            if (!section.metadata.tags || section.metadata.tags.length === 0) {
                issues.push('No tags');
            }

            if (issues.length > 0) {
                console.log(`  ⚠ "${section.title}": ${issues.join(', ')}`);
                valid = false;
            }
        }
    }

    console.log(`\n📊 Validation complete: ${totalSections} sections checked`);

    if (valid) {
        console.log('✅ All sections passed validation\n');
    } else {
        console.log('⚠ Some sections have issues (see above)\n');
        console.log('You can still proceed with import, but consider reviewing the data.\n');
    }

    return valid;
}

/**
 * Show statistics about parsed data
 */
async function showStatistics() {
    const parsedFile = path.join(__dirname, '../documents/parsed/parsed-knowledge-base.json');

    if (!fs.existsSync(parsedFile)) {
        console.error('❌ Parsed data file not found');
        return;
    }

    const data = JSON.parse(fs.readFileSync(parsedFile, 'utf8'));

    const stats = {
        totalDocuments: data.length,
        totalSections: 0,
        departments: {},
        documentTypes: {},
        priorities: {},
        tags: {}
    };

    for (const doc of data) {
        stats.totalSections += doc.sectionsCount;

        for (const section of doc.sections) {
            // Count departments
            const dept = section.metadata.department;
            stats.departments[dept] = (stats.departments[dept] || 0) + 1;

            // Count document types
            const type = section.metadata.documentType;
            stats.documentTypes[type] = (stats.documentTypes[type] || 0) + 1;

            // Count priorities
            const priority = section.metadata.priority || 'standard';
            stats.priorities[priority] = (stats.priorities[priority] || 0) + 1;

            // Count tags
            for (const tag of section.metadata.tags) {
                stats.tags[tag] = (stats.tags[tag] || 0) + 1;
            }
        }
    }

    console.log('\n📊 Knowledge Base Statistics');
    console.log('='.repeat(60));
    console.log(`Documents: ${stats.totalDocuments}`);
    console.log(`Sections: ${stats.totalSections}`);
    console.log(`Avg sections per document: ${(stats.totalSections / stats.totalDocuments).toFixed(1)}`);

    console.log('\n📁 Departments:');
    Object.entries(stats.departments)
        .sort((a, b) => b[1] - a[1])
        .forEach(([dept, count]) => {
            console.log(`  ${dept}: ${count}`);
        });

    console.log('\n📋 Document Types:');
    Object.entries(stats.documentTypes)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });

    console.log('\n⚡ Priorities:');
    Object.entries(stats.priorities)
        .sort((a, b) => b[1] - a[1])
        .forEach(([priority, count]) => {
            console.log(`  ${priority}: ${count}`);
        });

    console.log('\n🏷️  Top Tags:');
    Object.entries(stats.tags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .forEach(([tag, count]) => {
            console.log(`  ${tag}: ${count}`);
        });

    console.log('\n' + '='.repeat(60) + '\n');
}

// Main execution
async function main() {
    const command = process.argv[2];
    const userId = process.argv[3];

    if (command === 'validate') {
        await validateParsedData();
    } else if (command === 'stats') {
        await showStatistics();
    } else if (command === 'import') {
        if (!userId) {
            console.error('Usage: node bulk-import-knowledge.js import <admin-user-id> [batch-name]');
            console.log('\nTo get your admin user ID, run this SQL query in Supabase:');
            console.log('  SELECT id, email FROM users WHERE role = \'chairperson\';');
            process.exit(1);
        }
        const batchName = process.argv[4];
        await bulkImportKnowledge(userId, batchName);
    } else {
        console.log('Knowledge Base Bulk Import Tool');
        console.log('================================\n');
        console.log('Usage:');
        console.log('  node bulk-import-knowledge.js validate');
        console.log('  node bulk-import-knowledge.js stats');
        console.log('  node bulk-import-knowledge.js import <admin-user-id>\n');
        console.log('Examples:');
        console.log('  node bulk-import-knowledge.js validate');
        console.log('  node bulk-import-knowledge.js stats');
        console.log('  node bulk-import-knowledge.js import abc123-def456-...\n');
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch((error) => {
        console.error('Fatal error:', error);
        prisma.$disconnect();
        process.exit(1);
    });
