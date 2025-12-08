# CHST-Chatbot V1 - Development Workflow & Documentation

## Project Overview

**Project Name:** CHST-Chatbot V1  
**Purpose:** A RAG-based chatbot to assist CHST research centre members in finding university and centre-level research policies and forms  
**Target Users:** Students, Research Centre Members (Staff), and Chairperson  
**Key Features:** Role-based access control, PDF document processing, intelligent Q&A, admin dashboard

---

## System Architecture

### Technology Stack

#### Frontend
- **Framework:** Next.js 14+ (React-based, with App Router)
- **Styling:** Tailwind CSS for modern, responsive UI
- **Authentication UI:** Custom auth pages (signup/signin)
- **State Management:** React Context API + React Query
- **UI Components:** Shadcn/ui for premium components

#### Backend
- **Runtime:** Node.js with Next.js API routes
- **Database:** PostgreSQL (user management, chat history, access logs)
- **Vector Database:** Pinecone or Chroma (for RAG embeddings)
- **Authentication:** NextAuth.js (JWT-based)
- **File Storage:** Local filesystem or AWS S3 (for PDFs)

#### AI/ML Components
- **LLM Provider:** OpenAI GPT-4 or Azure OpenAI
- **Embeddings:** OpenAI text-embedding-ada-002
- **PDF Processing:** pdf-parse or PyPDF2
- **RAG Framework:** LangChain.js

---

## Role-Based Access Control (RBAC)

### User Roles & Permissions

| Role | Access Level | Permissions |
|------|-------------|-------------|
| **Student** | Basic | Access student-level policies and forms only |
| **Member** (Staff) | Intermediate | Access student + staff-level policies and forms |
| **Chairperson** | Admin | Full access + view all user queries + manage documents |

### Document Organization Structure

```
documents/
├── student/          # Accessible by: Student, Member, Chairperson
│   ├── conference-support-guidelines.pdf
│   ├── student-research-policies.pdf
│   └── ...
├── member/           # Accessible by: Member, Chairperson
│   ├── sabbatical-leave-policy.pdf
│   ├── internal-grant-application.pdf
│   └── ...
└── chairperson/      # Accessible by: Chairperson only
    ├── budget-reports.pdf
    ├── confidential-policies.pdf
    └── ...
```

---

## Development Workflow

### Phase 1: Project Setup & Planning ✓
**Duration:** 30 minutes

- [x] Create project directory structure
- [x] Document workflow and architecture
- [x] Get user consensus on approach
- [ ] Initialize Next.js project
- [ ] Set up Git repository
- [ ] Configure environment variables template

### Phase 2: Database & Authentication Setup
**Duration:** 2-3 hours

#### 2.1 Database Schema Design
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'member', 'chairperson') NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  user_id UUID REFERENCES users(id),
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  access_level ENUM('student', 'member', 'chairperson') NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id)
);
```

#### 2.2 Authentication Implementation
- Set up NextAuth.js with credentials provider
- Implement password hashing (bcrypt)
- Create signup/signin API routes
- Implement JWT session management
- Add role-based middleware

### Phase 3: Document Processing & RAG Pipeline
**Duration:** 3-4 hours

#### 3.1 PDF Processing
- Create document upload endpoint (Chairperson only)
- Implement PDF text extraction
- Chunk documents into manageable pieces (500-1000 tokens)
- Store metadata (filename, access level, upload date)

#### 3.2 Vector Embedding & Storage
- Generate embeddings for document chunks
- Store embeddings in vector database with metadata
- Index by access level for efficient filtering
- Implement similarity search function

#### 3.3 RAG Query Pipeline
```
User Query → Check User Role → Filter Documents by Access Level 
→ Generate Query Embedding → Similarity Search (Top-K retrieval) 
→ Construct Prompt with Context → LLM Generation → Return Response
```

### Phase 4: Frontend Development
**Duration:** 4-5 hours

#### 4.1 Authentication Pages
- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page (with role selection)
- Implement form validation
- Add loading states and error handling

#### 4.2 Main Chat Interface
- `/chat` - Main chatbot interface
- Message input with auto-resize
- Chat history display
- Streaming response support
- Role indicator badge
- Logout functionality

#### 4.3 Admin Dashboard (Chairperson Only)
- `/admin/dashboard` - Overview of system usage
- `/admin/queries` - View all user queries with filters
- `/admin/documents` - Manage documents (upload, delete, view)
- Analytics: most asked questions, user activity

#### 4.4 UI/UX Design Principles
- Modern, clean interface inspired by ChatGPT
- Dark mode support
- Responsive design (mobile-friendly)
- Smooth animations and transitions
- Loading skeletons for better UX

### Phase 5: Integration & Testing
**Duration:** 2-3 hours

#### 5.1 Integration Testing
- Test complete RAG pipeline
- Verify role-based access control
- Test document upload and retrieval
- Validate authentication flow

#### 5.2 User Acceptance Testing
- Test with sample queries:
  - "Am I eligible to apply for sabbatical leave? How to apply?"
  - "Can a part-time master student get financial support for conferences?"
  - "What is the procedure to apply for the latest internal grant cycle?"
- Verify responses are accurate and relevant
- Test with different user roles

### Phase 6: Deployment & Documentation
**Duration:** 1-2 hours

#### 6.1 Deployment Options
- **Option A:** Vercel (easiest for Next.js)
- **Option B:** Docker + AWS/Azure
- **Option C:** Self-hosted on university server

#### 6.2 User Documentation
- Create user guide for each role
- Document how to upload PDFs (Chairperson)
- FAQ section
- Troubleshooting guide

---

## Key Implementation Details

### RAG Query Example Flow

```javascript
// 1. User asks a question
const userQuery = "How do I apply for sabbatical leave?";

