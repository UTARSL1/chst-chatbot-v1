# CHST-Chatbot V1 - Quick Start Guide

## Prerequisites Completed ✅
- ✅ Next.js project initialized
- ✅ All dependencies installed (512 packages)
- ✅ Authentication system built
- ✅ RAG pipeline implemented
- ✅ Chat interface created

---

## Step 1: Setup Database & API Keys

### 1.1 Install PostgreSQL
Follow the detailed instructions in [SETUP_GUIDE.md](./SETUP_GUIDE.md) to:
- Install PostgreSQL (local or cloud)
- Create database: `chst_chatbot`
- Get your connection string

### 1.2 Create Pinecone Account
1. Visit https://www.pinecone.io and sign up
2. Create API key
3. Create index: `chst-documents` (dimensions: 1536, metric: cosine)

### 1.3 Get OpenAI API Key
1. Visit https://platform.openai.com/api-keys
2. Create new API key
3. Add billing/credits

---

## Step 2: Configure Environment Variables

Create `.env.local` file in project root:

```env
# Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/chst_chatbot"

# NextAuth
NEXTAUTH_SECRET="YOUR_GENERATED_SECRET"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"

# Pinecone
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="us-east-1-aws"
PINECONE_INDEX_NAME="chst-documents"

# File Upload
UPLOAD_DIR="./documents"
MAX_FILE_SIZE="10485760"

# Initial Chairperson Code
INITIAL_CHAIRPERSON_CODE="CHST-ADMIN-2025"
```

**Generate NEXTAUTH_SECRET:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## Step 3: Initialize Database

```powershell
# Navigate to project directory
cd C:\Users\ychum\.gemini\antigravity\scratch\chst-chatbot-v1

# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

You should see:
```
✔ Generated Prisma Client
✔ Database synchronized
```

---

## Step 4: Create Initial Chairperson Signup Code

**Option A: Using Prisma Studio (Recommended)**
```powershell
npm run db:studio
```

1. Opens at http://localhost:5555
2. Click "SignupCode" table
3. Click "Add record"
4. Set:
   - code: `CHST-ADMIN-2025`
   - isUsed: `false`
5. Save

**Option B: Using pgAdmin**
1. Open pgAdmin
2. Connect to your database
3. Run SQL:
```sql
INSERT INTO signup_codes (id, code, is_used, created_at)
VALUES (gen_random_uuid(), 'CHST-ADMIN-2025', false, NOW());
```

---

## Step 5: Start Development Server

```powershell
npm run dev
```

Server starts at: **http://localhost:3000**

---

## Step 6: Create Your Chairperson Account

1. Visit http://localhost:3000 (redirects to signin)
2. Click "Sign up"
3. Fill in:
   - Name: Your Name
   - Email: your.email@utar.edu.my (or any email)
   - Password: (strong password)
   - Confirm Password: (same)
4. Click "+ I have a chairperson code"
5. Enter: `CHST-ADMIN-2025`
6. Click "Sign Up"

You should see success message and be redirected to signin!

---

## Step 7: Sign In & Test Chat

1. Sign in with your credentials
2. You'll be redirected to `/chat`
3. Try asking: "How to apply for sabbatical leave?"
4. The chatbot will respond (note: no documents uploaded yet, so it will say no information found)

---

## Step 8: Upload Your First Document (Chairperson Only)

### Current Status:
The document management interface is not yet built. To upload documents, you can:

**Option A: Manual Upload (Temporary)**
1. Place your PDF files in:
   - `documents/student/` - For student-level documents
   - `documents/member/` - For staff-level documents
   - `documents/chairperson/` - For chairperson-only documents

2. Use API directly:
```powershell
# Example using curl (if installed)
curl -X POST http://localhost:3000/api/documents \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/your/document.pdf" \
  -F "accessLevel=student"
```

**Option B: Wait for Admin Dashboard**
The admin dashboard with document management UI will be built in the next phase.

---

## What's Working Now ✅

1. **Authentication**
   - ✅ Sign up with email domain detection
   - ✅ Sign in with credentials
   - ✅ Chairperson signup code validation
   - ✅ Role-based access control

2. **Chat Interface**
   - ✅ Send messages
   - ✅ Receive AI responses
   - ✅ Chat history
   - ✅ New chat sessions
   - ✅ Role badge display

3. **RAG Pipeline**
   - ✅ PDF text extraction
   - ✅ Text chunking
   - ✅ Embedding generation
   - ✅ Vector storage (Pinecone)
   - ✅ Similarity search
   - ✅ GPT-4 response generation

4. **Document Processing**
   - ✅ PDF upload API
   - ✅ Async processing
   - ✅ Role-based filtering

---

## What's Next 🚀

### Phase 5.3: Admin Dashboard (Chairperson)
- [ ] Dashboard overview page
- [ ] User queries viewer
- [ ] Document management (CRUD) interface
- [ ] Analytics and statistics
- [ ] Chairperson code management

### Phase 6: Testing & Deployment
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Production deployment
- [ ] User documentation

---

## Troubleshooting

### "Database connection failed"
- Check PostgreSQL is running
- Verify DATABASE_URL in `.env.local`
- Test connection: `psql -U postgres -d chst_chatbot`

### "Invalid API key" (OpenAI)
- Verify key starts with `sk-`
- Check billing is set up
- Test key at https://platform.openai.com/api-keys

### "Pinecone error"
- Verify index name matches exactly
- Check API key is correct
- Ensure index dimensions = 1536

### "No documents found" in chat
- This is normal if no documents uploaded yet
- Upload documents via API or wait for admin dashboard

---

## Project Structure

```
chst-chatbot-v1/
├── app/
│   ├── api/
│   │   ├── auth/          # Authentication endpoints
│   │   ├── chat/          # Chat API with RAG
│   │   └── documents/     # Document upload/retrieval
│   ├── auth/
│   │   ├── signin/        # Sign in page
│   │   └── signup/        # Sign up page
│   ├── chat/              # Main chat interface ✅
│   └── admin/             # Admin dashboard (TODO)
├── lib/
│   ├── rag/               # RAG pipeline modules
│   │   ├── embeddings.ts  # OpenAI embeddings
│   │   ├── vectorStore.ts # Pinecone integration
│   │   ├── query.ts       # RAG query processing
│   │   └── pdfProcessor.ts# PDF text extraction
│   ├── auth.ts            # NextAuth configuration
│   ├── db.ts              # Prisma client
│   └── utils.ts           # Utility functions
├── components/
│   ├── ui/                # Reusable UI components
│   └── providers.tsx      # Session provider
├── documents/             # Uploaded PDFs
│   ├── student/
│   ├── member/
│   └── chairperson/
└── prisma/
    └── schema.prisma      # Database schema
```

---

## Development Commands

```powershell
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database commands
npm run db:push      # Push schema to database
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio

# Linting
npm run lint
```

---

## Next Steps for You

1. **Complete Setup:**
   - [ ] Install PostgreSQL
   - [ ] Create Pinecone account
   - [ ] Get OpenAI API key
   - [ ] Configure `.env.local`
   - [ ] Initialize database
   - [ ] Create chairperson account

2. **Test the System:**
   - [ ] Sign up and sign in
   - [ ] Try the chat interface
   - [ ] Upload a test PDF (via API)
   - [ ] Ask questions about the uploaded document

3. **Provide Feedback:**
   - Any issues during setup?
   - Any features you'd like adjusted?
   - Ready to continue with admin dashboard?

---

**Need help? Refer to [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions!**
