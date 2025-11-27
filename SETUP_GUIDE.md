# CHST-Chatbot V1 - Complete Setup Guide

This guide will walk you through setting up PostgreSQL, Pinecone, and all required API keys.

---

## Part 1: PostgreSQL Installation (Windows)

### Option A: Install PostgreSQL Locally (Recommended for Development)

#### Step 1: Download PostgreSQL

1. **Visit the download page:**
   - Go to: https://www.postgresql.org/download/windows/
   
2. **Click "Download the installer"**
   - This takes you to EnterpriseDB's download page
   - EnterpriseDB provides the official Windows installer

3. **Select version:**
   - Choose **PostgreSQL 16.x** (latest stable version)
   - Click "Windows x86-64" to download
   - File size: ~300-400 MB
   - Save the installer file (e.g., `postgresql-16.x-windows-x64.exe`)

#### Step 2: Run the Installer

1. **Launch the installer:**
   - Double-click the downloaded `.exe` file
   - Click "Yes" if Windows asks for permission

2. **Setup Wizard - Welcome Screen:**
   - Click "Next"

3. **Installation Directory:**
   - Default: `C:\Program Files\PostgreSQL\16`
   - **Recommendation:** Keep the default
   - Click "Next"

4. **Select Components:**
   - ✅ PostgreSQL Server (required)
   - ✅ pgAdmin 4 (GUI tool - highly recommended!)
   - ✅ Stack Builder (optional, for additional tools)
   - ✅ Command Line Tools (required)
   - Click "Next"

5. **Data Directory:**
   - Default: `C:\Program Files\PostgreSQL\16\data`
   - **Recommendation:** Keep the default
   - This is where your databases will be stored
   - Click "Next"

6. **Set Superuser Password:**
   - **CRITICAL STEP!**
   - Enter a strong password for the `postgres` user
   - **Example:** `MySecurePass123!`
   - **IMPORTANT:** Write this down! You'll need it later
   - Re-enter password to confirm
   - Click "Next"

7. **Port Number:**
   - Default: `5432`
   - **Recommendation:** Keep the default unless you have a conflict
   - Click "Next"

8. **Locale:**
   - Default: `[Default locale]`
   - **Recommendation:** Keep the default
   - Click "Next"

9. **Pre-Installation Summary:**
   - Review your settings
   - Click "Next" to begin installation

10. **Installation Progress:**
    - Wait 2-5 minutes for installation to complete
    - You'll see progress bars for various components

11. **Completing Setup:**
    - Uncheck "Launch Stack Builder at exit" (unless you need additional tools)
    - Click "Finish"

#### Step 3: Verify PostgreSQL Installation

**Option A: Using Command Line**

1. **Open PowerShell:**
   - Press `Win + X`
   - Select "Windows PowerShell" or "Terminal"

2. **Check PostgreSQL version:**
   ```powershell
   psql --version
   ```
   
   **Expected output:**
   ```
   psql (PostgreSQL) 16.x
   ```

3. **If command not found:**
   - PostgreSQL might not be in your PATH
   - Add to PATH manually:
     ```powershell
     $env:Path += ";C:\Program Files\PostgreSQL\16\bin"
     ```
   - Or restart your computer

**Option B: Using pgAdmin 4**

1. **Launch pgAdmin 4:**
   - Search for "pgAdmin 4" in Windows Start menu
   - Double-click to open

2. **Set Master Password:**
   - First time only: Set a master password for pgAdmin
   - This is different from your PostgreSQL password
   - Click "OK"

3. **Connect to Server:**
   - In the left sidebar, expand "Servers"
   - Click on "PostgreSQL 16"
   - Enter the password you set during installation
   - Check "Save password" (optional)
   - Click "OK"

4. **Verify Connection:**
   - If successful, you'll see "Databases" folder
   - PostgreSQL is running correctly!

#### Step 4: Create Database for CHST-Chatbot

**Option A: Using pgAdmin 4 (Recommended for Beginners)**

1. **Open pgAdmin 4** (if not already open)

2. **Connect to PostgreSQL server:**
   - Expand "Servers" → "PostgreSQL 16"
   - Enter your password if prompted

3. **Create Database:**
   - Right-click on "Databases"
   - Select "Create" → "Database..."

4. **Database Settings:**
   - **Database name:** `chst_chatbot`
   - **Owner:** `postgres` (default)
   - **Encoding:** `UTF8` (default)
   - Leave other settings as default

5. **Save:**
   - Click "Save"
   - You should now see `chst_chatbot` in the Databases list

**Option B: Using Command Line (psql)**

1. **Open PowerShell**