// 2. Check user role
const userRole = session.user.role; // 'member'

// 3. Generate query embedding
const queryEmbedding = await openai.embeddings.create({
  model: "text-embedding-ada-002",
  input: userQuery
});

// 4. Search vector DB with role filter
const relevantDocs = await vectorDB.similaritySearch({
  embedding: queryEmbedding,
  filter: { accessLevel: ['student', 'member'] }, // Based on role hierarchy
  topK: 5
});

// 5. Construct prompt with context
const prompt = `
Context from CHST policies:
${relevantDocs.map(doc => doc.content).join('\n\n')}

User Question: ${userQuery}

Please provide a helpful answer based on the context above.
`;

// 6. Generate response
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: prompt }]
});

// 7. Return to user
return response.choices[0].message.content;
```

### Security Considerations

1. **Authentication Security**
   - Password hashing with bcrypt (salt rounds: 12)
   - JWT tokens with expiration (24 hours)
   - HTTP-only cookies for token storage
   - CSRF protection

2. **Authorization**
   - Middleware to verify role on every protected route
   - Server-side validation of document access
   - API rate limiting to prevent abuse

3. **Data Privacy**
   - Encrypt sensitive data at rest
   - Use HTTPS for all communications
   - Log access to sensitive documents
   - GDPR compliance for user data

---

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chst_chatbot

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=sk-...

# Vector Database (Pinecone example)
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX_NAME=chst-documents

# File Upload
UPLOAD_DIR=./documents
MAX_FILE_SIZE=10485760  # 10MB
```

---

## Project Structure

```
chst-chatbot-v1/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── signin/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   ├── chat/
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── queries/
│   │   │   └── documents/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   ├── documents/
│   │   │   └── admin/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── chat/
│   │   ├── auth/
│   │   └── admin/
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── rag/
│   │   │   ├── embeddings.ts
│   │   │   ├── vectorStore.ts
│   │   │   └── query.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── documents/
│   ├── student/
│   ├── member/
│   └── chairperson/
├── public/
├── prisma/
│   └── schema.prisma
├── .env.local
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

---

## Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Setup | 30 min | Project initialized |
| Phase 2: Auth & DB | 2-3 hours | Working authentication |
| Phase 3: RAG Pipeline | 3-4 hours | Document processing & retrieval |
| Phase 4: Frontend | 4-5 hours | Complete UI |
| Phase 5: Testing | 2-3 hours | Tested application |
| Phase 6: Deployment | 1-2 hours | Live application |
| **Total** | **13-18 hours** | Production-ready chatbot |

---

## Next Steps

1. **Review this workflow** - Confirm the approach and technology choices
2. **Provide API keys** - OpenAI API key (or preferred LLM provider)
3. **Database preference** - Confirm PostgreSQL or suggest alternative
4. **Deployment target** - Where will this be hosted?
5. **Start development** - Begin with Phase 1 after approval

---

## Questions for Clarification

1. **LLM Provider:** Do you have access to OpenAI API, or should we use an alternative (Azure OpenAI, Anthropic Claude, open-source models)?

2. **Database Hosting:** Will you host PostgreSQL locally, or should we use a cloud service (Supabase, Neon, AWS RDS)?

3. **Initial Chairperson Account:** How should the first Chairperson account be created? (Manual database insert, or special signup code?)

4. **Document Upload:** Should there be a web interface for uploading PDFs, or will you manually place them in folders?

5. **User Registration:** Should new users be able to self-register, or should the Chairperson approve/invite users?

---

**Please review this workflow and let me know if you approve, or if you'd like any modifications before we begin development!**
