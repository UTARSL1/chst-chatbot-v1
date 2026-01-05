# Complete File Change List for RC Member Role Implementation

## Critical: All Files Requiring Changes

This document lists EVERY file that needs modification to implement the `rc_member` role and rename `member` to `staff`.

---

## 1. DATABASE & SCHEMA (3 files)

### `prisma/schema.prisma`
**Line 456-461**: Update UserRole enum
```prisma
enum UserRole {
  student
  staff        // RENAMED from 'member'
  rc_member    // NEW ROLE
  chairperson
  public
}
```

### `prisma/schema.prisma`
**Line 463-468**: Update AccessLevel enum
```prisma
enum AccessLevel {
  student
  staff        // RENAMED from 'member'
  rc_member    // NEW ROLE
  chairperson
  public
}
```

### Migration Script (NEW FILE)
**`scripts/migrate-member-to-rc-member.ts`**
- Rename all `member` → `staff` in database
- Check emails against RC members list
- Update matching users to `rc_member`

---

## 2. TYPE DEFINITIONS (1 file)

### `types/index.ts`
**Line 2**: Update UserRole type
```typescript
export type UserRole = 'student' | 'staff' | 'rc_member' | 'chairperson' | 'public';
```

**Line 44**: Update AccessLevel type
```typescript
export type AccessLevel = 'student' | 'staff' | 'rc_member' | 'chairperson';
```

---

## 3. UTILITY FUNCTIONS (2 files)

### `lib/utils.ts`
**Line 11**: Update return type
```typescript
export function detectRoleFromEmail(email: string): 'student' | 'staff' | 'rc_member' | 'public' {
```

**Line 15**: Update return value
```typescript
return 'staff'; // UTAR Staff (not RC member)
```

**Line 28**: Update condition
```typescript
return role === 'student' || role === 'staff';
```

**Line 40-43**: Update getAccessibleLevels
```typescript
case 'staff':
    return ['public', 'student', 'staff'];
case 'rc_member':
    return ['public', 'student', 'staff', 'rc_member'];
case 'chairperson':
    return ['public', 'student', 'staff', 'rc_member', 'chairperson'];
```

### `lib/utils/rc-member-check.ts` (NEW FILE)
```typescript
import rcMembers from '@/data/rc-members.json';

export function isRCMember(email: string): boolean {
  return rcMembers.members.includes(email.toLowerCase());
}

export function getRoleForEmail(email: string, baseRole: string): string {
  if (baseRole === 'chairperson') return 'chairperson';
  if (isRCMember(email)) return 'rc_member';
  return baseRole;
}
```

---

## 4. DATA FILES (1 file)

### `data/rc-members.json` (NEW FILE)
Extract from `data/Member List.csv` column D:
```json
{
  "members": [
    "chansc@utar.edu.my",
    "cheeps@utar.edu.my",
    "chongyz@utar.edu.my",
    "gohch@utar.edu.my",
    "humyc@utar.edu.my",
    "humaira@utar.edu.my",
    "kamalak@utar.edu.my",
    "kongsg@utar.edu.my",
    "kwanbh@utar.edu.my"
  ]
}
```

---

## 5. AUTHENTICATION & REGISTRATION (2 files)

### `app/api/auth/signup/route.ts`
**Line 33**: Update type
```typescript
let role: 'student' | 'staff' | 'rc_member' | 'public' | 'chairperson';
```

**Line 91**: Update assignment
```typescript
role = 'staff'; // UTAR Staff
```

**After role assignment**: Add RC member check
```typescript
// Check if user is RC member
if (role === 'staff' && isRCMember(email)) {
    role = 'rc_member';
}
```

### `app/api/auth/[...nextauth]/route.ts`
Add RC member check in JWT callback to handle existing users

---

## 6. ADMIN PAGES (5 files)

### `app/admin/tools/page.tsx`
**Line 32**: Update ROLES array
```typescript
const ROLES = ['public', 'student', 'staff', 'rc_member', 'chairperson'];
```

### `app/admin/quick-access/page.tsx`
**Line 29, 69, 248, 299**: Update default roles
```typescript
roles: ['public', 'student', 'staff', 'rc_member', 'chairperson']
```

