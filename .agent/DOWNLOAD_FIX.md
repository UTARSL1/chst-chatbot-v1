# Document Download Fix for Production (Vercel)

## Problem
Documents download successfully on localhost but fail in production (Vercel).

## Root Cause
The original implementation tried to download the entire file blob through the Vercel serverless function, which has several issues:
1. **Memory limits** on serverless functions
2. **Timeout limits** for large files
3. **Bandwidth costs** as data flows through the function

## Solution
Changed to use **Supabase Signed URLs** instead:
- Generates a temporary signed URL (expires in 60 seconds)
- Redirects user directly to Supabase storage
- File downloads directly from Supabase to user's browser
- No serverless function overhead

## Required Environment Variables in Vercel

Make sure these are set in your Vercel project settings:

### 1. NEXT_PUBLIC_SUPABASE_URL
- **Value**: Your Supabase project URL
- **Example**: `https://xxxxxxxxxxxxx.supabase.co`
- **Location**: Supabase Dashboard → Project Settings → API → Project URL

### 2. SUPABASE_SERVICE_ROLE_KEY
- **Value**: Your Supabase service role key (secret key, NOT anon key)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Important**: This is the **service_role** key, not the **anon** key
- **Location**: Supabase Dashboard → Project Settings → API → service_role key (secret)
- **Security**: ⚠️ Keep this secret! Never expose in client-side code

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add both variables:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
     Value: `<your-supabase-url>`
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
     Value: `<your-service-role-key>`
4. Select all environments (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application for changes to take effect

## Supabase Storage Permissions

Also verify your Supabase storage bucket has the correct policies:

### Storage Bucket: `documents`

The service role key has full access by default, but if you've customized policies, ensure:

```sql
-- Allow service role to read files
CREATE POLICY "Service role can read documents"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'documents');

-- Allow service role to create signed URLs
-- (Usually allowed by default for service_role)
```

## Testing the Fix

1. Deploy the updated code to Vercel
2. Ensure environment variables are set
3. Try downloading a document from the chat interface
4. Check Vercel function logs if issues persist:
   - Vercel Dashboard → Deployments → [your deployment] → Functions → Logs

## Changes Made

### Modified File: `app/api/documents/download/route.ts`
- **Before**: Downloaded entire file through serverless function
- **After**: Generates signed URL and redirects directly to Supabase

### Benefits:
- ✅ No serverless timeout issues
- ✅ No memory limits
- ✅ Faster downloads
- ✅ Lower Vercel bandwidth costs
- ✅ Better for large PDF files

## Alternative: Direct Client-Side Download (Future Enhancement)

For even better performance, you could bypass the API route entirely and generate signed URLs client-side using the Supabase anon key with proper RLS policies. However, the current approach maintains centralized access control in your API.
