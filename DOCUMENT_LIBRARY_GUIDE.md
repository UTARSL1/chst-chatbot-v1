# Document Library System - SKILL-Based Automation

## 📋 Summary

I've created a **completely separate "Document Library" system** alongside your existing Knowledge Base. This allows you to test the SKILL-based automated approach with your 500 documents while keeping your current manual Knowledge Base intact.

## 🎯 What Was Created

### 1. **New Database Tables**
- `document_library_entries` - Stores auto-parsed document sections
- `document_library_batches` - Tracks import batches with statistics

### 2. **Automation Scripts**
- `scripts/parse-documents.js` - Automatically parses PDF/DOCX/TXT/MD files
- `scripts/bulk-import-knowledge.js` - Imports parsed data into Document Library

### 3. **Workflow Documentation**
- `.agent/workflows/automate-knowledge-base.md` - Complete guide

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Your 500 Documents                        │
│                  (PDF, DOCX, TXT, MD)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Automated Parsing (parse-documents.js)             │
│  • Extracts sections automatically                          │
│  • Converts to markdown                                     │
│  • Auto-detects: department, type, tags, priority           │
│  • Output: parsed-knowledge-base.json                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Bulk Import (bulk-import-knowledge.js)             │
│  • Creates batch record                                     │
│  • Imports to document_library_entries table                │
│  • Tracks statistics (imported/skipped/errors)              │
│  • Generates import log                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Document Library Database                       │
│  (Separate from Knowledge Base - no conflicts!)             │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Comparison: Knowledge Base vs Document Library

| Aspect | Knowledge Base (Current) | Document Library (New) |
|--------|-------------------------|------------------------|
| **Entry Method** | Manual UI form | Automated script |
| **Time for 500 docs** | Days/weeks | Minutes |
| **Database Table** | `knowledge_notes` | `document_library_entries` |
| **Metadata Storage** | Relations (Department, DocumentType tables) | Simple strings |
| **Batch Tracking** | ❌ No | ✅ Yes |
| **Duplicate Detection** | Basic | By source file + section |
| **Best For** | Curated, high-quality content | Bulk document processing |

## 🚀 Quick Start Guide

### Prerequisites
```bash
# Already installed for you:
npm install pdf-parse mammoth
```

### Step 1: Prepare Documents
```bash
# Place your documents in this folder:
documents/to-process/

# Supported formats: PDF, DOCX, TXT, MD
```

### Step 2: Run Database Migration
```bash
# Apply the new schema
npx prisma migrate dev --name add_document_library
npx prisma generate
```

### Step 3: Parse Documents
```bash
node scripts/parse-documents.js
```

**Output:**
- `documents/parsed/parsed-knowledge-base.json` - All parsed sections
- `documents/parsed/parsing-summary.txt` - Statistics

### Step 4: Validate (Optional)
```bash
# Check for issues before importing
node scripts/bulk-import-knowledge.js validate

# View statistics
node scripts/bulk-import-knowledge.js stats
```

### Step 5: Import to Database
```bash
# Get your admin user ID from Supabase:
# SELECT id, email FROM users WHERE role = 'chairperson';

# Import with optional batch name
node scripts/bulk-import-knowledge.js import <your-user-id> "Initial 500 Documents"
```

## 📁 File Structure

```
chst-chatbot-v1/
├── documents/
│   ├── to-process/          # ← Place your 500 documents here
│   └── parsed/              # ← Parsed output goes here
│       ├── parsed-knowledge-base.json
│       ├── parsing-summary.txt
│       └── import-log.txt
├── scripts/
│   ├── parse-documents.js   # ← Automated parser
│   └── bulk-import-knowledge.js  # ← Bulk importer
├── prisma/
│   └── schema.prisma        # ← Updated with new tables
└── .agent/
    └── workflows/
        └── automate-knowledge-base.md  # ← Full guide
```

## 🎨 Next Steps: Create Admin UI

To complete the system, you'll need to create an admin UI page:

### Create: `app/admin/document-library/page.tsx`

This page should:
1. **List all Document Library entries** (with filters)
2. **Show batch import history**
3. **Allow viewing/editing individual entries**
4. **Display statistics** (total entries, by department, by type)
5. **Compare with Knowledge Base** (side-by-side view)

### Add to Admin Navigation

Update your admin panel navigation to include:
- "Knowledge Base" (existing)
- "Document Library" (new) ← SKILL-based system

## 🔍 Auto-Detection Features

The parser automatically detects:

### 1. **Department**
Keywords: `hr`, `human resources`, `ipsr`, `research`, `consultancy`, `chst`, `finance`, `academic`, `student`

