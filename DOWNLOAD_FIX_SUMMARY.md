# Download Link Fix - Summary of Changes

## Problem
The chatbot couldn't provide working download links for uploaded documents because:
1. The RAG system stored only UUID filenames (e.g., `311c3236-18f5-459d-8606...`) in vector metadata
2. Users ask for documents using human-readable names (e.g., `POL-DHR-001 Policy on Sponsorship`)
3. The AI generated download links using the human-readable names, but the frontend couldn't match them to the UUID filenames in the sources array

## Solution Overview
Store and use **both** UUID filename and originalName throughout the entire RAG pipeline.

## Changes Made

### 1. Vector Store (`lib/rag/vectorStore.ts`)
- **Added `originalName` parameter** to `storeDocumentChunks()` function
- **Updated metadata storage** to include both `filename` (UUID) and `originalName` (human-readable)
- **Updated search results** to return `originalName` from vector metadata

### 2. Type Definitions (`types/index.ts`)
- **Added `originalName: string`** to `DocumentChunk` metadata interface

### 3. Document Upload (`app/api/documents/route.ts`)
- **Updated `processDocument()` function** to accept `originalName` parameter
- **Passed `originalName`** to `storeDocumentChunks()` when storing vectors

### 4. RAG Query Processing (`lib/rag/query.ts`)
- **Updated context building** to use `originalName` instead of UUID filename when presenting sources to the AI
- **Updated sources preparation** to include `originalName` from chunk metadata
- **Added download request detection** logic to search for explicitly requested documents and add them to sources
- **Moved `isInventoryQuestion` variable** to function scope for use in download detection

### 5. Chat API (`app/api/chat/route.ts`)
- **Added `suggestions` field** to API response (was missing before)

## How It Works Now

### For Existing Documents (Already Uploaded)
- **Issue**: Existing documents in Pinecone only have UUID filenames, not originalName
- **Workaround**: The `enrichSourcesWithMetadata()` function queries the database to get originalName based on the UUID filename
- **Recommendation**: Re-upload documents to get full benefits

### For New Documents (After This Fix)
1. User uploads document with name "POL-DHR-001 Policy on Sponsorship.pdf"
2. System generates UUID filename: `311c3236-18f5-459d-8606...`
3. **Both names stored** in Pinecone metadata: `filename` (UUID) and `originalName` (human-readable)
4. When RAG retrieves chunks, it has both names immediately available
5. AI sees context with human-readable names: `[Source: POL-DHR-001 Policy on Sponsorship.pdf]`
6. AI generates download link: `[Download POL-DHR-001](download:POL-DHR-001 Policy on Sponsorship)`
7. Frontend matches `originalName` in sources array and provides working download button

## Download Behavior
- ✅ Opens in **new tab** (doesn't replace current tab)
- ✅ Downloads with **original filename** (via Supabase signed URL with `download` parameter)
- ✅ Signed URL expires in 60 seconds for security

## Testing Recommendations
1. **Upload a new document** to test the full pipeline
2. **Ask for download link** using the document's human-readable name
3. **Verify** the download link appears and works correctly
4. **Check** that the file downloads with the correct original name
5. **Confirm** the download opens in a new tab

## Notes
- Existing documents in Pinecone will still work but rely on database lookups for originalName
- For best performance, consider re-uploading important documents
- The download detection logic helps when users explicitly request documents that weren't in the top RAG results
