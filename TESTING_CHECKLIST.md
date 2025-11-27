# CHST-Chatbot V1 - Testing Checklist

## Pre-Testing Setup

### ☐ Step 1: Install PostgreSQL
**Choose one option:**

**Option A: Local Installation (Recommended)**
1. Download from: https://www.postgresql.org/download/windows/
2. Install with default settings
3. **Remember your password!**
4. Create database:
   ```powershell
   # Open PowerShell
   psql -U postgres
   # Enter password, then:
   CREATE DATABASE chst_chatbot;
   \q
   ```

**Option B: Cloud Database (Easier)**
1. Go to https://supabase.com
2. Sign up and create project: `chst-chatbot`
3. Copy connection string from Settings → Database

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### ☐ Step 2: Create Pinecone Account
1. Visit: https://www.pinecone.io
2. Sign up (free account)
3. Create API Key (copy it immediately!)
4. Create Index:
   - Name: `chst-documents`
   - Dimensions: `1536`
   - Metric: `cosine`
   - Region: Any (suggest us-east-1)

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### ☐ Step 3: Get OpenAI API Key
1. Visit: https://platform.openai.com/api-keys
2. Create new secret key
3. Copy it (starts with `sk-`)
4. Add billing: https://platform.openai.com/account/billing
5. Add at least $5 credit

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### ☐ Step 4: Configure Environment Variables

Create `.env.local` file in project root:

```env
# Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/chst_chatbot"

# NextAuth
NEXTAUTH_SECRET="PASTE_GENERATED_SECRET_HERE"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sk-PASTE_YOUR_KEY_HERE"

# Pinecone
PINECONE_API_KEY="PASTE_YOUR_KEY_HERE"
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

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### ☐ Step 5: Initialize Database

```powershell
cd C:\Users\ychum\.gemini\antigravity\scratch\chst-chatbot-v1

# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

**Expected Output:**
```
✔ Generated Prisma Client
✔ Database synchronized
```

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### ☐ Step 6: Create Initial Chairperson Code

**Option A: Prisma Studio (Recommended)**
```powershell
npm run db:studio
```
1. Opens at http://localhost:5555
2. Click "SignupCode" table
3. Click "Add record"
4. Fill: code = `CHST-ADMIN-2025`, isUsed = `false`
5. Save

**Option B: Direct SQL**
```sql
INSERT INTO signup_codes (id, code, is_used, created_at)
VALUES (gen_random_uuid(), 'CHST-ADMIN-2025', false, NOW());
```

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

## Testing Phase

### ☐ Test 1: Start Development Server

```powershell
npm run dev
```

**Expected:**
- Server starts at http://localhost:3000
- No errors in console

**Status:** ☐ Pass | ☐ Fail | ☐ Not Tested

**Issues encountered:**
```
[Write any errors here]
```

---

### ☐ Test 2: Sign Up (Chairperson)

1. Visit http://localhost:3000
2. Should redirect to `/auth/signin`
3. Click "Sign up"
4. Fill in:
   - Name: `Test Admin`
   - Email: `admin@test.com`
   - Password: `Test1234!`
   - Confirm Password: `Test1234!`
5. Click "+ I have a chairperson code"
6. Enter: `CHST-ADMIN-2025`
7. Click "Sign Up"

**Expected:**
- Success message appears
- Redirects to signin page

**Status:** ☐ Pass | ☐ Fail | ☐ Not Tested

**Issues encountered:**
```
[Write any errors here]
```

---

### ☐ Test 3: Sign In (Chairperson)

1. On signin page
2. Enter:
   - Email: `admin@test.com`
   - Password: `Test1234!`
3. Click "Sign In"

**Expected:**
- Redirects to `/chat`
- Shows chat interface
- Role badge shows "Chairperson"

**Status:** ☐ Pass | ☐ Fail | ☐ Not Tested

**Issues encountered:**
```
[Write any errors here]
```

---

### ☐ Test 4: Chat Interface (No Documents)

1. On chat page
2. Try asking: "How to apply for sabbatical leave?"
3. Wait for response

**Expected:**
- Loading animation appears
- Response says "couldn't find any relevant information"
- This is normal - no documents uploaded yet!

**Status:** ☐ Pass | ☐ Fail | ☐ Not Tested

**Issues encountered:**
```
[Write any errors here]
```

---

### ☐ Test 5: Sign Up (Staff Member)

1. Sign out
2. Go to signup
3. Fill in:
   - Name: `Test Staff`
   - Email: `staff@utar.edu.my`
   - Password: `Test1234!`
   - Confirm Password: `Test1234!`
