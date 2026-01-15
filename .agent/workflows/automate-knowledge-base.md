---
description: How to automate document parsing and knowledge base management using Agent SKILL
---

# Automating Knowledge Base with Agent SKILL

## 🎯 Overview

This workflow creates a **separate "Document Library" system** alongside your existing Knowledge Base. This allows you to:
- **Compare** the SKILL-based automated approach vs. manual entry
- **Keep** your current Knowledge Base intact
- **Test** automated parsing with 500 documents without risk
- **Evaluate** which system works better for your needs

## Current Workflow Pain Points

Your current manual process for 500 documents:
1. **Manual Parsing**: Split each document into multiple parts
2. **Manual Conversion**: Convert each part to MD format
3. **Manual Entry**: Copy-paste into knowledge base UI
4. **Manual Upload**: Upload reference documents one by one
5. **Manual Tagging**: Add titles and tags for retrieval (not robust)

**Problem**: This is extremely time-consuming and error-prone for 500 documents.

---

## Solution: Separate Document Library System

### Key Differences

| Feature | Knowledge Base (Current) | Document Library (New - SKILL) |
|---------|-------------------------|--------------------------------|
| **Entry Method** | Manual UI form | Automated script parsing |
| **Database Table** | `knowledge_notes` | `document_library_entries` |
| **Admin UI** | `/admin/knowledge` | `/admin/document-library` (to be created) |
| **Metadata** | Department/Type relations | String fields (simpler) |
| **Batch Tracking** | No | Yes (with import history) |
| **Purpose** | Curated knowledge | Bulk document processing |

Both systems can coexist and be queried by the chatbot!

Agent SKILL is a powerful feature that allows you to create custom automation workflows. Here's how to leverage it:

### **Phase 1: Document Parsing Automation**

#### 1.1 Create a Document Parser SKILL

Create a new skill folder: `.agent/skills/document-parser/`

**SKILL.md** structure:
```markdown
---
name: Document Parser
description: Automatically parse documents into structured knowledge base entries
---

# Document Parser SKILL

## Purpose
Automatically parse PDF/DOCX documents into structured markdown chunks suitable for knowledge base ingestion.

## Usage
1. Place documents in `documents/to-process/`
2. Run: `node scripts/parse-documents.js`
3. Review output in `documents/parsed/`

## Configuration
- `config/parser-config.json`: Define parsing rules
- Supports: PDF, DOCX, TXT, MD
- Auto-detects sections, headers, tables
```

#### 1.2 Create Parser Script

**scripts/parse-documents.js**:
```javascript
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { marked } = require('marked');

async function parseDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  // Parse based on file type
  let content = '';
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    content = data.text;
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    content = result.value;
  } else if (ext === '.txt' || ext === '.md') {
    content = fs.readFileSync(filePath, 'utf8');
  }
  
  // Split into logical sections
  const sections = splitIntoSections(content);
  
  // Convert to knowledge base format
  return sections.map((section, index) => ({
    title: extractTitle(section) || `Section ${index + 1}`,
    content: convertToMarkdown(section),
    metadata: extractMetadata(section, filePath)
  }));
}

function splitIntoSections(content) {
  // Split by headers (## or **Title**)
  const sections = [];
  const lines = content.split('\n');
  let currentSection = [];
  
  for (const line of lines) {
    if (line.match(/^#{1,3}\s+/) || line.match(/^\*\*[^*]+\*\*$/)) {
      if (currentSection.length > 0) {
        sections.push(currentSection.join('\n'));
        currentSection = [];
      }
    }
    currentSection.push(line);
  }
  
  if (currentSection.length > 0) {
    sections.push(currentSection.join('\n'));
  }
  
  return sections;
}

function extractTitle(section) {
  const lines = section.split('\n');
  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)/) || line.match(/^\*\*([^*]+)\*\*$/);
    if (match) return match[1].trim();
  }
  return null;
}

function convertToMarkdown(section) {
  // Clean up and format as markdown
  return section
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractMetadata(section, filePath) {
  const filename = path.basename(filePath, path.extname(filePath));
  
  // Auto-detect department, document type, tags
  const metadata = {
    department: detectDepartment(section, filename),
    documentType: detectDocumentType(section, filename),
    tags: extractTags(section, filename),
    sourceFile: filename
  };
  
  return metadata;
}

function detectDepartment(section, filename) {
  const departments = [
    'Human Resources', 'IPSR', 'Consultancy', 'CHST', 
    'Finance', 'Academic Affairs', 'Student Affairs'
  ];
  
  const text = (section + ' ' + filename).toLowerCase();
  for (const dept of departments) {
    if (text.includes(dept.toLowerCase())) {
      return dept;
    }
  }
  return 'General';
}

function detectDocumentType(section, filename) {
  const types = {
    'Policy': ['policy', 'guideline', 'regulation'],
    'Form': ['form', 'application', 'template'],
    'Procedure': ['procedure', 'process', 'workflow'],
    'FAQ': ['faq', 'question', 'answer'],
    'Announcement': ['announcement', 'notice', 'update']
  };
  
  const text = (section + ' ' + filename).toLowerCase();
  for (const [type, keywords] of Object.entries(types)) {
    if (keywords.some(kw => text.includes(kw))) {
      return type;
    }
  }
  return 'Policy';
}

function extractTags(section, filename) {
  const text = (section + ' ' + filename).toLowerCase();
  const tags = [];
  
  // Common keywords
  const keywords = [
    'sabbatical', 'leave', 'training', 'grant', 'publication',
    'research', 'teaching', 'student', 'faculty', 'staff',
    'conference', 'workshop', 'seminar', 'funding', 'scholarship'
  ];
  
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      tags.push(keyword);
    }
  }
  
  return tags;
}

// Main execution
async function main() {
  const inputDir = path.join(__dirname, '../documents/to-process');
  const outputDir = path.join(__dirname, '../documents/parsed');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const files = fs.readdirSync(inputDir);
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(inputDir, file);
    console.log(`Processing: ${file}`);
    
    try {
      const sections = await parseDocument(filePath);
      results.push({
        sourceFile: file,
        sections: sections
      });
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  // Save results
  fs.writeFileSync(
    path.join(outputDir, 'parsed-knowledge-base.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\nProcessed ${results.length} documents`);
  console.log(`Output: ${path.join(outputDir, 'parsed-knowledge-base.json')}`);
}

