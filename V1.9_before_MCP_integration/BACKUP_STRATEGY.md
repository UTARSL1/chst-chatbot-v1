# Database Backup Strategy

## ⚠️ CRITICAL LESSON LEARNED

On 2025-12-06, we lost all database data due to running `prisma db push` without backups.

## 🛡️ Prevention Measures

### 1. **NEVER Use `prisma db push` in Production**
- ❌ `prisma db push` - Dangerous, can wipe data
- ✅ `prisma migrate dev` - Safe, creates migration files
- ✅ `prisma migrate deploy` - For production

### 2. **Always Use Migrations for Schema Changes**
```bash
# Create a migration (safe)
npx prisma migrate dev --name add_new_field

# Apply to production (safe)
npx prisma migrate deploy
```

### 3. **Enable Supabase Backups**
- Upgrade to Pro plan ($25/month) for:
  - Point-in-Time Recovery
  - Daily automated backups
  - 7-day retention

### 4. **Manual Backup Before Major Changes**
```bash
# Export data before schema changes
pg_dump [connection-string] > backup.sql
```

### 5. **Test on Development Database First**
- Create separate dev/prod Supabase projects
- Test all schema changes on dev first
- Only apply to production after verification

## 📝 Safe Workflow for Schema Changes

1. Make changes to `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name description`
3. Test locally
4. Commit migration files to git
5. Deploy to production: `npx prisma migrate deploy`

## 🚨 Emergency Contacts

If data loss occurs:
1. Check Supabase backups immediately
2. Contact Supabase support if on paid plan
3. Notify all users of data loss

## 💰 Cost-Benefit Analysis

**Supabase Pro ($25/month)**:
- ✅ Automatic backups
- ✅ Point-in-Time Recovery
- ✅ Peace of mind
- ✅ Worth it for production apps

**Free Plan**:
- ❌ No backups
- ❌ High risk of data loss
- ⚠️ Only for testing/learning