2. **Connect to PostgreSQL:**
   ```powershell
   psql -U postgres
   ```

3. **Enter password:**
   - Type the password you set during installation
   - Press Enter

4. **Create database:**
   ```sql
   CREATE DATABASE chst_chatbot;
   ```

5. **Verify database was created:**
   ```sql
   \l
   ```
   - You should see `chst_chatbot` in the list

6. **Exit psql:**
   ```sql
   \q
   ```

#### Step 5: Get Your Connection String

Your `DATABASE_URL` will be:

```
postgresql://postgres:YOUR_PASSWORD@localhost:5432/chst_chatbot
```

**Replace `YOUR_PASSWORD` with:**
- The password you set during PostgreSQL installation (Step 2.6)

**Example:**
If your password is `MySecurePass123!`, your connection string is:
```
postgresql://postgres:MySecurePass123!@localhost:5432/chst_chatbot
```

**Save this connection string - you'll need it for `.env.local`!**

#### Troubleshooting PostgreSQL

**Issue: "psql: command not found"**
- PostgreSQL bin folder not in PATH
- Solution: Add to PATH or use full path:
  ```powershell
  & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
  ```

**Issue: "password authentication failed"**
- Wrong password entered
- Solution: Reset password or reinstall PostgreSQL

**Issue: "could not connect to server"**
- PostgreSQL service not running
- Solution: 
  1. Open Services (Win + R, type `services.msc`)
  2. Find "postgresql-x64-16"
  3. Right-click → Start

**Issue: Port 5432 already in use**
- Another PostgreSQL instance or application using the port
- Solution: Change port during installation or stop conflicting service

---

### Option B: Use Cloud PostgreSQL (Alternative - Easier Setup)

If you prefer not to install PostgreSQL locally, use a free cloud service:

#### Supabase (Recommended - Free Tier)

1. **Sign Up:**
   - Visit: https://supabase.com
   - Click "Start your project"
   - Sign up with GitHub or Google

2. **Create Project:**
   - Click "New Project"
   - **Organization:** Create new or select existing
   - **Name:** `chst-chatbot`
   - **Database Password:** Choose a strong password (save it!)
   - **Region:** Southeast Asia (Singapore) or closest to you
   - **Pricing Plan:** Free

3. **Wait for Setup:**
   - Takes ~2 minutes to provision
   - You'll see a progress indicator

4. **Get Connection String:**
   - Go to "Project Settings" (gear icon)
   - Click "Database" in the left menu
   - Scroll to "Connection string"
   - Select "URI" tab
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your actual password

