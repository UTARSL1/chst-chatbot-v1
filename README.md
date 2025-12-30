# CHST-Chatbot V1

AI-powered chatbot for CHST research centre policies and forms at UTAR.

## 🎯 Features

- **Role-Based Access Control**: Student, Member (Staff), Chairperson, and Public roles
- **Smart Authentication**: Auto-detect role from email domain (@utar.edu.my, @1utar.my)
- **RAG-Powered Q&A**: Intelligent document retrieval and GPT-4 responses
- **Document Management**: Upload and process PDF policies and forms
- **Chat Interface**: Modern, ChatGPT-style interface with history
- **Admin Dashboard**: Chairperson can view all queries and manage documents (coming soon)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key
- Pinecone account

### Installation

1. **Clone or navigate to project:**
```powershell
cd C:\Users\ychum\.gemini\antigravity\scratch\chst-chatbot-v1
```

2. **Install dependencies** (already done):
```powershell
npm install
```

3. **Configure environment variables:**
Create `.env.local` file:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/chst_chatbot"
NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-your-key"
PINECONE_API_KEY="your-key"
PINECONE_ENVIRONMENT="us-east-1-aws"
PINECONE_INDEX_NAME="chst-documents"
```

4. **Initialize database:**
```powershell
npm run db:push
npm run db:studio  # Create initial chairperson code
```

5. **Start development server:**
```powershell
npm run dev
```

Visit http://localhost:3000

## 📚 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Detailed setup instructions for PostgreSQL, Pinecone, and OpenAI
- **[QUICK_START.md](./QUICK_START.md)** - Step-by-step quick start guide
- **[BUILD_PROGRESS.md](./BUILD_PROGRESS.md)** - Development progress and completed features
- **[DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md)** - Technical development log
- **[PROJECT_WORKFLOW.md](./PROJECT_WORKFLOW.md)** - Original project workflow and architecture
- **[UI_DESIGN_MOCKUPS.md](./UI_DESIGN_MOCKUPS.md)** - UI design specifications

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **AI/ML**: OpenAI GPT-4, text-embedding-ada-002
- **Vector DB**: Pinecone
- **PDF Processing**: pdf-parse
- **Authentication**: NextAuth.js with JWT

## 📁 Project Structure

```
chst-chatbot-v1/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── chat/              # Chat interface
│   └── admin/             # Admin dashboard (TODO)
├── components/            # React components
├── lib/                   # Utility libraries
│   └── rag/              # RAG pipeline modules
├── prisma/               # Database schema
├── documents/            # Uploaded PDFs
└── types/                # TypeScript types
```

## 🔐 User Roles

| Role | Email Domain | Access Level | Auto-Approved |
|------|-------------|--------------|---------------|
| **Student** | @1utar.my | Student documents only | ❌ Requires approval |
| **Member** (Staff) | @utar.edu.my | Student + Member documents | ❌ Requires approval |
| **Chairperson** | Any (with code) | All documents + admin access | ❌ Requires approval |
| **Public** | Other domains | Student documents | ❌ Requires approval |

## 🎨 Features Implemented

### ✅ Phase 1-4 Complete
- [x] Project setup and configuration
- [x] Database schema design
- [x] Authentication system
- [x] RAG pipeline
- [x] Chat interface
- [x] Document upload API
- [x] PDF processing
- [x] Vector embeddings

### 🚧 Phase 5-6 In Progress
- [ ] Admin dashboard
- [ ] Document management UI
- [ ] User queries viewer
- [ ] Analytics
- [ ] Testing & deployment

## 🛠️ Development

```powershell
# Development server
npm run dev

# Build for production
npm run build

# Database management
npm run db:push      # Sync schema
npm run db:generate  # Generate client
npm run db:studio    # Open Prisma Studio

# Linting
npm run lint
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXTAUTH_SECRET` | NextAuth secret key | ✅ |
| `NEXTAUTH_URL` | Application URL | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | ✅ |
| `PINECONE_API_KEY` | Pinecone API key | ✅ |
| `PINECONE_ENVIRONMENT` | Pinecone environment | ✅ |
| `PINECONE_INDEX_NAME` | Pinecone index name | ✅ |

## 🤝 Contributing

This is a university research centre project. For questions or issues, contact the CHST administrator.

## 📄 License

Proprietary - CHST Research Centre, UTAR

---

**Built with ❤️ for CHST Research Centre**
