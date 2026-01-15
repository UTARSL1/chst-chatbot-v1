const fs = require('fs');
const path = require('path');

/**
 * Parse markdown documents into structured sections
 * Markdown files should already have proper table formatting from pymupdf4llm
 */

async function parseMarkdownDocument(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath, 'utf8');

    console.log(`  Parsing ${path.basename(filePath)}...`);

    // Split into logical sections
    const sections = splitIntoSections(content);

    // Get document title once
    const documentTitle = extractTitle(content);
    const baseFilename = path.basename(filePath, ext);

    // Extract metadata once at document level
    const documentMetadata = extractMetadata(content, filePath);

    // Convert to knowledge base format
    return sections.map((section, index) => {
        let sectionTitle = section.title;

        if (!sectionTitle) {
            sectionTitle = extractTitle(section.content);
        }

        // Build final title
        let finalTitle;
        if (sectionTitle && sectionTitle !== documentTitle) {
            finalTitle = `${documentTitle} - ${sectionTitle}`;
        } else if (sectionTitle) {
            finalTitle = sectionTitle;
        } else {
            finalTitle = `${baseFilename} - Section ${index + 1}`;
        }

        return {
            title: finalTitle,
            content: section.content.trim(),  // Keep markdown as-is
            metadata: documentMetadata
        };
    });
}

/**
 * Split markdown content into logical sections
 */
