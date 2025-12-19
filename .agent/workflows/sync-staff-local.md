---
description: How to sync the staff directory locally
---

# Staff Directory Sync - Local Workflow

This guide explains how to update the staff directory by running the sync on your local computer instead of using the cloud sync button.

## Why Run Sync Locally?

- ✅ Your local files stay in sync with production
- ✅ You can review changes before deploying
- ✅ Changes are tracked in version control (git)
- ✅ No confusion between local and cloud data

## Prerequisites

- Git installed
- Node.js installed
- Project cloned to your computer
- Terminal/Command Prompt access

## Step-by-Step Instructions

### 1. Open Terminal

**Windows**: Press `Win + R`, type `cmd`, press Enter
**Mac**: Press `Cmd + Space`, type `terminal`, press Enter

### 2. Navigate to Project Directory

```bash
cd path/to/chst-chatbot-v1
```

Replace `path/to/chst-chatbot-v1` with the actual path where the project is located.

### 3. Run the Sync

```bash
npm run sync:local
```

This will:
- Connect to UTAR staff directory
- Scrape staff information for LKC FES
- Update `lib/tools/staff_directory.json`
- Show progress and statistics

**Expected output:**
```
=== Starting Local Staff Directory Sync ===

Syncing faculties: LKC FES

[StaffDirectory] === Starting Staff Directory Sync ===
[StaffDirectory] Faculties to sync: LKC FES
...
[StaffDirectory] Sync completed successfully

=== Sync Complete ===
Status: success
Duration: 2m 15s
Total staff: 278
Changes: +5, ~12, -0
```

### 4. Review Changes

Check what changed in the staff directory:

```bash
git diff lib/tools/staff_directory.json
```

This shows you:
- New staff added (green lines with `+`)
- Staff information updated (red/green lines)
- Staff removed (red lines with `-`)

### 5. Commit Changes

If the changes look good, save them to git:

```bash
git add lib/tools/staff_directory.json
git commit -m "chore: update staff directory - [date]"
```

Replace `[date]` with today's date, e.g., "2025-12-20"

### 6. Push to Production

Deploy the changes to the live website:

```bash
git push
```

Vercel will automatically deploy the updated staff directory within 1-2 minutes.

## Troubleshooting

### Error: "Cannot find module"

**Solution**: Install dependencies first
```bash
npm install
```

### Error: "Sync failed"

**Possible causes**:
- Internet connection issue
- UTAR website is down
- Rate limiting (too many requests)

**Solution**: Wait 5 minutes and try again

### Changes Not Showing on Website

**Solution**: Wait 2-3 minutes for Vercel to deploy, then hard refresh the page (Ctrl+F5)

## How Often to Sync?

- **Recommended**: Once per month
- **After major events**: New semester, staff changes announced
- **On demand**: When users report outdated information

## Notes

- The sync takes 2-5 minutes to complete
- Don't close the terminal while sync is running
- If sync fails, you can safely run it again
- The local file will only update if sync succeeds