5. **Your DATABASE_URL:**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```

**Advantages of Supabase:**
- ✅ No local installation needed
- ✅ Automatic backups
- ✅ Built-in database browser
- ✅ Free tier: 500MB database
- ✅ Always accessible (not just on your computer)

#### Neon (Alternative)

1. **Sign Up:**
   - Visit: https://neon.tech
   - Sign up with GitHub or Google

2. **Create Project:**
   - Click "Create a project"
   - **Name:** `chst-chatbot`
   - **Region:** Choose closest to you
   - Click "Create project"

3. **Get Connection String:**
   - After creation, you'll see the connection string
   - Copy it and save

**Advantages of Neon:**
- ✅ Serverless PostgreSQL
- ✅ Auto-scaling
- ✅ Free tier: 3GB storage
- ✅ Instant setup

---

## Part 2: Pinecone Setup

### Step 1: Create Pinecone Account
1. Visit: https://www.pinecone.io
2. Click "Sign Up Free" (top right corner)
3. Choose sign up method:
   - **Option A:** Sign up with Google (recommended - faster)
   - **Option B:** Sign up with email
4. If using email, verify your email address
5. You'll be taken to the Pinecone console

### Step 2: Create API Key

**Detailed Steps:**

1. **After login, you'll see the Pinecone Console**
   - Look at the left sidebar

2. **Navigate to API Keys:**
   - Click "API Keys" in the left sidebar
   - You'll see the API Keys management page

3. **Create New API Key:**
   - Click the "Create API Key" button (top right)
   - A dialog will appear

4. **Name Your Key:**
   - Name: `chst-chatbot` (or any name you prefer)
   - Description: (optional) "For CHST chatbot application"

5. **Copy the API Key:**
   - Click "Create Key"
   - **CRITICAL:** A popup shows your API key
   - **Copy it immediately!** You won't be able to see it again
   - Save it in a safe place (you'll paste it in `.env.local` later)
   - The key looks like: `pcsk_abc123_def456ghi789...`

6. **Confirm:**
   - Check the box "I have saved my API key"
   - Click "Close"

### Step 3: Create Index (Vector Database)

**Detailed Steps:**

1. **Navigate to Indexes:**
   - Click "Indexes" in the left sidebar
   - You'll see "Create your first index" if you're new

2. **Click "Create Index"**

3. **Configure Index Settings:**

   **Index Name:**
   - Enter: `chst-documents`
   - **Must be exactly this name** (lowercase, with hyphen)

   **Dimensions:**
   - Enter: `1536`
   - This matches OpenAI's text-embedding-ada-002 model
   - **Must be exactly 1536**

   **Metric:**
   - Select: `cosine`
   - This measures similarity between vectors

   **Cloud Provider:**
   - Select: `AWS` (recommended)
   - Or choose `GCP` or `Azure` if preferred

   **Region:**
   - Select: `us-east-1` (recommended for most users)
   - Or choose region closest to you:
     - Asia: `ap-southeast-1` (Singapore)
     - Europe: `eu-west-1` (Ireland)
     - US West: `us-west-2` (Oregon)

   **Pod Type:**
   - Select: `Starter` (Free tier)
   - This gives you 1 pod with 100K vectors (sufficient for ~200-300 documents)

4. **Create Index:**
   - Click "Create Index" button
   - Wait 1-2 minutes for index to initialize
   - Status will change from "Initializing" to "Ready"

### Step 4: Get Your Environment/Host

**After index is created:**

1. **Click on your index name** (`chst-documents`)
2. **You'll see the index details page**
3. **Find the "Host" or "Environment":**
   - Look for a section showing connection details
   - You'll see something like:
     - **Host:** `chst-documents-abc123.svc.us-east-1-aws.pinecone.io`
     - **Environment:** `us-east-1-aws`

4. **What you need for `.env.local`:**
   - **PINECONE_ENVIRONMENT:** The environment part (e.g., `us-east-1-aws`)
   - This is the region + cloud provider

### Step 5: Verify Your Credentials

**You should now have:**

✅ **API Key:** `pcsk_abc123...` (from Step 2)  
✅ **Environment:** `us-east-1-aws` (from Step 4)  
✅ **Index Name:** `chst-documents` (from Step 3)

**Keep these safe - you'll need them in Part 4!**

### Troubleshooting Pinecone

**Can't find API Key after creating?**
- You can create a new one - go to API Keys → Create API Key
- Delete the old one if needed

**Index creation failed?**
- Check you're on free tier (Starter pod)
- Verify dimensions = 1536 exactly
- Try a different region

**What if I chose wrong region?**
- You can delete the index and create a new one
- Or keep it - region doesn't affect functionality much

**Free tier limits:**
- 1 index
- 100K vectors (~200-300 documents)
- 1 pod
- Sufficient for testing and small deployments

---

## Part 3: OpenAI API Key

### Step 1: Create OpenAI Account
1. Visit: https://platform.openai.com
2. Sign up or log in
3. Add payment method (required for API access)

### Step 2: Create API Key
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name: `chst-chatbot`
4. Click "Create secret key"
5. **IMPORTANT:** Copy the key immediately (starts with `sk-`)

### Step 3: Add Credits (if needed)
- Go to "Billing" → "Add payment method"
- Add at least $5 credit
- Set usage limits to avoid unexpected charges

---

## Part 4: Configure Environment Variables

### Step 1: Create .env.local File

In your project directory (`chst-chatbot-v1`), create a file named `.env.local`:

**Using VS Code:**
1. Right-click in the file explorer
2. Select "New File"
3. Name it: `.env.local`

**Using PowerShell:**
```powershell
cd C:\Users\ychum\.gemini\antigravity\scratch\chst-chatbot-v1
New-Item -Path .env.local -ItemType File
```

### Step 2: Add Your Credentials

Open `.env.local` and paste the following, replacing with your actual values:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/chst_chatbot"

# NextAuth (Authentication)
NEXTAUTH_SECRET="GENERATE_THIS_BELOW"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sk-your-actual-openai-api-key-here"

# Pinecone (Vector Database)
PINECONE_API_KEY="your-actual-pinecone-api-key-here"
PINECONE_ENVIRONMENT="us-east-1-aws"
PINECONE_INDEX_NAME="chst-documents"

# File Upload Settings
UPLOAD_DIR="./documents"
MAX_FILE_SIZE="10485760"

# Initial Chairperson Signup Code
INITIAL_CHAIRPERSON_CODE="CHST-ADMIN-2025"
```

### Step 3: Generate NEXTAUTH_SECRET