function splitIntoSections(content) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = [];
    let currentSectionTitle = null;
    let previousSectionTitle = null;

    // IPSR-specific section markers
    const iprsrSectionMarkers = [
        /^\*\*OBJECTIVE\*\*/i,
        /^\*\*SCOPE\*\*/i,
        /^\*\*DEFINITION\*\*/i,
        /^\|PROCESS/i,  // Table header
        /^Appendix\s+[A-Z]/i,
        /^\|DEPT\|PROCESS\|/i,
        /^Panel of Examiner.*Requirements/i,
        /^Role of the Panel of Examiners/i,
        /^Additional Standard Operating Procedure/i,
        /^\*\*PROCEDURE MANUAL\*\*/i
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Check if this line is a section marker
        const isIPSRSection = iprsrSectionMarkers.some(pattern => pattern.test(trimmedLine));

        // Also detect markdown headers
        const isMarkdownHeader = line.match(/^#{1,3}\s+/);

        const isHeader = isIPSRSection || isMarkdownHeader;

        // Only create new section if it's a different header
        if (isHeader && currentSection.length > 0 && trimmedLine !== previousSectionTitle) {
            const sectionText = currentSection.join('\n').trim();
            if (sectionText.length > 100) {
                sections.push({
                    title: currentSectionTitle,
                    content: sectionText
                });
                previousSectionTitle = currentSectionTitle;
            }
            currentSection = [];
            currentSectionTitle = trimmedLine.replace(/^\*\*|\*\*$/g, '').replace(/^#+\s+/, '');
        }

        currentSection.push(line);

        if (!currentSectionTitle && trimmedLine.length > 5) {
            currentSectionTitle = trimmedLine.replace(/^\*\*|\*\*$/g, '');
        }
    }

    // Add final section
    if (currentSection.length > 0) {
        const sectionText = currentSection.join('\n').trim();
        if (sectionText.length > 100) {
            sections.push({
                title: currentSectionTitle,
                content: sectionText
            });
        }
    }

    if (sections.length === 0) {
        sections.push({
            title: null,
            content: content
        });
    }

    return sections;
}

/**
 * Extract title from markdown content
 */
function extractTitle(content) {
    const lines = content.split('\n');

    // Look for "Manual Title :" in table
    for (const line of lines) {
        const match = line.match(/Manual Title\s*:\s*([^|]+)/i);
        if (match) {
            return match[1].trim();
        }
    }

    // Try markdown header
    for (const line of lines) {
        const match = line.match(/^#{1,3}\s+(.+)/);
        if (match) return match[1].trim();
    }

    // Try bold text
    for (const line of lines) {
        const match = line.match(/^\*\*([^*]+)\*\*$/);
        if (match) return match[1].trim();
    }

    return null;
}

/**
 * Extract metadata from content
 */
function extractMetadata(content, filePath) {
    const filename = path.basename(filePath, path.extname(filePath));

    return {
        department: detectDepartment(content, filename),
        documentType: detectDocumentType(content, filename),
        tags: extractTags(content, filename),
        sourceFile: filename,
        priority: detectPriority(content)
    };
}

function detectDepartment(content, filename) {
    const departments = [
        { name: 'Human Resources', keywords: ['hr', 'human resources', 'personnel', 'staff', 'employee'] },
        { name: 'IPSR', keywords: ['ipsr', 'research', 'innovation', 'postgraduate', 'phd', 'masters'] },
        { name: 'Consultancy', keywords: ['consultancy', 'consulting', 'advisory'] },
        { name: 'CHST', keywords: ['chst', 'health sciences', 'medical'] },
        { name: 'Finance', keywords: ['finance', 'accounting', 'budget', 'funding'] },
        { name: 'Academic Affairs', keywords: ['academic', 'curriculum', 'teaching', 'course'] },
        { name: 'Student Affairs', keywords: ['student', 'admission', 'enrollment'] }
    ];

    const text = (content + ' ' + filename).toLowerCase();

    for (const dept of departments) {
        if (dept.keywords.some(kw => text.includes(kw))) {
            return dept.name;
        }
    }

    return 'General';
}

function detectDocumentType(content, filename) {
    const types = {
        'Policy': ['policy', 'guideline', 'regulation', 'rule', 'procedure manual'],
        'Form': ['form', 'application', 'template', 'request'],
        'Procedure': ['procedure', 'process', 'workflow', 'step'],
        'FAQ': ['faq', 'question', 'answer', 'q&a'],
        'Announcement': ['announcement', 'notice', 'update', 'news'],
        'Meeting Minute': ['meeting', 'minute', 'agenda', 'discussion']
    };

    const text = (content + ' ' + filename).toLowerCase();

    for (const [type, keywords] of Object.entries(types)) {
        if (keywords.some(kw => text.includes(kw))) {
            return type;
        }
    }

    return 'Policy';
}

function extractTags(content, filename) {
    const text = (content + ' ' + filename).toLowerCase();
    const tags = [];

    const keywords = [
        'sabbatical', 'leave', 'training', 'grant', 'publication',
        'research', 'teaching', 'student', 'faculty', 'staff',
        'conference', 'workshop', 'seminar', 'funding', 'scholarship',
        'application', 'approval', 'deadline', 'requirement', 'eligibility',
        'postgraduate', 'undergraduate', 'phd', 'masters', 'bachelor',
        'exam', 'assessment', 'grading', 'evaluation', 'feedback'
    ];

    for (const keyword of keywords) {
        if (text.includes(keyword) && !tags.includes(keyword)) {
            tags.push(keyword);
        }
    }

    return tags;
}

function detectPriority(content) {
    const text = content.toLowerCase();

    if (text.includes('urgent') || text.includes('critical') || text.includes('immediate')) {
        return 'critical';
    }
    if (text.includes('important') || text.includes('deadline') || text.includes('required')) {
        return 'high';
    }
    return 'standard';
}

/**
 * Main execution
 */
async function main() {
    const inputDir = path.join(__dirname, '../documents/markdown');
    const outputDir = path.join(__dirname, '../documents/parsed');

    if (!fs.existsSync(inputDir)) {
        console.log(`Error: Markdown directory not found: ${inputDir}`);
        console.log('Please run: python scripts/batch-convert-pdfs.py documents/to-process/ documents/markdown/');
        return;
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get all markdown files
    const files = fs.readdirSync(inputDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.md';
    });

    if (files.length === 0) {
        console.log('No markdown files found in:', inputDir);
        return;
    }

    console.log(`\n📄 Found ${files.length} markdown files to process\n`);

    const results = [];
    let totalSections = 0;

    for (const file of files) {
        const filePath = path.join(inputDir, file);

        try {
            const sections = await parseMarkdownDocument(filePath);
            results.push({
                sourceFile: file,
                sectionsCount: sections.length,
                sections: sections
            });
            totalSections += sections.length;
            console.log(`  ✓ Extracted ${sections.length} sections`);
        } catch (error) {
            console.error(`  ✗ Error processing ${file}:`, error.message);
        }
    }

    // Save results
    const outputFile = path.join(outputDir, 'parsed-knowledge-base.json');
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

    // Generate summary
    const summaryFile = path.join(outputDir, 'parsing-summary.txt');
    const summary = `
Knowledge Base Parsing Summary (Markdown)
==========================================
Date: ${new Date().toISOString()}

Documents Processed: ${results.length}
Total Sections: ${totalSections}
Average Sections per Document: ${(totalSections / results.length).toFixed(1)}

✅ Tables preserved in markdown format
✅ LLM can render tables in responses

Output Files:
- ${outputFile}
- ${summaryFile}

Next Steps:
1. Review the parsed data in: ${outputFile}
2. Run bulk import: node scripts/bulk-import-knowledge.js import <admin-user-id> "IPSR Policies"
`;

    fs.writeFileSync(summaryFile, summary);

    console.log(`\n✅ Parsing Complete!`);
    console.log(`   Documents: ${results.length}`);
    console.log(`   Sections: ${totalSections}`);
    console.log(`   Output: ${outputFile}`);
    console.log(`\n✨ Tables are preserved in markdown format!`);
    console.log(`   LLM can now render tables in responses.`);
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { parseMarkdownDocument, splitIntoSections, extractMetadata };
