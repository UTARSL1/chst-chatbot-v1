# 🚀 CHST Chatbot - Vercel Deployment Guide

**Complete step-by-step guide to deploy your chatbot to production**

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- [ ] Your chatbot working locally (`npm run dev`)
- [ ] GitHub account
- [ ] Git installed on your computer
- [ ] All API keys ready:
  - [ ] OpenAI API key
  - [ ] Pinecone API key and index name
- [ ] Email address for Vercel and Supabase signup

**Estimated Time:** 45-60 minutes

---

## 🎯 Deployment Overview

We'll deploy in 3 main phases:

1. **Phase 1:** Set up Supabase (Cloud Database) - 20 mins
2. **Phase 2:** Push code to GitHub - 10 mins
3. **Phase 3:** Deploy to Vercel - 15 mins

---

# Phase 1: Supabase Setup (Cloud Database)

## Step 1.1: Create Supabase Account

1. **Visit:** https://supabase.com
2. **Click:** "Start your project"
3. **Sign up with GitHub** (recommended) or email
4. **Verify your email** if prompted

## Step 1.2: Create New Project

1. **Click:** "New Project"
2. **Fill in details:**
   - **Name:** `chst-chatbot` (or your preferred name)
   - **Database Password:** Create a strong password (SAVE THIS!)
   - **Region:** Choose closest to Malaysia (e.g., `Southeast Asia (Singapore)`)
   - **Pricing Plan:** Free

3. **Click:** "Create new project"
4. **Wait:** 2-3 minutes for project to initialize

## Step 1.3: Get Database Connection String

1. **In Supabase Dashboard:**
   - Click **Settings** (gear icon in left sidebar)
   - Click **Database**
   - Scroll to **Connection string** section

2. **Copy the connection string:**
   - Select **URI** tab
   - Copy the connection string (looks like this):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```

3. **Replace `[YOUR-PASSWORD]`** with the database password you created in Step 1.2

4. **Save this connection string** - you'll need it later!

## Step 1.4: Set Up Database Schema

1. **In Supabase Dashboard:**
   - Click **SQL Editor** in left sidebar
   - Click **New query**

2. **Copy and paste this SQL:**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'PUBLIC',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ChatMessage table
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "userId" TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Document table
CREATE TABLE IF NOT EXISTS "Document" (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    filename TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessLevel" TEXT NOT NULL DEFAULT 'STUDENT',
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,
    FOREIGN KEY ("uploadedBy") REFERENCES "User"(id) ON DELETE CASCADE
);

-- SignupCode table
CREATE TABLE IF NOT EXISTS "SignupCode" (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    code TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    FOREIGN KEY ("usedBy") REFERENCES "User"(id) ON DELETE SET NULL,
    FOREIGN KEY ("createdBy") REFERENCES "User"(id) ON DELETE CASCADE
);

-- SystemPrompt table
CREATE TABLE IF NOT EXISTS "SystemPrompt" (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    prompt TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("createdBy") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "ChatMessage_userId_idx" ON "ChatMessage"("userId");
CREATE INDEX IF NOT EXISTS "Document_uploadedBy_idx" ON "Document"("uploadedBy");
CREATE INDEX IF NOT EXISTS "SignupCode_code_idx" ON "SignupCode"("code");
```

3. **Click:** "Run" (or press F5)
4. **Verify:** You should see "Success. No rows returned"

## Step 1.5: Create Initial Chairperson Account

You need at least one chairperson account to manage the system.

1. **Still in SQL Editor, run this query:**

```sql
-- Create initial chairperson account
-- Password: Admin@2025 (change this after first login!)
INSERT INTO "User" (id, email, password, name, role, "isApproved", "createdAt", "updatedAt")
VALUES (
    uuid_generate_v4()::TEXT,
    'admin@utar.edu.my',
    '$2a$10$YourHashedPasswordHere',
    'CHST Admin',
    'CHAIRPERSON',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
```

> **Note:** You'll need to hash the password first. We'll do this after deployment using your app's signup page.

**Alternative:** Skip this for now and create the first chairperson account through your deployed app's signup page with a special code.

✅ **Supabase setup complete!**

---

# Phase 2: Push Code to GitHub

## Step 2.1: Initialize Git Repository (if not already done)

1. **Open PowerShell** in your project directory:
```powershell
cd C:\Users\ychum\.gemini\antigravity\scratch\chst-chatbot-v1
```

2. **Check if Git is initialized:**
```powershell
git status
```

**If you see "not a git repository":**
```powershell
git init
git add .
git commit -m "Initial commit - CHST Chatbot V1"
```

**If Git is already initialized:**
```powershell
git add .
git commit -m "Prepare for Vercel deployment"
```

## Step 2.2: Create GitHub Repository