Open PowerShell and run:
```powershell
# Generate a random secret
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Copy the output and paste it as your `NEXTAUTH_SECRET` value.

**Alternative (if you have OpenSSL):**
```bash
openssl rand -base64 32
```

### Step 4: Verify Your .env.local

Your final `.env.local` should look like this (with real values):

```env
DATABASE_URL="postgresql://postgres:MySecurePass123@localhost:5432/chst_chatbot"
NEXTAUTH_SECRET="aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-proj-abc123xyz789..."
PINECONE_API_KEY="abc123-def456-ghi789..."
PINECONE_ENVIRONMENT="us-east-1-aws"
PINECONE_INDEX_NAME="chst-documents"
UPLOAD_DIR="./documents"
MAX_FILE_SIZE="10485760"
INITIAL_CHAIRPERSON_CODE="CHST-ADMIN-2025"
```

---

## Part 5: Initialize Database

### Step 1: Generate Prisma Client
```powershell
cd C:\Users\ychum\.gemini\antigravity\scratch\chst-chatbot-v1
npm run db:generate
```

### Step 2: Push Schema to Database
```powershell
npm run db:push
```

You should see:
```
✔ Generated Prisma Client
✔ Database synchronized
```

### Step 3: Create Initial Chairperson Signup Code

**Option A: Using Prisma Studio (Recommended)**
```powershell
npm run db:studio
```

This opens a web interface at `http://localhost:5555`

1. Click on "SignupCode" table
2. Click "Add record"
3. Fill in:
   - id: (leave blank, auto-generated)
   - code: `CHST-ADMIN-2025`
   - isUsed: `false`
   - usedBy: (leave blank)
   - createdAt: (leave blank, auto-generated)
   - usedAt: (leave blank)
   - expiresAt: (leave blank)
4. Click "Save 1 change"

**Option B: Using SQL**
```sql
INSERT INTO signup_codes (id, code, is_used, created_at)
VALUES (gen_random_uuid(), 'CHST-ADMIN-2025', false, NOW());
```

---

## Part 6: Test Your Setup

### Step 1: Start Development Server
```powershell
npm run dev
```

### Step 2: Open Browser
Visit: http://localhost:3000

You should be redirected to the signin page!

### Step 3: Create Chairperson Account
1. Click "Sign up"
2. Fill in your details
3. Use email: `your.email@utar.edu.my` (or any domain)
4. Click "+ I have a chairperson code"
5. Enter: `CHST-ADMIN-2025`
6. Complete signup

---

## Troubleshooting

### PostgreSQL Connection Issues

**Error: "password authentication failed"**
- Check your password in `.env.local`
- Verify PostgreSQL is running (check Services in Windows)

**Error: "database does not exist"**
- Create the database using pgAdmin or command line
- Run: `CREATE DATABASE chst_chatbot;`

**Error: "could not connect to server"**
- Verify PostgreSQL is running
- Check port 5432 is not blocked by firewall

### Pinecone Issues

**Error: "Invalid API key"**
- Verify you copied the full API key
- Check for extra spaces in `.env.local`

**Error: "Index not found"**
- Verify index name matches exactly: `chst-documents`
- Check index is created in Pinecone dashboard

### OpenAI Issues

**Error: "Invalid API key"**
- Verify key starts with `sk-`
- Check you have billing set up
- Verify key is active in OpenAI dashboard

---

## Next Steps

Once setup is complete:
1. ✅ PostgreSQL installed and database created
2. ✅ Pinecone account and index created
3. ✅ OpenAI API key obtained
4. ✅ `.env.local` configured
5. ✅ Database initialized
6. ✅ Initial chairperson code created

**You're ready to continue development!**

The next phase will build:
- RAG pipeline for document processing
- Chat interface
- Document management
- Admin dashboard

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env.local` to Git (it's in `.gitignore`)
- Keep your API keys secret
- Don't share your database password
- Rotate API keys periodically
- Set usage limits on OpenAI to avoid unexpected charges

---

## Cost Estimates

**Free Tier Limits:**
- **Pinecone:** 1 index, 100K vectors (sufficient for ~200-300 documents)
- **OpenAI:** Pay-as-you-go (~$0.0001 per 1K tokens for embeddings, ~$0.03 per 1K tokens for GPT-4)
- **PostgreSQL (local):** Free
- **Supabase/Neon:** 500MB free database

**Estimated Monthly Cost (light usage):**
- Embeddings: ~$1-2 (for 50-100 documents)
- GPT-4 queries: ~$5-10 (for 100-200 queries)
- **Total:** ~$6-12/month

---

**Need help? Check the troubleshooting section or ask for assistance!**