### `app/admin/popular-questions/page.tsx`
**Line 17, 28, 65**: Update ALL_ROLES
```typescript
const ALL_ROLES = ['student', 'staff', 'rc_member', 'public', 'chairperson'];
```

### `app/admin/users/[id]/route.ts`
**Line 82**: Update validRoles
```typescript
const validRoles = ['public', 'student', 'staff', 'rc_member', 'chairperson'];
```

---

## 7. API ROUTES (10 files)

### `app/api/admin/tools/route.ts`
**Line 19**: Update ALL_ROLES
```typescript
const ALL_ROLES = ['public', 'student', 'staff', 'rc_member', 'chairperson'];
```

### `app/api/admin/popular-questions/route.ts`
**Line 44**: Update default roles
```typescript
roles: roles || ['public', 'student', 'staff', 'rc_member', 'chairperson']
```

### `app/api/admin/knowledge/route.ts`
**Line 71**: Update default accessLevel
```typescript
accessLevel: accessLevel || ['public', 'student', 'staff', 'rc_member', 'chairperson']
```

### `app/api/quick-access/route.ts`
**Line 85**: Update default roles
```typescript
? (roles || ['public', 'student', 'staff', 'rc_member', 'chairperson'])
```

### `app/api/manual/route.ts`
**Line 13**: Update role validation
```typescript
if (!requestedRole || !['public', 'student', 'staff', 'rc_member', 'chairperson'].includes(requestedRole)) {
```

### `app/api/manual/download/route.ts`
**Line 14**: Update role validation
```typescript
if (!requestedRole || !['public', 'student', 'staff', 'rc_member', 'chairperson'].includes(requestedRole)) {
```

### `app/api/documents/route.ts`
**Line 40**: Update accessLevel validation
```typescript
if (!accessLevel || !['student', 'staff', 'rc_member', 'chairperson'].includes(accessLevel)) {
```

**Line 158**: Update type
```typescript
accessLevel: 'student' | 'staff' | 'rc_member' | 'chairperson'
```

**Line 221-222**: Update role check
```typescript
in: session.user.role === 'staff'
    ? ['student', 'staff']
    : session.user.role === 'rc_member'
    ? ['student', 'staff', 'rc_member']
    : ...
```

### `app/api/documents/download/route.ts`
**Line 48**: Update role check
```typescript
(userRole === 'staff' && ['student', 'staff'].includes(docAccess)) ||
(userRole === 'rc_member' && ['student', 'staff', 'rc_member'].includes(docAccess)) ||
```

### `app/api/debug/fix-paths/route.ts`
**Line 61**: Update default category
```typescript
const category = doc.accessLevel || 'staff';
```

---

## 8. COMPONENTS (4 files)

### `components/UserManualButton.tsx`
**Line 74**: Update roles array
```typescript
{['public', 'student', 'staff', 'rc_member', 'chairperson'].map((role) => (
```

**Line 87**: Update role display
```typescript
{role === 'staff' && 'Research tools and JCR metrics'}
{role === 'rc_member' && 'RC member features and dashboards'}
```

### `components/admin/document-list.tsx`
**Line 221**: Update color mapping
```typescript
doc.accessLevel === 'staff' ? 'bg-blue-500/20 text-blue-300' :
doc.accessLevel === 'rc_member' ? 'bg-purple-500/20 text-purple-300' :
```

### `components/admin/KnowledgeNoteModal.tsx`
**Line 41**: Update default accessLevel
```typescript
const [accessLevel, setAccessLevel] = useState<string[]>(['public', 'student', 'staff', 'rc_member', 'chairperson']);
```

**Line 149-150**: Update logic
```typescript
} else if (accessLevel.includes('rc_member')) {
    documentAccessLevel = 'rc_member';
} else if (accessLevel.includes('staff')) {
    documentAccessLevel = 'staff';
```

**Line 633**: Update dropdown options
```typescript
{ value: 'staff', label: 'Staff' },
{ value: 'rc_member', label: 'RC Member' },
```

### `components/admin/document-upload.tsx`
**Line 12**: Update default accessLevel
```typescript
const [accessLevel, setAccessLevel] = useState<string>('staff');
```

---

## 9. CHAT PAGE (1 file)

### `app/chat/page.tsx`
**Line 558**: Update role badge
```typescript
case 'staff': return 'role-badge-staff';
case 'rc_member': return 'role-badge-rc-member';
```

