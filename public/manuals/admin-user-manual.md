# CHST AI Agent - Admin/Chairperson Manual

## Welcome, Administrator!

This comprehensive manual is designed for **Chairpersons and Administrators** of the CHST AI Agent system. It covers all user features, administrative dashboard functions, technical architecture, and maintenance procedures.

---

## Table of Contents

### Part A: User Features
1. [Getting Started](#getting-started)
2. [All Member Features](#all-member-features)

### Part B: Admin Dashboard
3. [Dashboard Overview](#dashboard-overview)
4. [User Management](#user-management)
5. [Invitation Code Management](#invitation-code-management)
6. [Knowledge Base Management](#knowledge-base-management)
7. [Document Management](#document-management)
8. [Department Management](#department-management)
9. [Document Type Management](#document-type-management)
10. [Tool Permission Management](#tool-permission-management)
11. [System Prompt Management](#system-prompt-management)
12. [Model Configuration](#model-configuration)
13. [Popular Questions Management](#popular-questions-management)
14. [Quick Access Links](#quick-access-links)
15. [Version Management](#version-management)
16. [Chat History Review](#chat-history-review)

### Part C: Technical Documentation
17. [System Architecture](#system-architecture)
18. [Codebase Structure](#codebase-structure)
19. [Database Schema](#database-schema)
20. [Deployment Guide](#deployment-guide)
21. [Maintenance & Troubleshooting](#maintenance--troubleshooting)

---

# PART A: USER FEATURES

## Getting Started

### Admin Account Setup

1. **Use Chairperson Signup Code**
   - Obtain a one-time chairperson signup code
   - These codes are created by existing chairpersons

2. **Registration**
   - Navigate to signup page
   - Enter your UTAR email (@utar.edu.my)
   - Enter the chairperson signup code
   - Create a secure password
   - Complete registration

3. **Access**
   - Login with your credentials
   - You'll have full access to:
     - All user features
     - Complete admin dashboard
     - System configuration

## All Member Features

As a chairperson, you have access to ALL features available to public, student, and member users:

- ✅ Complete staff directory search
- ✅ JCR Journal Metrics tool
- ✅ Nature Index tools
- ✅ All document levels (public, student, member, chairperson)
- ✅ Chat history management
- ✅ **PLUS: Admin Dashboard**

---

# PART B: ADMIN DASHBOARD

## Dashboard Overview

**Access**: `/admin/dashboard`

The admin dashboard is your central hub for system management.

### Key Metrics Displayed

1. **User Statistics**
   - Total users by role
   - Pending approvals (public users)
   - Recent registrations
   - Active users

2. **Content Statistics**
   - Total knowledge notes
   - Total documents
   - Documents by category
   - Processing status

3. **System Health**
   - Database status
   - Vector DB (Pinecone) status
   - API usage
   - Recent errors

4. **Activity Feed**
   - Recent user registrations
   - Document uploads
   - Knowledge note updates
   - System changes

### Quick Actions

- Create new knowledge note
- Upload document
- Approve pending users
- Generate invitation code

---

## User Management

**Access**: `/admin/users`

### Overview

Manage all user accounts, roles, and permissions.

### Features

#### View All Users

**Table Columns:**
- Name
- Email
- Role (public, student, member, chairperson)
- Approval status
- Last login
- Registration date

**Filters:**
- By role
- By approval status
- By registration date
- Search by name/email

#### Approve Public Users

**Process:**
1. Navigate to "Pending Approvals" tab
2. Review user details:
   - Name
   - Email
   - Registration date
   - Reason for access (if provided)
3. Click "Approve" or "Reject"
4. User receives email notification

**Best Practices:**
- Verify email addresses look legitimate
- Check for spam/fake registrations
- Approve within 1-2 business days

#### Manage User Roles

**Changing Roles:**
1. Find user in table
2. Click "Edit" or role dropdown
3. Select new role
4. Confirm change
5. User's access updates immediately

**Role Hierarchy:**
- **Public**: Basic access, requires approval
- **Student**: UTAR students with invitation code
- **Member**: UTAR staff/faculty
- **Chairperson**: Full admin access

**⚠️ Warning**: Changing a chairperson to a lower role removes their admin access!

#### View User Activity

**Available Data:**
- Login history
- Chat sessions
- Document downloads
- Tool usage

**Use Cases:**
- Monitor system usage
- Identify power users
- Troubleshoot user issues

---

## Invitation Code Management

**Access**: `/admin/invitation-codes`

### Overview

Create and manage reusable invitation codes for UTAR student/staff registration.

### Creating Invitation Codes

**Steps:**
1. Click "Create New Code"
2. Configure:
   - **Code**: Auto-generated or custom
   - **Expiration Date**: Optional
   - **Remark**: Cohort, department, or purpose (e.g., "2024 Intake", "FSc Staff")
3. Click "Create"
4. Share code with intended users

**Code Format:**
- Alphanumeric
- Case-insensitive
- Typically 8-12 characters

### Managing Codes

**Table View:**
- Code
- Usage count
- Expiration date
- Remark
- Status (active/expired)
- Created date

**Actions:**
- **Deactivate**: Prevent further use
- **Edit**: Update remark or expiration
- **Delete**: Remove code (careful!)
- **View Users**: See who used this code

### Best Practices

1. **Use Descriptive Remarks**
   - "2024 Engineering Students"
   - "Computer Science Department"
   - "Research Staff - Q1 2025"

2. **Set Expiration Dates**
   - For cohort-specific codes
   - Prevents indefinite use

3. **Monitor Usage**
   - Check usage counts regularly
   - Deactivate unused codes

4. **Security**
   - Don't share codes publicly
   - Create new codes for each cohort/group

---

## Knowledge Base Management

**Access**: `/admin/knowledge`

### Overview

Create, edit, and organize priority knowledge notes for the RAG system.

### What are Knowledge Notes?

**Purpose:**
- High-priority content for RAG retrieval
- Policies, procedures, FAQs
- Structured information for common queries

**vs Documents:**
- **Knowledge Notes**: Text-based, searchable, high priority
- **Documents**: PDF/file uploads, lower priority in RAG

### Creating Knowledge Notes

**Steps:**
1. Click "Create New Note"
2. Fill in details:

**Required Fields:**
- **Title**: Clear, descriptive (e.g., "RPS Claim Procedure")
- **Content**: Full text content (Markdown supported)

**Optional Fields:**
- **Department**: Assign to specific department
- **Document Type**: Policy, Form, Procedure, etc.
- **Category**: Legacy field (optional)
- **Tags**: Keywords for better search (e.g., "rps", "claim", "research")
- **Priority**: Standard, High, Critical
- **Access Level**: Who can see this note
  - Public
  - Student
  - Member
  - Chairperson
- **Format Type**: Auto, Markdown, Plain Text

3. Click "Create"

### Editing Knowledge Notes

**Process:**
1. Find note in table
2. Click "Edit"
3. Modify fields
4. Click "Save"
5. Changes take effect immediately

**⚠️ Important**: Editing a note updates its `updatedAt` timestamp, which may affect RAG ranking.

### Organizing Notes

**By Department:**
- Assign notes to departments for better organization
- Users can filter by department

**By Document Type:**
- Categorize as Policy, Form, Procedure, etc.
- Helps users find relevant information

**By Tags:**
- Add multiple tags for better searchability
- Use consistent tag naming

**By Priority:**
- **Critical**: Always prioritized in RAG
- **High**: Preferred over standard
- **Standard**: Normal priority

### Access Control

**Access Levels:**
- **Public**: Everyone can see
- **Student**: Students and above
- **Member**: Members and chairpersons only
- **Chairperson**: Admins only

**Multiple Levels:**
- You can select multiple access levels
- Note is visible to any selected role

### Linking Documents

**Feature**: Link PDF documents to knowledge notes

**Use Case:**
- Knowledge note explains policy
- Linked document is the official PDF

**How:**
1. Edit knowledge note
2. Select linked documents
3. Save

### Best Practices

1. **Clear Titles**: Use descriptive, searchable titles
2. **Comprehensive Content**: Include all relevant information
3. **Use Tags**: Add 3-5 relevant tags
4. **Set Appropriate Access**: Don't over-restrict
5. **Link Documents**: Connect related PDFs
6. **Regular Updates**: Keep content current

---

## Document Management

**Access**: `/admin/documents`

### Overview

Upload, organize, and manage PDF documents for the RAG system.

### Uploading Documents

**Steps:**
1. Click "Upload Document"
2. Select PDF file
3. Configure:
   - **Category**: Policy or Form
   - **Department**: Assign to department
   - **Access Level**: public, student, member, chairperson
4. Click "Upload"
5. Document is processed automatically

**Processing:**
- File is uploaded to storage (Supabase)
- Text is extracted
- Content is chunked
- Chunks are embedded and stored in Pinecone
- Status updates from "processing" to "processed"

### Document Table

**Columns:**
- Filename
- Original name
- Category
- Department
- Access level
- Status
- Upload date
- File size

**Filters:**
- By category
- By department
- By access level
- By status

### Document Status

**Processing**: Currently being embedded
**Processed**: Ready for RAG retrieval
**Failed**: Error during processing

**Troubleshooting Failed Documents:**
1. Check file format (must be PDF)
2. Verify file isn't corrupted
3. Check file size (< 10MB recommended)
4. Re-upload if necessary

### Managing Documents

**Actions:**
- **Download**: Get original file
- **Edit**: Update category, department, access level
- **Delete**: Remove document (also removes from vector DB)
- **Reprocess**: Retry embedding if failed

**⚠️ Warning**: Deleting a document removes it from the vector database. This action cannot be undone!

### Best Practices

1. **Descriptive Filenames**: Use clear, searchable names
2. **Correct Categorization**: Policy vs Form
3. **Appropriate Access**: Match document sensitivity
4. **Department Assignment**: Helps users find relevant docs
5. **Monitor Processing**: Check for failed uploads
6. **Regular Cleanup**: Remove outdated documents

---

## Department Management

**Access**: `/admin/settings/departments`

### Overview

Create and manage departments for organizing knowledge notes and documents.

### Creating Departments

**Steps:**
1. Click "Create Department"
2. Fill in:
   - **Name**: Full department name (e.g., "Department of Human Resources")
   - **Abbreviation**: Short code (e.g., "DHR")
   - **Color**: Hex color for UI badges (e.g., "#3B82F6")
   - **Icon**: Upload icon image (optional)
3. Click "Create"

### Editing Departments

**Editable Fields:**
- Name
- Abbreviation
- Color
- Icon
- Active status

**Deactivating:**
- Set "Active" to false
- Department won't appear in dropdowns
- Existing assignments remain

### Best Practices

1. **Consistent Naming**: Use official department names
2. **Unique Abbreviations**: Avoid conflicts
3. **Color Coding**: Use distinct colors for visual differentiation
4. **Icons**: Optional but helpful for quick recognition

---

## Document Type Management

**Access**: `/admin/settings/document-types`

### Overview

Create and manage document types (Policy, Form, Procedure, etc.) for categorizing knowledge notes.

### Creating Document Types

**Steps:**
1. Click "Create Document Type"
2. Fill in:
   - **Name**: Type name (e.g., "Policy", "Form", "Guideline")
   - **Color**: Hex color for UI styling
   - **Icon**: Upload icon image (optional)
3. Click "Create"

### Managing Document Types

**Table View:**
- Name
- Color preview
- Icon
- Active status
- Created date

**Actions:**
- Edit
- Deactivate
- Delete (if no notes use it)

### Best Practices

1. **Standard Types**: Policy, Form, Procedure, Guideline, FAQ
2. **Distinct Colors**: Help users identify types quickly
3. **Consistent Usage**: Train content creators on when to use each type

---

## Tool Permission Management

**Access**: `/admin/tools`

### Overview

Configure which user roles can access each specialized tool.

### Available Tools

1. **jcr_journal_metric**
   - Description: Query JCR Impact Factors and Quartiles
   - Default: member, chairperson

2. **nature_index_journal_lookup**
   - Description: Check if journal is in Nature Index
   - Default: All roles

3. **nature_index_journals_ranked_by_jif**
   - Description: List/rank all 145 Nature Index journals
   - Default: All roles

4. **utar_staff_search**
   - Description: Search UTAR staff directory
   - Default: All roles

5. **utar_resolve_unit**
   - Description: Resolve unit acronyms
   - Default: All roles

6. **utar_list_departments**
   - Description: List departments in a faculty
   - Default: All roles

### Configuring Permissions

**Steps:**
1. Find tool in table
2. Click "Edit"
3. Select allowed roles:
   - ☐ Public
   - ☐ Student
   - ☐ Member
   - ☐ Chairperson
4. Click "Save"
5. Changes take effect immediately

### Best Practices

**JCR Tool:**
- Recommended: member, chairperson only
- Reason: Research-focused, valuable data

**Nature Index Tools:**
- Recommended: All roles
- Reason: Educational, publicly available data

**Staff Tools:**
- Recommended: All roles
- Reason: Internal directory, useful for everyone

**⚠️ Warning**: Removing access from all roles will make the tool unusable!

---

## System Prompt Management

**Access**: `/admin/system-prompt`

### Overview

Edit the RAG system prompt that guides the chatbot's behavior.

### What is the System Prompt?

**Purpose:**
- Instructs the AI on how to behave
- Defines tool usage guidelines
- Sets response formatting rules
- Establishes personality and tone

**Impact:**
- Changes affect ALL user interactions
- Critical for chatbot quality

### Editing the System Prompt

**Steps:**
1. View current prompt
2. Click "Edit"
3. Modify text
4. Click "Save"
5. Test changes with sample queries

**⚠️ CRITICAL**: Test thoroughly before saving! Bad prompts can break the chatbot.

### System Prompt Components

**Typical Structure:**
1. **Role Definition**: "You are a helpful assistant for UTAR..."
2. **Tool Instructions**: When and how to use each tool
3. **Response Guidelines**: Formatting, tone, length
4. **Edge Cases**: How to handle errors, unknown queries
5. **Document Handling**: When to recommend documents

### Best Practices

1. **Version Control**: Keep backups of working prompts
2. **Incremental Changes**: Don't rewrite everything at once
3. **Test Thoroughly**: Try various query types
4. **Document Changes**: Note what you changed and why
5. **Revert if Needed**: Keep previous version handy

### Common Modifications

**Adding New Tool:**
- Add tool description
- Specify when to use it
- Provide example queries

**Changing Tone:**
- Adjust formality level
- Modify greeting style
- Update response structure

**Improving Accuracy:**
- Add specific instructions for common errors
- Clarify ambiguous guidelines
- Provide more examples

---

## Model Configuration

**Access**: `/admin/model-config`

### Overview

Select which OpenAI model the chatbot uses.

### Available Models

1. **GPT-4O**
   - **Best for**: Highest quality responses
   - **Speed**: Moderate
   - **Cost**: Highest
   - **Use when**: Quality is paramount

2. **GPT-4O-mini**
   - **Best for**: Balanced quality and cost
   - **Speed**: Fast
   - **Cost**: Moderate
   - **Use when**: Good balance needed (RECOMMENDED)

3. **GPT-3.5-turbo**
   - **Best for**: High volume, simple queries
   - **Speed**: Fastest
   - **Cost**: Lowest
   - **Use when**: Budget-conscious

### Changing the Model

**Steps:**
1. View current model
2. Click "Change Model"
3. Select new model
4. Review description
5. Click "Activate"
6. Changes take effect immediately

**Cache Invalidation:**
- Model config is cached for 30 days
- Saving changes invalidates cache immediately
- All users get new model on next query

### Cost Considerations

**Estimating Costs:**
- Track usage in OpenAI dashboard
- Monitor monthly spend
- Adjust model based on budget

**Optimization:**
- Use GPT-4O-mini for most cases
- Reserve GPT-4O for critical periods (e.g., exam season)
- GPT-3.5-turbo for very high volume

### Performance Monitoring

**Metrics to Track:**
- Response quality (user feedback)
- Response time
- Error rates
- Cost per query

---

## Popular Questions Management

**Access**: `/admin/popular-questions`

### Overview

Create suggested questions that appear on the chat interface.

### Purpose

**Benefits:**
- Help users get started
- Showcase chatbot capabilities
- Guide users to useful features
- Reduce "What can I ask?" confusion

### Creating Popular Questions

**Steps:**
1. Click "Create Question"
2. Fill in:
   - **Question**: Full question text (e.g., "Who is the Dean of LKC FES?")
   - **Roles**: Which roles can see this question
   - **Order**: Display order (lower = higher priority)
3. Click "Create"

### Managing Questions

**Table View:**
- Question text
- Visible to roles
- Order
- Active status
- Created date

**Actions:**
- Edit
- Reorder
- Deactivate
- Delete

### Best Practices

1. **Diverse Questions**: Cover different features
   - Staff search example
   - Journal lookup example
   - Policy question example

2. **Role-Appropriate**:
   - Public: Basic questions
   - Student: Academic questions
   - Member: Research questions

3. **Clear and Specific**:
   - ✅ "What is the impact factor of Nature journal?"
   - ❌ "Tell me about journals"

4. **Limit Quantity**:
   - 3-5 questions per role
   - Too many overwhelms users

5. **Regular Updates**:
   - Refresh seasonally
   - Remove outdated questions

---

## Quick Access Links

**Access**: `/admin/quick-access`

### Overview

Manage custom links in the sidebar for quick access to external resources.

### Link Sections

1. **CHST Section**: CHST-related links
2. **Others Section**: General UTAR resources

### Creating Links

**Steps:**
1. Click "Create Link"
2. Fill in:
   - **Name**: Display text (e.g., "UTAR Portal")
   - **URL**: Full URL (e.g., "https://portal.utar.edu.my")
   - **Section**: CHST or Others
   - **Icon**: Lucide icon name (optional)
   - **Roles**: Which roles can see this link
   - **Order**: Display order
3. Click "Create"

### Managing Links

**Table View:**
- Name
- URL
- Section
- Roles
- Order
- Active status

**Actions:**
- Edit
- Reorder
- Deactivate
- Delete

### Icon Options

**Lucide Icons:**
- Use icon names from lucide.dev
- Examples: "home", "book", "user", "settings"
- Leave blank for default icon

### Best Practices

1. **Useful Links Only**: Don't clutter sidebar
2. **Clear Names**: Users should know what they're clicking
3. **Verify URLs**: Test links before saving
4. **Role-Appropriate**: Students don't need admin links
5. **Organize by Section**: Group related links

---

## Version Management

**Access**: `/admin/versions`

### Overview

Track and manage chatbot versions with Git integration.

### Purpose

**Benefits:**
- Document changes and updates
- Track deployment history
- Provide transparency to users
- Maintain release notes

### Creating Version Records

**Steps:**
1. Click "Create Version"
2. Fill in:
   - **Version Number**: e.g., "v1.5", "v2.0"
   - **Git Commit Hash**: From your latest deployment
   - **Description**: What's new in this version (Markdown supported)
   - **Set as Current**: Mark this as the active version
3. Click "Create"

### Version Display

**User-Facing:**
- Current version shown in footer
- Users can view version history
- Release notes accessible

**Admin View:**
- All versions listed
- Current version highlighted
- Edit/delete options

### Best Practices

1. **Semantic Versioning**:
   - Major.Minor.Patch (e.g., 2.1.3)
   - Major: Breaking changes
   - Minor: New features
   - Patch: Bug fixes

2. **Detailed Descriptions**:
   - List new features
   - Mention bug fixes
   - Note any breaking changes
   - Include migration steps if needed

3. **Git Integration**:
   - Always include commit hash
   - Matches deployed version
   - Enables rollback if needed

4. **Regular Updates**:
   - Create version record with each deployment
   - Keep users informed

---

## Chat History Review

**Access**: `/admin/chat-history`

### Overview

View and analyze user conversations for quality assurance and insights.

### Features

**View Conversations:**
- All user chat sessions
- Filter by user, date, role
- Search by content

**Analytics:**
- Most common queries
- Tool usage statistics
- Response quality metrics
- User engagement

### Use Cases

1. **Quality Assurance**:
   - Verify chatbot accuracy
   - Identify common errors
   - Improve system prompts

2. **Feature Development**:
   - Discover user needs
   - Identify missing features
   - Prioritize improvements

3. **User Support**:
   - Troubleshoot user issues
   - Understand confusion points
   - Improve documentation

### Privacy Considerations

**⚠️ Important:**
- User conversations may contain sensitive information
- Use chat history review responsibly
- Don't share user data externally
- Comply with privacy policies

### Best Practices

1. **Regular Review**: Weekly or monthly
2. **Pattern Recognition**: Look for common issues
3. **Action Items**: Document improvements needed
4. **Feedback Loop**: Implement changes based on insights

---

# PART C: TECHNICAL DOCUMENTATION

## System Architecture

### Overview

The CHST AI Agent is built on a modern, scalable architecture:

**Technology Stack:**
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL (Neon - serverless)
- **Vector Database**: Pinecone (for RAG embeddings)
- **AI**: OpenAI GPT-4O / GPT-4O-mini
- **Authentication**: Custom JWT-based auth
- **File Storage**: Supabase Storage
- **Deployment**: Vercel (serverless)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│              (Next.js 14 App Router)                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  API Routes                              │
│         (/api/chat, /api/auth, /api/admin)              │
└────────┬───────────┬──────────────┬─────────────────────┘
         │           │              │
    ┌────▼────┐ ┌───▼────┐    ┌───▼──────┐
    │ RAG     │ │ Auth   │    │ Admin    │
    │ Engine  │ │ System │    │ Services │
    └────┬────┘ └───┬────┘    └───┬──────┘
         │          │              │
    ┌────▼──────────▼──────────────▼─────┐
    │         Prisma ORM                  │
    └────────────────┬────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌───▼────┐ ┌───▼──────┐
    │PostgreSQL│ │Pinecone│ │ OpenAI  │
    │  (Neon)  │ │(Vector)│ │   API   │
    └──────────┘ └────────┘ └──────────┘
```

### Data Flow

**User Query Processing:**

1. **User Input** → Chat interface
2. **API Request** → `/api/chat`
3. **RAG Processing** (`lib/rag/query.ts`):
   - Load system prompt
   - Check tool permissions
   - Retrieve relevant documents (Pinecone)
   - Build context
4. **LLM Inference** (OpenAI):
   - Process query with context
   - Decide if tools needed
   - Generate response
5. **Tool Execution** (if needed):
   - Execute tool (staff search, JCR lookup, etc.)
   - Return results to LLM
   - LLM generates final response
6. **Response** → User interface
7. **Storage** → Save to PostgreSQL

---

## Codebase Structure

### Directory Layout

```
chst-chatbot-v1/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin dashboard pages
│   │   ├── chat-history/         # Chat history review
│   │   ├── dashboard/            # Main dashboard
│   │   ├── documents/            # Document management
│   │   ├── invitation-codes/     # Invitation code management
│   │   ├── knowledge/            # Knowledge note management
│   │   ├── model-config/         # AI model configuration
│   │   ├── popular-questions/    # Popular questions management
│   │   ├── quick-access/         # Quick access links
│   │   ├── settings/             # Settings pages
│   │   │   ├── departments/      # Department management
│   │   │   └── document-types/   # Document type management
│   │   ├── system-prompt/        # System prompt editor
│   │   ├── tools/                # Tool permissions
│   │   ├── users/                # User management
│   │   ├── versions/             # Version management
│   │   ├── layout.tsx            # Admin layout
│   │   └── page.tsx              # Admin home
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin API endpoints
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── chat/                 # Chat API
│   │   ├── documents/            # Document API
│   │   └── ...
│   ├── auth/                     # Auth pages (login, signup, etc.)
│   ├── chat/                     # Main chat interface
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── admin/                    # Admin-specific components
│   ├── chat/                     # Chat interface components
│   ├── ui/                       # Reusable UI components
│   └── ...
├── lib/                          # Core libraries
│   ├── db.ts                     # Prisma client instance
│   ├── jcrCache.ts               # JCR data caching and retrieval
│   ├── natureIndexJournalCache.ts # Nature Index journal cache
│   ├── rag/                      # RAG implementation
│   │   └── query.ts              # Main RAG query processing
│   ├── tools/                    # Tool implementations
│   │   ├── index.ts              # All tool functions
│   │   └── units.json            # UTAR organizational structure
│   ├── auth.ts                   # Authentication utilities
│   ├── pinecone.ts               # Pinecone client
│   └── ...
├── prisma/                       # Database
│   └── schema.prisma             # Database schema
├── public/                       # Static assets
│   ├── manuals/                  # User manuals
│   └── ...
├── scripts/                      # Utility scripts
│   ├── import_jcr_year.ts        # Import JCR data
│   ├── sync-staff.ts             # Sync staff directory
│   └── ...
├── data/                         # Data files
│   ├── Journal_in_nature_index.csv # Nature Index journal list
│   └── jcr/                      # JCR datasets
│       └── 2024/
│           └── JCR_2024.csv      # JCR 2024 data
├── .env.local                    # Environment variables (not in Git)
├── next.config.js                # Next.js configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Project documentation
```

### Key Files Explained

#### Core Application

**`lib/rag/query.ts`** (Most Important!)
- Main RAG processing logic
- Tool selection and execution
- System prompt management
- LLM inference loop
- Context building

**`lib/tools/index.ts`**
- All tool implementations:
  - `searchStaff()` - Staff directory search
  - `getJournalMetricsByTitle()` - JCR lookup
  - `lookupNatureIndexJournal()` - Nature Index check
  - `getNatureIndexJournalsRankedByJif()` - Nature Index rankings
  - `resolveUnit()` - Acronym resolution
  - `listDepartments()` - Department listing

**`lib/jcrCache.ts`**
- JCR data caching
- Fuzzy journal name matching
- Impact factor retrieval
- Quartile calculation

**`lib/natureIndexJournalCache.ts`**
- Nature Index journal loading
- Fuzzy search implementation
- Country filtering

**`lib/db.ts`**
- Prisma client instance
- Database connection management

#### Data Files

**`data/Journal_in_nature_index.csv`**
- List of 145 Nature Index journals
- Columns: Journal Name, Country, Is Nature Index

**`data/jcr/2024/JCR_2024.csv`**
- JCR 2024 dataset (15,117 records)
- Columns: Journal name, JCR Abbreviation, Publisher, ISSN, eISSN, Category, Edition, Total Citations, 2024 JIF, JIF Quartile, 2024 JCI, % of Citable OA, Upper Name

**`lib/tools/units.json`**
- UTAR organizational structure
- Faculties, departments, centers
- Acronyms and full names
- Department IDs

#### Scripts

**`scripts/import_jcr_year.ts`**
- Imports JCR data from CSV to database
- Usage: `npx tsx scripts/import_jcr_year.ts 2024`

**`scripts/sync-staff.ts`**
- Syncs UTAR staff directory
- Updates staff information

---

## Database Schema

### Key Models

#### User
```prisma
model User {
  id            String        @id @default(uuid())
  email         String        @unique
  passwordHash  String
  name          String
  role          UserRole      // public, student, member, chairperson
  isApproved    Boolean       @default(false)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  // ... more fields
}
```

#### ChatSession & Message
```prisma
model ChatSession {
  id        String    @id @default(uuid())
  userId    String
  title     String?
  createdAt DateTime  @default(now())
  messages  Message[]
}

model Message {
  id          String      @id @default(uuid())
  sessionId   String
  userId      String
  role        String      // 'user' or 'assistant'
  content     String      @db.Text
  sources     Json?       // RAG sources
  createdAt   DateTime    @default(now())
}
```

#### KnowledgeNote
```prisma
model KnowledgeNote {
  id              String   @id @default(uuid())
  title           String
  content         String   @db.Text
  departmentId    String?
  documentTypeId  String?
  category        String?
  priority        String   @default("standard")
  accessLevel     String[] @default(["public", "student", "member", "chairperson"])
  tags            String[] @default([])
  isActive        Boolean  @default(true)
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

#### Document
```prisma
model Document {
  id            String      @id @default(uuid())
  filename      String
  originalName  String
  accessLevel   AccessLevel @default(student)
  category      String      @default("policy") // policy, form
  department    String      @default("General")
  filePath      String
  fileSize      Int
  status        String      @default("processing")
  uploadedById  String
  uploadedAt    DateTime    @default(now())
  vectorIds     Json?       // Pinecone vector IDs
  chunkCount    Int?
}
```

#### JcrJournalMetric
```prisma
model JcrJournalMetric {
  id              Int      @id @default(autoincrement())
  fullTitle       String
  normalizedTitle String
  issnPrint       String?
  issnElectronic  String?
  category        String
  edition         String?
  jifYear         Int
  jifValue        Decimal? @db.Decimal(10, 3)
  jifQuartile     String
  // ... more fields
}
```

#### ToolPermission
```prisma
model ToolPermission {
  id           String   @id @default(uuid())
  toolName     String   @unique
  description  String?
  allowedRoles String[] @default(["chairperson"])
  updatedAt    DateTime @updatedAt
}
```

### Relationships

- **User** → ChatSessions → Messages
- **User** → KnowledgeNotes (creator)
- **User** → Documents (uploader)
- **KnowledgeNote** → Department
- **KnowledgeNote** → DocumentType
- **KnowledgeNote** ↔ Documents (many-to-many)

---

## Deployment Guide

### Prerequisites

1. **Accounts Needed:**
   - GitHub account
   - Vercel account
   - Neon (PostgreSQL) account
   - Pinecone account
   - OpenAI account
   - Supabase account

2. **Local Development:**
   - Node.js 18+ installed
   - Git installed
   - Code editor (VS Code recommended)

### Initial Setup

#### 1. Clone Repository

```bash
git clone https://github.com/UTARSL1/chst-chatbot-v1.git
cd chst-chatbot-v1
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Environment Variables

Create `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://..."          # Neon connection string
DIRECT_URL="postgresql://..."            # Neon direct connection

# OpenAI
OPENAI_API_KEY="sk-..."                  # OpenAI API key

# Pinecone
PINECONE_API_KEY="..."                   # Pinecone API key
PINECONE_INDEX="chst-chatbot"            # Pinecone index name
PINECONE_ENVIRONMENT="us-east-1"         # Pinecone environment

# Authentication
JWT_SECRET="your-secret-key"             # Random string for JWT signing
NEXTAUTH_SECRET="your-nextauth-secret"   # Random string for NextAuth
NEXTAUTH_URL="http://localhost:3000"     # Your app URL

# Supabase (for file storage)
NEXT_PUBLIC_SUPABASE_URL="https://..."   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."      # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY="..."          # Supabase service role key

# Optional
DEMO_MODE="false"                        # Set to "true" for demo mode
```

#### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

#### 5. Import Data

**JCR Data:**
```bash
npx tsx scripts/import_jcr_year.ts 2024
```

**Staff Directory:**
```bash
npx tsx scripts/sync-staff.ts
```

#### 6. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### Production Deployment (Vercel)

#### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

#### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: .next

#### 3. Add Environment Variables

In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add all variables from `.env.local`
3. Make sure to use production URLs/keys

#### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit your production URL

#### 5. Post-Deployment

**Import Data:**
- Run import scripts on production database
- Use Vercel CLI or direct database access

**Create First Admin:**
- Generate chairperson signup code manually in database
- Or use Prisma Studio connected to production DB

### Continuous Deployment

**Automatic Deployments:**
- Push to `main` branch → Auto-deploy to production
- Push to other branches → Preview deployments

**Manual Deployments:**
- Use Vercel dashboard
- Or Vercel CLI: `vercel --prod`

---

## Maintenance & Troubleshooting

### Regular Maintenance Tasks

#### Daily
- Monitor error logs (Vercel dashboard)
- Check user feedback
- Approve pending public users

#### Weekly
- Review chat history for quality
- Check system performance
- Monitor API costs (OpenAI, Pinecone)

#### Monthly
- Update JCR data (if new release)
- Sync staff directory
- Review and update knowledge notes
- Check for outdated documents
- Update popular questions

#### Quarterly
- Review tool permissions
- Update system prompt if needed
- Analyze usage patterns
- Plan feature improvements

#### Annually
- Import new JCR year data
- Update Nature Index journal list
- Review and archive old chat sessions
- Security audit

### Data Updates

#### Updating JCR Data

**When**: Annually, when new JCR data is released (typically June/July)

**Steps:**
1. Obtain new JCR CSV file
2. Place in `data/jcr/YYYY/JCR_YYYY.csv`
3. Run import script:
   ```bash
   npx tsx scripts/import_jcr_year.ts YYYY
   ```
4. Verify import success
5. Test JCR tool with sample queries

#### Updating Nature Index List

**When**: As needed (Nature Index updates periodically)

**Steps:**
1. Obtain updated journal list
2. Replace `data/Journal_in_nature_index.csv`
3. Restart application to reload cache
4. Test Nature Index tools

#### Syncing Staff Directory

**When**: Monthly or as needed

**Steps:**
1. Run sync script:
   ```bash
   npx tsx scripts/sync-staff.ts
   ```
2. Verify staff data updated
3. Test staff search tool

### Common Issues & Solutions

#### Issue: Chatbot Not Responding

**Symptoms:**
- Chat interface loads but no response
- Spinning indicator indefinitely

**Possible Causes:**
1. OpenAI API key invalid/expired
2. Rate limit exceeded
3. Network issues
4. Database connection failed

**Solutions:**
1. Check OpenAI API key in environment variables
2. Verify API usage in OpenAI dashboard
3. Check Vercel logs for errors
4. Test database connection with Prisma Studio

#### Issue: Tool Not Working

**Symptoms:**
- Tool called but returns error
- Unexpected results

**Possible Causes:**
1. Tool permissions not configured
2. Data not loaded (JCR, Nature Index, Staff)
3. Cache not initialized

**Solutions:**
1. Check tool permissions in admin dashboard
2. Verify data files exist and are loaded
3. Restart application to reload caches
4. Check logs for specific error messages

#### Issue: Document Upload Fails

**Symptoms:**
- Upload stuck at "processing"
- Status shows "failed"

**Possible Causes:**
1. Supabase storage issue
2. Pinecone embedding failed
3. File too large or corrupted
4. Network timeout

**Solutions:**
1. Check Supabase dashboard for storage errors
2. Verify Pinecone API key and index
3. Try smaller file or re-save PDF
4. Check Vercel function timeout settings

#### Issue: User Can't Login

**Symptoms:**
- "Invalid credentials" error
- Email not found

**Possible Causes:**
1. Account not approved (public users)
2. Email not verified
3. Password incorrect
4. Account doesn't exist

**Solutions:**
1. Check user status in admin dashboard
2. Resend verification email
3. Use password reset
4. Verify user registered correctly

#### Issue: RAG Returns Irrelevant Documents

**Symptoms:**
- Wrong documents in response
- Documents don't match query

**Possible Causes:**
1. Poor document embeddings
2. System prompt issues
3. Access level mismatch

**Solutions:**
1. Reprocess documents (delete and re-upload)
2. Review and update system prompt
3. Check document access levels
4. Add more specific knowledge notes

### Performance Optimization

#### Database Optimization

**Indexes:**
- Ensure indexes on frequently queried fields
- Check `schema.prisma` for `@@index` directives

**Query Optimization:**
- Use `select` to limit returned fields
- Implement pagination for large result sets
- Use database connection pooling

#### Caching

**Current Caching:**
- JCR data: In-memory cache, loaded on startup
- Nature Index: In-memory cache, loaded on startup
- System prompts: Cached for 10 minutes (30 min in demo mode)
- Tool permissions: Cached for 10 minutes
- Model config: Cached for 30 days

**Optimization:**
- Increase cache TTL if data rarely changes
- Implement Redis for distributed caching (if scaling)

#### API Cost Management

**OpenAI:**
- Monitor usage in OpenAI dashboard
- Set usage limits
- Use GPT-4O-mini for cost savings
- Implement rate limiting for users

**Pinecone:**
- Monitor vector count
- Delete old/unused vectors
- Optimize chunk size

### Backup & Recovery

#### Database Backups

**Neon (PostgreSQL):**
- Automatic backups (check Neon dashboard)
- Manual backup: Use `pg_dump`
- Restore: Use `pg_restore`

**Best Practice:**
- Weekly manual backups
- Store backups securely (encrypted)
- Test restore process quarterly

#### Code Backups

**Git:**
- Push to GitHub regularly
- Tag releases: `git tag v1.5.0`
- Keep production branch stable

#### Data File Backups

**Important Files:**
- `data/Journal_in_nature_index.csv`
- `data/jcr/YYYY/JCR_YYYY.csv`
- `lib/tools/units.json`

**Best Practice:**
- Version control in Git
- Keep copies of original data sources

### Security Best Practices

1. **Environment Variables:**
   - Never commit `.env.local` to Git
   - Rotate secrets regularly
   - Use strong, random values

2. **User Data:**
   - Respect privacy in chat history review
   - Don't share user data externally
   - Comply with data protection regulations

3. **Access Control:**
   - Limit chairperson accounts
   - Use strong passwords
   - Enable 2FA (if implemented)

4. **API Keys:**
   - Rotate OpenAI API keys periodically
   - Monitor for unauthorized usage
   - Set usage limits

5. **Database:**
   - Use connection pooling
   - Enable SSL for connections
   - Regular security updates

### Monitoring & Logging

#### Vercel Logs

**Access:**
- Vercel Dashboard → Your Project → Logs

**What to Monitor:**
- Error rates
- Response times
- Function execution times
- Build logs

#### OpenAI Usage

**Access:**
- OpenAI Dashboard → Usage

**What to Monitor:**
- Daily token usage
- Cost trends
- Rate limit hits

#### Pinecone Usage

**Access:**
- Pinecone Dashboard → Your Index

**What to Monitor:**
- Vector count
- Query volume
- Storage usage

### Scaling Considerations

**When to Scale:**
- Response times > 5 seconds consistently
- High error rates
- Database connection limits reached
- API rate limits frequently hit

**Scaling Options:**
1. **Upgrade Vercel Plan**: More function execution time
2. **Upgrade Neon Plan**: More database connections
3. **Optimize Queries**: Reduce database load
4. **Implement Caching**: Redis for distributed cache
5. **Load Balancing**: Multiple instances (advanced)

---

## Handover Checklist

When transitioning to a new administrator:

### Access & Credentials

- [ ] Vercel account access
- [ ] GitHub repository access
- [ ] Neon database access
- [ ] Pinecone account access
- [ ] OpenAI account access
- [ ] Supabase account access
- [ ] Chairperson account in chatbot

### Documentation

- [ ] Review this manual thoroughly
- [ ] Understand system architecture
- [ ] Know where key files are located
- [ ] Understand deployment process

### Knowledge Transfer

- [ ] Walkthrough of admin dashboard
- [ ] Demonstration of common tasks
- [ ] Review of current issues/bugs
- [ ] Explanation of customizations

### Ongoing Tasks

- [ ] Schedule for data updates
- [ ] Monitoring responsibilities
- [ ] User support procedures
- [ ] Backup procedures

---

## Support & Resources

### Internal Resources

**Documentation:**
- This manual
- Code comments
- README.md in repository

**Tools:**
- Prisma Studio: Database viewer
- Vercel Dashboard: Deployment & logs
- GitHub: Code repository

### External Resources

**Next.js:**
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js GitHub](https://github.com/vercel/next.js)

**Prisma:**
- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

**OpenAI:**
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [OpenAI Cookbook](https://github.com/openai/openai-cookbook)

**Pinecone:**
- [Pinecone Documentation](https://docs.pinecone.io)

**Vercel:**
- [Vercel Documentation](https://vercel.com/docs)

### Getting Help

**Technical Issues:**
- Check Vercel logs first
- Review error messages carefully
- Search GitHub issues
- Consult documentation

**Feature Requests:**
- Document in GitHub issues
- Discuss with team
- Plan implementation

**Emergency Contact:**
- [Your emergency contact info]

---

## Appendix

### Glossary

**RAG**: Retrieval-Augmented Generation - AI technique combining document retrieval with LLM generation

**JCR**: Journal Citation Reports - Database of journal impact metrics

**JIF**: Journal Impact Factor - Measure of journal citation frequency

**Nature Index**: List of 145 elite research journals

**Pinecone**: Vector database for semantic search

**Prisma**: ORM (Object-Relational Mapping) for database access

**Vercel**: Deployment platform for Next.js applications

**Neon**: Serverless PostgreSQL database

### Keyboard Shortcuts

**Admin Dashboard:**
- `Ctrl/Cmd + K`: Quick search (if implemented)
- `Ctrl/Cmd + S`: Save (in editors)

**Chat Interface:**
- `Enter`: Send message
- `Shift + Enter`: New line

### API Rate Limits

**OpenAI:**
- Varies by plan
- Check dashboard for current limits

**Pinecone:**
- Free tier: Limited queries/month
- Paid tier: Higher limits

### File Size Limits

**Document Uploads:**
- Recommended: < 10MB
- Maximum: 50MB (Vercel function limit)

**Knowledge Notes:**
- No hard limit
- Recommended: < 100KB for performance

---

## Version Information

**Manual Version:** 1.0  
**Last Updated:** December 2025  
**Chatbot Version:** [Current version]  
**Author:** CHST Development Team

---

**Thank you for administering the CHST AI Agent!**

This system is designed to serve the UTAR community with accurate, helpful information. Your role as administrator is crucial to maintaining quality and reliability.

If you have questions or need assistance, refer to this manual first, then consult the resources listed above.

**Good luck, and happy administrating!** 🚀

