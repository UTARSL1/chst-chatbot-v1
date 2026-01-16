# Document Library - Complete Workflow Guide

This guide explains how to add new policy documents to your AI system with **one command**.

---

## 🎯 Quick Start

### Prerequisites (One-Time Setup)

1.  **Create Supabase Storage Bucket**:
    *   Log in to your [Supabase Dashboard](https://supabase.com/dashboard)
    *   Navigate to **Storage** (left sidebar)
    *   Click **"New Bucket"**
    *   Name: `document-library` (exact name required)
    *   **Toggle "Public bucket" to ON** ✅
    *   Click **Create bucket**

2.  **Verify Environment Variables** (should already be set):
    ```
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    OPENAI_API_KEY=your_openai_key
    PINECONE_API_KEY=your_pinecone_key
    ```

---

## 📝 Adding New Documents

### Step 1: Add PDFs
Place your PDF policy documents in:
```
documents/to-process/
```

### Step 2: Run the Command
```bash
npm run doc:process
```

That's it! ✨

---

## 🔧 What Happens Automatically

The system will:
1.  ✅ Convert PDFs to Markdown (preserving tables)
2.  ✅ Parse sections and extract metadata
3.  ✅ Import to database with proper structure
4.  ✅ Generate embeddings for semantic search
5.  ✅ Upload original PDFs to Supabase Storage
6.  ✅ Link everything together

**Total time**: ~30 seconds for 5 documents

---

## 💡 How It Works in the AI

When a user asks a question:
1.  The AI searches the document library using **semantic search**
2.  Retrieves relevant sections with preserved table formatting
3.  **Automatically includes download links** to the original PDFs
4.  User can download the full policy document directly from the chat

---

## 🐛 Troubleshooting

### "Bucket not found" error
→ You need to create the `document-library` bucket in Supabase (see Prerequisites above)

### "No PDFs found"
→ Make sure PDFs are in `documents/to-process/` folder

### Embeddings fail
→ Check your `OPENAI_API_KEY` is valid and has credits

### Download links 404
→ Verify the bucket is **public** and files uploaded successfully
