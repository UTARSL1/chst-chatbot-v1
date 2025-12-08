# Database Connection Fix Required

## ⚠️ Issue Found

Your Supabase password contains a special character (`@`) that needs to be URL-encoded in the connection string.

## 🔧 How to Fix

### Step 1: Open `.env.local`

Click here: [.env.local](file:///C:/Users/ychum/.gemini/antigravity/scratch/chst-chatbot-v1/.env.local)

### Step 2: Find the DATABASE_URL Line

Look for:
```
DATABASE_URL="postgresql://postgres:Canaliculus@33@db.lquiwadjbfapejjmivfh.supabase.co:5432/postgres"
```

### Step 3: Replace with URL-Encoded Version

Change it to (replace `@` in password with `%40`):
```
DATABASE_URL="postgresql://postgres:Canaliculus%4033@db.lquiwadjbfapejjmivfh.supabase.co:5432/postgres"
```

**What changed:**
- `Canaliculus@33` → `Canaliculus%4033`
- The `@` symbol in your password is now `%40` (URL-encoded)

### Step 4: Save the File

Press `Ctrl + S` to save

---

## 📝 URL Encoding Reference

If your password has other special characters, encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `/` → `%2F`
- `=` → `%3D`
- `?` → `%3F`

---

## ✅ After Fixing

Let me know when you've updated the file, and I'll continue with the database setup!
