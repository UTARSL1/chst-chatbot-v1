const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Parse a document into structured sections
 * @param {string} filePath - Path to the document
 * @returns {Promise<Array>} Array of parsed sections
 */
async function parseDocument(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    console.log(`  Parsing ${path.basename(filePath)}...`);

    // Parse based on file type
    let content = '';
    if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        content = data.text;
    } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        content = result.value;
    } else if (ext === '.txt' || ext === '.md') {
        content = fs.readFileSync(filePath, 'utf8');
    } else {
        throw new Error(`Unsupported file type: ${ext}`);
    }

    // Split into logical sections
    const sections = splitIntoSections(content);

    // Convert to knowledge base format
    return sections.map((section, index) => ({
        title: extractTitle(section) || `${path.basename(filePath, ext)} - Section ${index + 1}`,
        content: convertToMarkdown(section),
        metadata: extractMetadata(section, filePath)
    }));
}

/**
 * Split content into logical sections based on headers
 */
function splitIntoSections(content) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = [];

    for (const line of lines) {
        // Detect section headers (markdown headers or bold text)
        const isHeader = line.match(/^#{1,3}\s+/) ||
            line.match(/^\*\*[^*]+\*\*$/) ||
            line.match(/^[A-Z][A-Za-z\s]{3,}:$/); // "Section Name:"

        if (isHeader && currentSection.length > 0) {
            // Save previous section
            const sectionText = currentSection.join('\n').trim();
            if (sectionText.length > 100) { // Minimum section length
                sections.push(sectionText);
            }
            currentSection = [];
        }
        currentSection.push(line);
    }

    // Add final section
    if (currentSection.length > 0) {
        const sectionText = currentSection.join('\n').trim();
        if (sectionText.length > 100) {
            sections.push(sectionText);
        }
    }

    // If no sections found, treat entire document as one section
    if (sections.length === 0) {
        sections.push(content);
    }

    return sections;
}

/**
 * Extract title from section
 */
function extractTitle(section) {
    const lines = section.split('\n');
    for (const line of lines) {
        // Try markdown header
        let match = line.match(/^#{1,3}\s+(.+)/);
        if (match) return match[1].trim();

        // Try bold text
        match = line.match(/^\*\*([^*]+)\*\*$/);
        if (match) return match[1].trim();

        // Try "Title:" format
        match = line.match(/^([A-Z][A-Za-z\s]{3,}):$/);
        if (match) return match[1].trim();
    }

    // Use first non-empty line as title
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 5 && trimmed.length < 100) {
            return trimmed;
        }
    }

    return null;
}

/**
 * Convert section to clean markdown
 */
function convertToMarkdown(section) {
    return section
        .replace(/\r\n/g, '\n')           // Normalize line endings
        .replace(/\n{3,}/g, '\n\n')       // Remove excessive blank lines
        .replace(/\t/g, '  ')             // Convert tabs to spaces
        .trim();
}

/**
 * Extract metadata from section
 */
function extractMetadata(section, filePath) {
    const filename = path.basename(filePath, path.extname(filePath));

    return {
        department: detectDepartment(section, filename),
        documentType: detectDocumentType(section, filename),
        tags: extractTags(section, filename),
        sourceFile: filename,
        priority: detectPriority(section)
    };
}

/**
 * Detect department from content
 */
function detectDepartment(section, filename) {
    const departments = [
        { name: 'Human Resources', keywords: ['hr', 'human resources', 'personnel', 'staff', 'employee'] },
        { name: 'IPSR', keywords: ['ipsr', 'research', 'innovation', 'r&d'] },
        { name: 'Consultancy', keywords: ['consultancy', 'consulting', 'advisory'] },
        { name: 'CHST', keywords: ['chst', 'health sciences', 'medical'] },
        { name: 'Finance', keywords: ['finance', 'accounting', 'budget', 'funding'] },
        { name: 'Academic Affairs', keywords: ['academic', 'curriculum', 'teaching', 'course'] },
        { name: 'Student Affairs', keywords: ['student', 'admission', 'enrollment'] }
    ];

    const text = (section + ' ' + filename).toLowerCase();

    for (const dept of departments) {
        if (dept.keywords.some(kw => text.includes(kw))) {
            return dept.name;
        }
    }

    return 'General';
}

/**
 * Detect document type from content
 */
function detectDocumentType(section, filename) {
    const types = {
        'Policy': ['policy', 'guideline', 'regulation', 'rule'],
        'Form': ['form', 'application', 'template', 'request'],
        'Procedure': ['procedure', 'process', 'workflow', 'step'],
        'FAQ': ['faq', 'question', 'answer', 'q&a'],
        'Announcement': ['announcement', 'notice', 'update', 'news'],
        'Meeting Minute': ['meeting', 'minute', 'agenda', 'discussion']
    };

    const text = (section + ' ' + filename).toLowerCase();

    for (const [type, keywords] of Object.entries(types)) {
        if (keywords.some(kw => text.includes(kw))) {
            return type;
        }
    }

    return 'Policy';
}

/**
 * Extract relevant tags from content
 */
function extractTags(section, filename) {
    const text = (section + ' ' + filename).toLowerCase();
    const tags = [];

    // Common keywords to extract as tags
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

/**
 * Detect priority level
 */
function detectPriority(section) {
    const text = section.toLowerCase();

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
    const inputDir = path.join(__dirname, '../documents/to-process');
    const outputDir = path.join(__dirname, '../documents/parsed');

    // Create directories if they don't exist
    if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
        console.log(`Created input directory: ${inputDir}`);
        console.log('Please place your documents in this directory and run again.');
        return;
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get all files
    const files = fs.readdirSync(inputDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.pdf', '.docx', '.txt', '.md'].includes(ext);
    });

    if (files.length === 0) {
        console.log('No documents found in:', inputDir);
        console.log('Supported formats: PDF, DOCX, TXT, MD');
        return;
    }

    console.log(`\n📄 Found ${files.length} documents to process\n`);

    const results = [];
    let totalSections = 0;

    for (const file of files) {
        const filePath = path.join(inputDir, file);

        try {
            const sections = await parseDocument(filePath);
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
Knowledge Base Parsing Summary
==============================
Date: ${new Date().toISOString()}

Documents Processed: ${results.length}
Total Sections: ${totalSections}
Average Sections per Document: ${(totalSections / results.length).toFixed(1)}

Output Files:
- ${outputFile}
- ${summaryFile}

Next Steps:
1. Review the parsed data in: ${outputFile}
2. Make any manual adjustments if needed
3. Run bulk import: node scripts/bulk-import-knowledge.js <admin-user-id>
`;

    fs.writeFileSync(summaryFile, summary);

    console.log(`\n✅ Parsing Complete!`);
    console.log(`   Documents: ${results.length}`);
    console.log(`   Sections: ${totalSections}`);
    console.log(`   Output: ${outputFile}`);
    console.log(`\nNext: Review the output and run bulk import.`);
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { parseDocument, splitIntoSections, extractMetadata };
