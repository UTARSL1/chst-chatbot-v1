# Step-by-Step Setup: Supabase + Local App

## ✅ What You'll Achieve
- Cloud database (always available)
- Test locally on your laptop
- Easy to deploy to production later

---

## 📋 Prerequisites
- ✅ Project already created (chst-chatbot-v1)
- ✅ Dependencies installed (512 packages)
- ⏳ Need: Supabase account, Pinecone account, OpenAI API key

---

## Step 1: Create Supabase Account & Database (15 minutes)

### 1.1 Sign Up for Supabase

1. **Open browser and visit:** https://supabase.com

2. **Click "Start your project"** (green button, top right)

3. **Sign up:**
   - Choose "Continue with GitHub" (recommended - faster)
   - OR "Continue with Google"
   - Authorize Supabase to access your account

4. **You'll be redirected to Supabase Dashboard**

### 1.2 Create Your Project

1. **Click "New Project"** (or "Create a new project")

2. **Fill in project details:**
   - **Organization:** 
     - If first time: Click "Create a new organization"
     - Name it: `CHST` or `Personal`
     - Click "Create organization"
   
   - **Project Name:** `chst-chatbot`
   
   - **Database Password:** 
     - Click "Generate a password" (recommended)
     - **CRITICAL:** Copy and save this password immediately!
     - Or create your own strong password
     - Example: `MySupabasePass123!`
   
   - **Region:** 
     - Select: **Southeast Asia (Singapore)** (closest to Malaysia)
     - Or choose another region if preferred
   
   - **Pricing Plan:** 
     - Select: **Free** (default)
     - Includes: 500MB database, 2GB bandwidth

3. **Click "Create new project"**

4. **Wait for provisioning:**
   - Takes about 2 minutes
   - You'll see "Setting up project..." with progress bar
   - Don't close the browser!

5. **Project is ready when you see the dashboard**

### 1.3 Get Your Database Connection String

1. **In Supabase Dashboard, click the "Connect" button** (top right)
   - OR go to: Project Settings (gear icon) → Database

2. **Find "Connection string" section**

3. **Select the "URI" tab** (not "Transaction pooler")

4. **You'll see something like:**
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

5. **Copy this connection string**