1. **Visit:** https://github.com
2. **Sign in** to your GitHub account
3. **Click:** "+" icon (top right) → "New repository"
4. **Fill in details:**
   - **Repository name:** `chst-chatbot-v1`
   - **Description:** "AI-powered chatbot for CHST research centre"
   - **Visibility:** Private (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license
5. **Click:** "Create repository"

## Step 2.3: Push Code to GitHub

1. **Copy the commands** GitHub shows you (should look like this):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/chst-chatbot-v1.git
git branch -M main
git push -u origin main
```

2. **Run these commands** in PowerShell (in your project directory)

3. **Enter GitHub credentials** if prompted

4. **Verify:** Refresh your GitHub repository page - you should see all your files!

✅ **Code is now on GitHub!**

---

# Phase 3: Deploy to Vercel

## Step 3.1: Create Vercel Account

1. **Visit:** https://vercel.com
2. **Click:** "Sign Up"
3. **Choose:** "Continue with GitHub" (recommended)
4. **Authorize Vercel** to access your GitHub account
5. **Complete signup** process

## Step 3.2: Import Your Project

1. **In Vercel Dashboard:**
   - Click **"Add New..."** → **"Project"**

2. **Import Git Repository:**
   - Find `chst-chatbot-v1` in the list
   - Click **"Import"**

3. **Configure Project:**
   - **Project Name:** `chst-chatbot-v1` (or customize)
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `npm run build` (auto-filled)
   - **Output Directory:** `.next` (auto-filled)

4. **DO NOT DEPLOY YET!** - We need to add environment variables first

## Step 3.3: Add Environment Variables

**This is the most important step!**

1. **In the import screen, scroll down to "Environment Variables"**

2. **Add each variable one by one:**

Click **"Add"** for each of these:

### Database
```
Name: DATABASE_URL
Value: [Your Supabase connection string from Phase 1, Step 1.3]
```

### NextAuth
```
Name: NEXTAUTH_SECRET
Value: [Generate a random secret - see below]
```

**To generate NEXTAUTH_SECRET:**
- **Windows PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```
- Or use: https://generate-secret.vercel.app/32

```
Name: NEXTAUTH_URL
Value: https://chst-chatbot-v1.vercel.app
```
> **Note:** Replace `chst-chatbot-v1` with your actual Vercel project name

### OpenAI
```
Name: OPENAI_API_KEY
Value: sk-your-openai-api-key-here
```

### Pinecone
```
Name: PINECONE_API_KEY
Value: your-pinecone-api-key
```

```
Name: PINECONE_ENVIRONMENT
Value: your-pinecone-environment (e.g., us-east-1-aws)
```

```
Name: PINECONE_INDEX_NAME
Value: chst-documents
```

### File Upload (Optional)
```
Name: MAX_FILE_SIZE
Value: 10485760
```

```
Name: INITIAL_CHAIRPERSON_CODE
Value: CHST-ADMIN-2025
```

3. **Double-check all variables** are correct!

## Step 3.4: Deploy!

1. **Click:** "Deploy"

2. **Wait:** 2-5 minutes for deployment to complete

3. **Watch the build logs** - you'll see:
   - Installing dependencies
   - Building Next.js app
   - Generating Prisma client
   - Deploying to Vercel's edge network

4. **Success!** 🎉 You'll see:
   - "Congratulations!"
   - Your deployment URL: `https://chst-chatbot-v1.vercel.app`

## Step 3.5: Initialize Database Schema

**Important:** Prisma needs to sync the schema with your Supabase database.

1. **In Vercel Dashboard:**
   - Go to your project
   - Click **"Settings"** tab
   - Click **"Functions"** in left sidebar

2. **We need to run Prisma migration:**

**Option A: Use Vercel CLI (Recommended)**

Install Vercel CLI:
```powershell
npm install -g vercel
```

Login and link project:
```powershell
vercel login
vercel link
```

Run database push:
```powershell
vercel env pull .env.production
npx prisma db push
```

**Option B: Manual via Supabase (Already done in Phase 1.4)**

If you already ran the SQL in Phase 1.4, your schema is ready!

✅ **Deployment complete!**

---

# 🎉 Post-Deployment Steps

## Step 4.1: Verify Deployment

1. **Visit your URL:** `https://chst-chatbot-v1.vercel.app`

2. **Check these pages:**
   - [ ] Homepage loads
   - [ ] `/auth/signin` - Sign in page works
   - [ ] `/auth/signup` - Signup page works

## Step 4.2: Create First Chairperson Account

1. **Go to:** `https://chst-chatbot-v1.vercel.app/auth/signup`

2. **Fill in:**
   - Email: `your-email@utar.edu.my`
   - Password: Strong password
   - Name: Your name
   - Role: Chairperson
   - Signup Code: `CHST-ADMIN-2025` (or the code you set)

3. **Sign up** and verify you can log in

## Step 4.3: Test Core Features

- [ ] Sign in with chairperson account
- [ ] Upload a test PDF document
- [ ] Ask a question in the chat
- [ ] Verify RAG responses work
- [ ] Check admin dashboard (if implemented)

## Step 4.4: Update NEXTAUTH_URL (If Needed)

If your Vercel URL is different from what you set:

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. **Edit** `NEXTAUTH_URL`
3. **Update** to your actual Vercel URL
4. **Redeploy:** Go to **Deployments** → Click **"..."** on latest → **"Redeploy"**

---

# 🔧 Troubleshooting

## Issue: "Database connection failed"

**Solution:**
1. Check `DATABASE_URL` in Vercel environment variables
2. Ensure Supabase project is active
3. Verify connection string has correct password
4. Check Supabase database is in same region

## Issue: "Prisma Client not generated"

**Solution:**
1. In Vercel Dashboard → Settings → General
2. Scroll to "Build & Development Settings"
3. Add to Build Command: `npx prisma generate && npm run build`
4. Redeploy

## Issue: "NextAuth error"

**Solution:**
1. Verify `NEXTAUTH_URL` matches your Vercel URL exactly
2. Check `NEXTAUTH_SECRET` is set
3. Ensure it's set for "Production" environment

## Issue: "OpenAI API error"

**Solution:**
1. Verify `OPENAI_API_KEY` is correct
2. Check OpenAI account has credits
3. Ensure API key has proper permissions

## Issue: "Pinecone connection failed"

**Solution:**
1. Verify `PINECONE_API_KEY` is correct
2. Check `PINECONE_ENVIRONMENT` matches your Pinecone project
3. Ensure `PINECONE_INDEX_NAME` exists in Pinecone

## Issue: "File upload not working"

**Solution:**
Vercel has a 4.5MB body size limit for serverless functions. For larger files:
1. Consider using Vercel Blob Storage
2. Or implement direct upload to Supabase Storage
3. Update your upload logic accordingly

---

# 🌐 Adding Custom Domain (Future)

## Option 1: University Subdomain (Free)

1. **Contact UTAR IT Department**
2. **Request:** `chst-chatbot.utar.edu.my`
3. **They'll provide:** DNS configuration instructions
4. **In Vercel:**
   - Settings → Domains
   - Add domain: `chst-chatbot.utar.edu.my`
   - Follow DNS instructions
5. **Update** `NEXTAUTH_URL` to new domain

## Option 2: Custom Domain (Paid)

1. **Buy domain** from Namecheap/GoDaddy (~$10-15/year)
2. **In Vercel:**
   - Settings → Domains
   - Add your domain
   - Update DNS records as instructed
3. **Update** `NEXTAUTH_URL` to new domain

---

# 📊 Monitoring & Maintenance

## Vercel Dashboard Features

1. **Analytics:** Track page views and performance
2. **Logs:** View real-time application logs
3. **Deployments:** See deployment history
4. **Environment Variables:** Manage secrets

## Supabase Dashboard Features

1. **Database:** View and edit data
2. **SQL Editor:** Run queries
3. **Logs:** Monitor database activity
4. **Backups:** Automatic daily backups (paid plans)

## Regular Maintenance Tasks

- [ ] Monitor OpenAI API usage and costs
- [ ] Check Pinecone vector count
- [ ] Review Supabase database size
- [ ] Update dependencies monthly
- [ ] Review user feedback and errors

---

# 💰 Cost Breakdown

## Free Tier Limits

| Service | Free Tier | Upgrade Trigger |
|---------|-----------|-----------------|
| **Vercel** | 100GB bandwidth/month | High traffic sites |
| **Supabase** | 500MB database | More data storage |
| **Pinecone** | 100K vectors | More documents |
| **OpenAI** | Pay-per-use | Based on usage |

## Expected Monthly Costs (Small Scale)

- Vercel: **$0** (free tier sufficient)
- Supabase: **$0** (free tier sufficient)
- Pinecone: **$0** (free tier sufficient)
- OpenAI: **$10-30** (depends on chat volume)

**Total: ~$10-30/month** for small to medium usage

---

# 🎯 Next Steps

1. **Test thoroughly** on your Vercel deployment
2. **Share URL** with CHST team for feedback
3. **Upload course documents** via admin panel
4. **Monitor usage** and performance
5. **Request university subdomain** when ready for official launch

---

# 📞 Support

**Vercel Issues:**
- Documentation: https://vercel.com/docs
- Support: https://vercel.com/support

**Supabase Issues:**
- Documentation: https://supabase.com/docs
- Support: https://supabase.com/support

**Next.js Issues:**
- Documentation: https://nextjs.org/docs
- Community: https://github.com/vercel/next.js/discussions

---

**🎉 Congratulations! Your CHST Chatbot is now live on the cloud!**

Your deployment URL: `https://chst-chatbot-v1.vercel.app`

---

**Need help?** Review this guide step-by-step or check the troubleshooting section.