### 2. **Document Type**
- Policy: `policy`, `guideline`, `regulation`
- Form: `form`, `application`, `template`
- Procedure: `procedure`, `process`, `workflow`
- FAQ: `faq`, `question`, `answer`
- Announcement: `announcement`, `notice`, `update`

### 3. **Tags**
Extracts: `sabbatical`, `leave`, `training`, `grant`, `publication`, `research`, `teaching`, `student`, `faculty`, `staff`, `conference`, `workshop`, `seminar`, `funding`, `scholarship`, etc.

### 4. **Priority**
- **Critical**: Contains `urgent`, `critical`, `immediate`
- **High**: Contains `important`, `deadline`, `required`
- **Standard**: Default

## 🛠️ Customization

### Adjust Parsing Rules

Edit `scripts/parse-documents.js`:

```javascript
// Add more departments
function detectDepartment(section, filename) {
  const departments = [
    { name: 'Your Department', keywords: ['keyword1', 'keyword2'] },
    // ... add more
  ];
}

// Add more tags
function extractTags(section, filename) {
  const keywords = [
    'your-tag', 'another-tag',
    // ... add more
  ];
}
```

### Adjust Section Splitting

```javascript
function splitIntoSections(content) {
  // Modify regex patterns to match your document structure
  const isHeader = line.match(/^#{1,3}\s+/) ||  // Markdown headers
                   line.match(/^\*\*[^*]+\*\*$/) ||  // Bold text
                   line.match(/^[A-Z][A-Za-z\s]{3,}:$/);  // "Title:"
}
```

## 📈 Benefits

✅ **Speed**: Process 500 documents in ~5-10 minutes vs. days/weeks  
✅ **Consistency**: Uniform formatting and structure  
✅ **Scalability**: Easily add more documents anytime  
✅ **Safety**: Separate system - no risk to existing Knowledge Base  
✅ **Comparison**: Test both approaches side-by-side  
✅ **Batch Tracking**: Full audit trail of imports  
✅ **Duplicate Prevention**: Smart detection by source + section  

## 🔮 Future Enhancements

### Phase 2: Semantic Search (Recommended)

For better retrieval with 500+ documents:

1. **Generate Embeddings**
   - Use OpenAI `text-embedding-3-small`
   - Store in Supabase with pgvector extension
   - Enable semantic similarity search

2. **Hybrid Search**
   - Combine keyword matching (current)
   - With semantic similarity (new)
   - Weighted scoring for best results

3. **Update Schema**
   ```sql
   ALTER TABLE document_library_entries 
   ADD COLUMN embedding vector(1536);
   
   CREATE INDEX ON document_library_entries 
   USING ivfflat (embedding vector_cosine_ops);
   ```

### Phase 3: Integration with Chatbot

Update your RAG system to query both:
- `knowledge_notes` (curated, manual)
- `document_library_entries` (bulk, automated)

Merge results by relevance score.

## 🐛 Troubleshooting

### Problem: Parser misses sections
**Solution**: Adjust `splitIntoSections()` regex in `parse-documents.js`

### Problem: Wrong department/type detection
**Solution**: Add more keywords to `detectDepartment()` and `detectDocumentType()`

### Problem: Too many/few tags
**Solution**: Modify keyword list in `extractTags()`

### Problem: Duplicate entries
**Solution**: Script automatically skips duplicates based on title + source file + section index

### Problem: Database connection error
**Solution**: Ensure `.env` has correct `DATABASE_URL` and `DIRECT_URL`

## 📞 Support Commands

```bash
# Validate before import
node scripts/bulk-import-knowledge.js validate

# View statistics
node scripts/bulk-import-knowledge.js stats

# Import with batch name
node scripts/bulk-import-knowledge.js import <user-id> "Batch Name"

# Re-parse documents
node scripts/parse-documents.js

# Check Prisma schema
npx prisma format
npx prisma validate
```

## 🎓 Learning Resources

- [PDF Parse Documentation](https://www.npmjs.com/package/pdf-parse)
- [Mammoth.js (DOCX)](https://www.npmjs.com/package/mammoth)
- [Prisma Bulk Operations](https://www.prisma.io/docs/concepts/components/prisma-client/crud)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)

---

## ✨ Summary

You now have a **complete automated document processing pipeline** that:
1. Parses 500 documents automatically
2. Stores them in a separate Document Library system
3. Tracks batches and statistics
4. Doesn't interfere with your existing Knowledge Base
5. Allows you to compare both approaches

**Next Action**: Run the database migration and start testing with a few documents!