**Line 799**: Update RC Quick Access filter
```typescript
.filter((link) => link.section === 'rc' && (
    session.user.role === 'rc_member' || 
    session.user.role === 'chairperson' ||
    link.roles.includes(session.user.role)
))
```

**Line 927**: Update RC Management visibility
```typescript
{(session.user.role === 'rc_member' || session.user.role === 'chairperson') && (
```

**Line 997**: Update role display
```typescript
{session.user.role === 'staff' ? 'Staff' : 
 session.user.role === 'rc_member' ? 'RC Member' :
 session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)}
```

---

## 10. RAG SYSTEM (2 files)

### `lib/rag/query.ts`
**Line 1808**: Update default accessLevel
```typescript
accessLevel: doc.accessLevel || 'staff',
```

### `lib/rag/suggestions.ts`
**Line 13**: Update type
```typescript
userRole: 'student' | 'staff' | 'rc_member' | 'chairperson' | 'public';
```

---

## 11. SCRIPTS (5 files)

### `scripts/seed-rc-links.js`
Update roles for RC-specific links:
```javascript
roles: ['rc_member', 'chairperson'], // Teams Portal and Resource Hub
roles: ['public', 'student', 'staff', 'rc_member', 'chairperson'], // LinkedIn and Website
```

### `scripts/test-knowledge-notes.ts`
**Line 27**: Update levels
```typescript
const chairpersonLevels = ['public', 'student', 'staff', 'rc_member', 'chairperson'];
```

### `scripts/add-nature-index-jif-tool.ts`
**Line 24**: Update allowedRoles
```typescript
allowedRoles: ['public', 'student', 'staff', 'rc_member', 'chairperson']
```

### `scripts/add-journal-tool.ts`
**Line 6**: Update allRoles
```typescript
const allRoles = ['public', 'student', 'staff', 'rc_member', 'chairperson'];
```

### `scripts/test-pdf-extraction.ts`
**Line 17**: Update directory path
```typescript
const documentsDir = path.join(process.cwd(), 'documents', 'staff');
```

---

## 12. RC MANAGEMENT PAGES (2 files)

### `app/rc-management/publications/page.tsx`
Add role-based tab visibility and data filtering for `rc_member`

### `app/rc-management/postgraduate/page.tsx`
Add role-based tab visibility and data filtering for `rc_member`

---

## 13. CSS STYLES (1 file)

### `app/globals.css`
Add new role badge styles:
```css
.role-badge-staff {
  @apply bg-blue-500/20 text-blue-300 border-blue-500/30;
}

.role-badge-rc-member {
  @apply bg-purple-500/20 text-purple-300 border-purple-500/30;
}
```

---

## TOTAL FILES TO MODIFY: 44 files

### Breakdown:
- **Database/Schema**: 3 files
- **Types**: 1 file
- **Utils**: 2 files (1 new)
- **Data**: 1 file (new)
- **Auth**: 2 files
- **Admin Pages**: 5 files
- **API Routes**: 10 files
- **Components**: 4 files
- **Chat Page**: 1 file
- **RAG System**: 2 files
- **Scripts**: 5 files
- **RC Management**: 2 files
- **Styles**: 1 file
- **Migration**: 1 file (new)

---

## TESTING REQUIREMENTS

After all changes, test:
1. ✅ User registration with RC member email
2. ✅ User registration with non-RC UTAR email
3. ✅ Role display in UI
4. ✅ Quick Access (RC) visibility
5. ✅ RC Management visibility
6. ✅ Document access levels
7. ✅ Knowledge note access
8. ✅ Tool permissions
9. ✅ Manual generation
10. ✅ Popular questions filtering
11. ✅ RC Publications dashboard (rc_member vs chairperson)
12. ✅ RC Postgraduate dashboard (rc_member vs chairperson)

---

## DEPLOYMENT CHECKLIST

- [ ] Create `data/rc-members.json` from CSV
- [ ] Run database migration
- [ ] Update all 44 files
- [ ] Test locally with all 3 roles (staff, rc_member, chairperson)
- [ ] Verify no TypeScript errors
- [ ] Run `npm run build` successfully
- [ ] Deploy to staging
- [ ] Test on staging
- [ ] Deploy to production
- [ ] Monitor for errors