4. Click "Sign Up"

**Expected:**
- Auto-detects role as "Staff" (Member)
- Success message
- No chairperson code needed

**Status:** ☐ Pass | ☐ Fail | ☐ Not Tested

**Issues encountered:**
```
[Write any errors here]
```

---

### ☐ Test 6: Sign Up (Student)

1. Sign out
2. Go to signup
3. Fill in:
   - Name: `Test Student`
   - Email: `student@1utar.my`
   - Password: `Test1234!`
   - Confirm Password: `Test1234!`
4. Click "Sign Up"

**Expected:**
- Auto-detects role as "Student"
- Success message
- No chairperson code needed

**Status:** ☐ Pass | ☐ Fail | ☐ Not Tested

**Issues encountered:**
```
[Write any errors here]
```

---

### ☐ Test 7: Upload Document (API Test)

Since admin UI isn't built yet, test via API:

**Create a test PDF first** (or use any existing PDF)

```powershell
# Using PowerShell (if you have curl)
$headers = @{
    "Cookie" = "YOUR_SESSION_COOKIE"
}

$form = @{
    file = Get-Item -Path "C:\path\to\your\test.pdf"
    accessLevel = "student"
}

Invoke-WebRequest -Uri "http://localhost:3000/api/documents" -Method POST -Form $form -Headers $headers
```

**OR manually place PDF:**
1. Create a test PDF with some text
2. Copy to: `C:\Users\ychum\.gemini\antigravity\scratch\chst-chatbot-v1\documents\student\test.pdf`

**Expected:**
- Document uploaded successfully
- Processing starts in background

**Status:** ☐ Pass | ☐ Fail | ☐ Not Tested | ☐ Skipped

**Issues encountered:**
```
[Write any errors here]
```

---

### ☐ Test 8: Chat with Document (After Upload)

1. Sign in as any user
2. Ask a question related to the uploaded PDF content
3. Wait for response

**Expected:**
- Response includes information from the PDF
- Sources section shows the document name

**Status:** ☐ Pass | ☐ Fail | ☐ Not Tested | ☐ Skipped

**Issues encountered:**
```
[Write any errors here]
```

---

### ☐ Test 9: Chat History

1. Ask multiple questions
2. Check sidebar for chat history
3. Click on a previous chat

**Expected:**
- Previous conversations appear in sidebar
- Clicking loads that conversation

**Status:** ☐ Pass | ☐ Fail | ☐ Not Tested

**Issues encountered:**
```
[Write any errors here]
```

---

### ☐ Test 10: New Chat

1. Click "New Chat" button
2. Ask a new question

**Expected:**
- Clears current conversation
- Starts fresh chat session

**Status:** ☐ Pass | ☐ Fail | ☐ Not Tested

**Issues encountered:**
```
[Write any errors here]
```

---

## Common Issues & Solutions

### Issue: "Database connection failed"
**Solution:**
- Check PostgreSQL is running
- Verify DATABASE_URL in `.env.local`
- Test: `psql -U postgres -d chst_chatbot`

### Issue: "Invalid API key" (OpenAI)
**Solution:**
- Verify key starts with `sk-`
- Check billing is set up
- Ensure key is active

### Issue: "Pinecone error"
**Solution:**
- Verify index name is exactly `chst-documents`
- Check API key is correct
- Ensure index dimensions = 1536

### Issue: "Module not found"
**Solution:**
```powershell
npm install
```

### Issue: "Port 3000 already in use"
**Solution:**
```powershell
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3001
```

---

## Test Results Summary

**Date Tested:** ___________

**Tester:** ___________

**Overall Status:** ☐ All Pass | ☐ Some Failures | ☐ Major Issues

**Tests Passed:** ___ / 10

**Critical Issues:**
```
[List any blocking issues]
```

**Minor Issues:**
```
[List any non-blocking issues]
```

**Notes:**
```
[Any additional observations]
```

---

## Next Steps After Testing

### If All Tests Pass ✅
- [ ] Upload real policy documents
- [ ] Create accounts for actual users
- [ ] Proceed with admin dashboard development

### If Some Tests Fail ⚠️
- [ ] Document all errors
- [ ] Share error messages for debugging
- [ ] Fix issues before proceeding

### If Major Issues ❌
- [ ] Stop testing
- [ ] Gather all error logs
- [ ] Request assistance for debugging

---

**Ready to start? Begin with Step 1!**