main();
```

---

### **Phase 2: Automated Knowledge Base Ingestion**

#### 2.1 Create Bulk Import Script

**scripts/bulk-import-knowledge.js**:
```javascript
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function bulkImportKnowledge(userId) {
  const parsedFile = path.join(__dirname, '../documents/parsed/parsed-knowledge-base.json');
  const data = JSON.parse(fs.readFileSync(parsedFile, 'utf8'));
  
  let imported = 0;
  let skipped = 0;
  
  for (const doc of data) {
    for (const section of doc.sections) {
      try {
        // Check if already exists
        const existing = await prisma.knowledgeNote.findFirst({
          where: {
            title: section.title,
            content: section.content
          }
        });
        
        if (existing) {
          console.log(`Skipping duplicate: ${section.title}`);
          skipped++;
          continue;
        }
        
        // Get or create department
        let department = await prisma.department.findFirst({
          where: { name: section.metadata.department }
        });
        
        if (!department) {
          department = await prisma.department.create({
            data: {
              name: section.metadata.department,
              isActive: true
            }
          });
        }
        
        // Get or create document type
        let docType = await prisma.documentType.findFirst({
          where: { name: section.metadata.documentType }
        });
        
        if (!docType) {
          docType = await prisma.documentType.create({
            data: {
              name: section.metadata.documentType,
              isActive: true
            }
          });
        }
        
        // Create knowledge note
        await prisma.knowledgeNote.create({
          data: {
            title: section.title,
            content: section.content,
            departmentId: department.id,
            documentTypeId: docType.id,
            tags: section.metadata.tags,
            priority: determinePriority(section),
            formatType: 'markdown',
            accessLevel: ['public', 'student', 'member', 'chairperson'],
            status: 'active',
            isActive: true,
            createdBy: userId
          }
        });
        
        imported++;
        console.log(`✓ Imported: ${section.title}`);
        
      } catch (error) {
        console.error(`Error importing ${section.title}:`, error);
      }
    }
  }
  
  console.log(`\n=== Import Complete ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
}

function determinePriority(section) {
  const text = (section.title + ' ' + section.content).toLowerCase();
  
  if (text.includes('urgent') || text.includes('critical') || text.includes('important')) {
    return 'critical';
  }
  if (text.includes('deadline') || text.includes('required')) {
    return 'high';
  }
  return 'standard';
}

// Usage: node scripts/bulk-import-knowledge.js <admin-user-id>
const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node bulk-import-knowledge.js <admin-user-id>');
  process.exit(1);
}

bulkImportKnowledge(userId)
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
```

---

### **Phase 3: Improved Retrieval with Embeddings**

#### 3.1 Upgrade to Vector Search

Your current retrieval uses keyword matching. For 500 documents, you need **semantic search** with embeddings.

**scripts/generate-embeddings.js**:
```javascript
const { PrismaClient } = require('@prisma/client');
const { OpenAI } = require('openai');

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbeddings() {
  const notes = await prisma.knowledgeNote.findMany({
    where: { isActive: true }
  });
  
  console.log(`Generating embeddings for ${notes.length} notes...`);
  
  for (const note of notes) {
    try {
      // Combine title + content for embedding
      const text = `${note.title}\n\n${note.content}`;
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      
      const embedding = response.data[0].embedding;
      
      // Store embedding (you'll need to add an embedding column)
      // For now, store in category as JSON
      await prisma.knowledgeNote.update({
        where: { id: note.id },
        data: {
          // You'll need to add an 'embedding' column to schema
          // For demo, we'll skip this step
        }
      });
      
      console.log(`✓ Generated embedding for: ${note.title}`);
      
    } catch (error) {
      console.error(`Error for ${note.title}:`, error);
    }
  }
}

generateEmbeddings()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
  });
```

#### 3.2 Enhanced Search with Hybrid Approach

Update `lib/rag/knowledgeSearch.ts` to use **hybrid search** (keywords + embeddings):

```typescript
// Add to knowledgeSearch.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function searchKnowledgeNotesHybrid(
  query: string,
  accessLevels: string[],
  limit: number = 3
): Promise<KnowledgeNoteResult[]> {
  
  // 1. Generate query embedding
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });
  
  // 2. Get all notes (with embeddings)
  const notes = await prisma.knowledgeNote.findMany({
    where: {
      isActive: true,
      status: 'active',
      accessLevel: { hasSome: accessLevels }
    }
  });
  
  // 3. Calculate cosine similarity
  const scoredNotes = notes.map(note => {
    // Keyword score (existing logic)
    const keywordScore = calculateKeywordScore(query, note);
    
    // Semantic score (cosine similarity)
    const semanticScore = cosineSimilarity(
      queryEmbedding.data[0].embedding,
      note.embedding // Assuming you added this column
    );
    
    // Hybrid score (weighted combination)
    const finalScore = (keywordScore * 0.3) + (semanticScore * 0.7);
    
    return { ...note, score: finalScore };
  });
  
  // 4. Return top results
  return scoredNotes
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
```

---

## Complete Automation Workflow

### Step-by-Step Process

1. **Prepare Documents**
   ```bash
   # Create directories
   mkdir -p documents/to-process
   mkdir -p documents/parsed
   
   # Copy your 500 documents
   cp /path/to/your/documents/* documents/to-process/
   ```

2. **Install Dependencies**
   ```bash
   npm install pdf-parse mammoth marked
   ```

3. **Parse Documents**
   ```bash
   # turbo
   node scripts/parse-documents.js
   ```
   
   This will:
   - Parse all PDFs/DOCX files
   - Split into logical sections
   - Auto-detect department, type, tags
   - Output to `documents/parsed/parsed-knowledge-base.json`

4. **Review Parsed Data**
   ```bash
   # Review the JSON output
   code documents/parsed/parsed-knowledge-base.json
   ```
   
   Make any manual adjustments if needed.

5. **Bulk Import to Database**
   ```bash
   # Get your admin user ID from database
   # Then run:
   # turbo
   node scripts/bulk-import-knowledge.js <your-admin-user-id>
   ```
   
   This will:
   - Create all knowledge notes
   - Auto-create departments/types if needed
   - Skip duplicates
   - Log progress

6. **Generate Embeddings (Optional but Recommended)**
   ```bash
   # turbo
   node scripts/generate-embeddings.js
   ```
   
   This enables semantic search for better retrieval.

---

## Advanced Features

### 1. **Incremental Updates**

Create `scripts/sync-documents.js` to watch for new documents:

```javascript
const chokidar = require('chokidar');

const watcher = chokidar.watch('documents/to-process', {
  persistent: true
});

watcher.on('add', async (filePath) => {
  console.log(`New document detected: ${filePath}`);
  // Auto-parse and import
  await parseDocument(filePath);
  await importToDatabase(filePath);
});
```

### 2. **Document Linking**

Automatically link related documents:

```javascript
async function linkRelatedDocuments(noteId) {
  const note = await prisma.knowledgeNote.findUnique({
    where: { id: noteId }
  });
  
  // Find related notes by tags
  const related = await prisma.knowledgeNote.findMany({
    where: {
      tags: { hasSome: note.tags },
      id: { not: noteId }
    },
    take: 5
  });
  
  // Link them (you'll need a relation table)
  // Implementation depends on your schema
}
```

### 3. **Quality Validation**

Add validation before import:

```javascript
function validateSection(section) {
  const errors = [];
  
  if (section.title.length < 5) {
    errors.push('Title too short');
  }
  
  if (section.content.length < 50) {
    errors.push('Content too short');
  }
  
  if (section.metadata.tags.length === 0) {
    errors.push('No tags detected');
  }
  
  return errors;
}
```

---

## Benefits of This Approach

✅ **Speed**: Process 500 documents in minutes vs. days  
✅ **Consistency**: Automated parsing ensures uniform formatting  
✅ **Accuracy**: Semantic search finds relevant content better than keywords  
✅ **Scalability**: Easily add more documents in the future  
✅ **Maintainability**: Update parsing rules in one place  

---

## Next Steps

1. Create the scripts mentioned above
2. Test with 10-20 documents first
3. Refine parsing rules based on your document structure
4. Run full batch of 500 documents
5. Monitor retrieval quality and adjust as needed

---

## Troubleshooting

**Problem**: Parser misses sections  
**Solution**: Adjust `splitIntoSections()` regex patterns

**Problem**: Wrong department detection  
**Solution**: Add more keywords to `detectDepartment()`

**Problem**: Poor retrieval quality  
**Solution**: Implement embeddings (Phase 3)

**Problem**: Duplicate entries  
**Solution**: Improve duplicate detection logic

---

## Resources

- [PDF Parse Docs](https://www.npmjs.com/package/pdf-parse)
- [Mammoth.js (DOCX)](https://www.npmjs.com/package/mammoth)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Prisma Bulk Operations](https://www.prisma.io/docs/concepts/components/prisma-client/crud#create-multiple-records)