6. **Replace `[YOUR-PASSWORD]` with your actual password**
   - The password you saved in step 1.2
   - Example result:
   ```
   postgresql://postgres.abcdefgh:MySupabasePass123!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

7. **Save this complete connection string** - you'll need it soon!

---

## Step 2: Create Pinecone Account & Index (10 minutes)

### 2.1 Sign Up for Pinecone

1. **Visit:** https://www.pinecone.io

2. **Click "Sign Up Free"**

3. **Sign up with Google** (recommended) or email

4. **Verify email if needed**

5. **You'll see the Pinecone Console**

### 2.2 Create API Key

1. **Click "API Keys"** in left sidebar

2. **Click "Create API Key"** button

3. **Name:** `chst-chatbot`

4. **Click "Create Key"**

5. **CRITICAL: Copy the API key immediately!**
   - Looks like: `pcsk-abc123-def456...`
   - You won't see it again!
   - Save it somewhere safe

6. **Click "I have saved my API key"** and close

### 2.3 Create Index

1. **Click "Indexes"** in left sidebar

2. **Click "Create Index"**

3. **Fill in settings:**
   - **Name:** `chst-documents` (exactly this!)
   - **Dimensions:** `1536` (exactly this!)
   - **Metric:** `cosine`
   - **Cloud:** `AWS`
   - **Region:** `us-east-1` (or `ap-southeast-1` for Asia)
   - **Pod Type:** `Starter` (Free)

4. **Click "Create Index"**

5. **Wait 1-2 minutes** for index to initialize

6. **When ready, click on the index name** to see details

7. **Note the Environment:**
   - Look for "Host" or "Environment"
   - Example: `us-east-1-aws` or `ap-southeast-1-aws`
   - Save this!

---

## Step 3: Get OpenAI API Key (5 minutes)

### 3.1 Create OpenAI Account

1. **Visit:** https://platform.openai.com

2. **Sign up or log in**

3. **Add payment method:**
   - Go to: Settings → Billing
   - Click "Add payment method"
   - Add credit card
   - Add at least $5 credit

### 3.2 Create API Key

1. **Go to:** https://platform.openai.com/api-keys

2. **Click "Create new secret key"**

3. **Name:** `chst-chatbot`

4. **Click "Create secret key"**

5. **CRITICAL: Copy the key immediately!**
   - Starts with `sk-`
   - Example: `sk-proj-abc123xyz789...`
   - You won't see it again!

6. **Click "Done"**

---

## Step 4: Configure Environment Variables (5 minutes)

### 4.1 Create .env.local File

1. **Open your project in VS Code:**
   ```powershell
   cd C:\Users\ychum\.gemini\antigravity\scratch\chst-chatbot-v1
   code .
   ```

2. **Create new file:** `.env.local` (in project root)

3. **Paste this template:**
   ```env
   # Database (Supabase)
   DATABASE_URL="PASTE_YOUR_SUPABASE_CONNECTION_STRING_HERE"

   # NextAuth
   NEXTAUTH_SECRET="PASTE_GENERATED_SECRET_HERE"
   NEXTAUTH_URL="http://localhost:3000"

   # OpenAI
   OPENAI_API_KEY="PASTE_YOUR_OPENAI_KEY_HERE"

   # Pinecone
   PINECONE_API_KEY="PASTE_YOUR_PINECONE_KEY_HERE"
   PINECONE_ENVIRONMENT="us-east-1-aws"
   PINECONE_INDEX_NAME="chst-documents"

   # File Upload
   UPLOAD_DIR="./documents"
   MAX_FILE_SIZE="10485760"

   # Initial Chairperson Code
   INITIAL_CHAIRPERSON_CODE="CHST-ADMIN-2025"
   ```

### 4.2 Fill in Your Credentials

**Replace each placeholder:**

1. **DATABASE_URL:**
   - Paste your Supabase connection string from Step 1.3
   - Make sure password is included!

2. **NEXTAUTH_SECRET:**
   - Generate a random secret:
   ```powershell
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
   ```
   - Copy the output and paste it

3. **OPENAI_API_KEY:**
   - Paste your OpenAI key from Step 3.2
   - Should start with `sk-`

4. **PINECONE_API_KEY:**
   - Paste your Pinecone key from Step 2.2
   - Should start with `pcsk-`

5. **PINECONE_ENVIRONMENT:**
   - Use the environment from Step 2.3
   - Example: `us-east-1-aws` or `ap-southeast-1-aws`

### 4.3 Verify Your .env.local

**Your final file should look like:**
```env
DATABASE_URL="postgresql://postgres.abcdefgh:MyPass123!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
NEXTAUTH_SECRET="aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-proj-abc123xyz789..."
PINECONE_API_KEY="pcsk-abc123-def456..."
PINECONE_ENVIRONMENT="us-east-1-aws"
PINECONE_INDEX_NAME="chst-documents"
UPLOAD_DIR="./documents"
MAX_FILE_SIZE="10485760"
INITIAL_CHAIRPERSON_CODE="CHST-ADMIN-2025"
```

**Save the file!**

---

## Step 5: Initialize Database (5 minutes)

### 5.1 Generate Prisma Client

```powershell
cd C:\Users\ychum\.gemini\antigravity\scratch\chst-chatbot-v1
npm run db:generate
```

**Expected output:**
```
✔ Generated Prisma Client
```

### 5.2 Push Schema to Supabase

```powershell
npm run db:push
```

**Expected output:**
```
✔ Database synchronized
Your database is now in sync with your Prisma schema.
```

**What this does:**
- Creates all tables in your Supabase database
- Sets up: users, chat_sessions, messages, documents, signup_codes

### 5.3 Create Initial Chairperson Code

```powershell
npm run db:studio
```

**This opens Prisma Studio at:** http://localhost:5555

**In Prisma Studio:**
1. Click **"SignupCode"** table (left sidebar)
2. Click **"Add record"** button
3. Fill in:
   - **id:** (leave blank - auto-generated)
   - **code:** `CHST-ADMIN-2025`
   - **isUsed:** `false` (uncheck the box)
   - **usedBy:** (leave blank)
   - **createdAt:** (leave blank - auto-generated)
   - **usedAt:** (leave blank)
   - **expiresAt:** (leave blank)
4. Click **"Save 1 change"** (bottom right)
5. You should see the record appear!
6. **Close Prisma Studio** (close browser tab)

---

## Step 6: Start the Application (2 minutes)

### 6.1 Start Development Server

```powershell
npm run dev
```

**Expected output:**
```
▲ Next.js 15.1.3
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 2.5s
```

### 6.2 Open in Browser

1. **Open browser**
2. **Go to:** http://localhost:3000
3. **You should be redirected to:** http://localhost:3000/auth/signin

**If you see the signin page - SUCCESS! 🎉**

---

## Step 7: Create Your Chairperson Account (3 minutes)

### 7.1 Sign Up

1. **Click "Sign up"** link

2. **Fill in the form:**
   - **Name:** Your Name
   - **Email:** your.email@utar.edu.my (or any email)
   - **Password:** Choose a strong password
   - **Confirm Password:** Same password

3. **Click "+ I have a chairperson code"**

4. **Enter code:** `CHST-ADMIN-2025`

5. **Click "Sign Up"**

6. **You should see:** Success message

7. **You'll be redirected to signin page**

### 7.2 Sign In

1. **Enter your email and password**

2. **Click "Sign In"**

3. **You should be redirected to:** http://localhost:3000/chat

4. **You should see:**
   - Chat interface
   - Your name in top right
   - "Chairperson" badge
   - Sample questions

**If you see the chat page - COMPLETE SUCCESS! 🎉🎉🎉**

---

## Step 8: Test the Chat (2 minutes)

### 8.1 Try a Question

1. **In the message box, type:**
   ```
   How to apply for sabbatical leave?
   ```

2. **Click "Send"**

3. **You should see:**
   - Loading animation (3 dots)
   - Response appears
   - Response will say "couldn't find any relevant information"
   - **This is normal!** No documents uploaded yet

### 8.2 Verify It's Working

**If you got a response (even saying no info found), everything is working!**

The RAG pipeline is:
- ✅ Connecting to Supabase database
- ✅ Connecting to OpenAI
- ✅ Connecting to Pinecone
- ✅ Processing your question
- ✅ Generating responses

---

## ✅ Setup Complete!

### What You Have Now:

✅ **Supabase Database** - Running in cloud (always available)  
✅ **Pinecone Vector DB** - Ready for documents  
✅ **OpenAI Integration** - AI responses working  
✅ **Chat Interface** - Fully functional  
✅ **Authentication** - Working with chairperson account  
✅ **Local App** - Running on your laptop  

### What's Next:

1. **Upload Documents** (when admin dashboard is built)
2. **Test with Real Questions**
3. **Create More User Accounts** (students, staff)
4. **Deploy to Production** (when ready)

---

## 🎯 Current Status

**Your app is:**
- ✅ Running locally at http://localhost:3000
- ✅ Connected to cloud database (Supabase)
- ✅ Ready for testing
- ⏸️ Only accessible on your laptop (for now)

**To make it accessible to others:**
- Later: Deploy to Vercel (covered in DEPLOYMENT_OPTIONS.md)

---

## 🐛 Troubleshooting

### Issue: "Database connection failed"
**Check:**
- Is DATABASE_URL correct in `.env.local`?
- Did you include the password?
- Is Supabase project running? (check dashboard)

### Issue: "Invalid API key" (OpenAI)
**Check:**
- Does key start with `sk-`?
- Did you add billing in OpenAI?
- Is key active? (check OpenAI dashboard)

### Issue: "Pinecone error"
**Check:**
- Is index name exactly `chst-documents`?
- Is environment correct? (e.g., `us-east-1-aws`)
- Is index ready? (check Pinecone dashboard)

### Issue: "Port 3000 already in use"
**Solution:**
```powershell
# Use different port
npm run dev -- -p 3001
```

---

## 📞 Need Help?

**If stuck:**
1. Check error messages in terminal
2. Check browser console (F12)
3. Verify all credentials in `.env.local`
4. Restart development server

**Everything working?**
- ✅ Proceed to upload documents (when admin UI is ready)
- ✅ Or test with more accounts
- ✅ Or ask me to continue building admin dashboard!

---

**Congratulations! Your CHST-Chatbot is now running! 🚀**
