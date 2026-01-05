# RC Member Access Control Implementation

## Overview
Implement granular access control for RC Management dashboards with a new `rc_member` role that grants partial access to RC Publications and RC Postgraduate overview dashboards (without member names).

## Current State
- **RC Management**: Chairperson-only access
- **Roles**: `public`, `student`, `member`, `chairperson`
- **Quick Access (RC)**: Currently filtered by role (member, chairperson)

## Target State
- **New Role**: `rc_member` (CHST RC members verified by email)
- **Renamed Role**: `member` → `staff` (general UTAR staff)
- **RC Publications**: 
  - Chairperson: Full access (Overview + Individual tabs)
  - RC Member: Overview tab only, without member names
- **RC Postgraduate**:
  - Chairperson: Full access (Overview + Individual tabs)
  - RC Member: Overview tab only, without member names
- **Quick Access (RC)**: Visible to `rc_member` and `chairperson` only

## Implementation Steps

### 1. Create RC Members JSON from CSV
**File**: `data/rc-members.json`
**Source**: `data/Member List.csv` (Column D - Email)

```json
{
  "members": [
    "chansc@utar.edu.my",
    "cheeps@utar.edu.my",
    "chongyz@utar.edu.my",
    ...
  ]
}
```

### 2. Update Database Schema
**File**: `prisma/schema.prisma`

```prisma
enum UserRole {
  student
  staff        // renamed from 'member'
  rc_member    // new role for RC members
  chairperson
  public
}
```

**Migration Steps**:
1. Add `rc_member` to enum
2. Rename `member` to `staff` (data migration required)
3. Run `npx prisma migrate dev --name add_rc_member_role`

### 3. Create RC Member Verification Utility
**File**: `lib/utils/rc-member-check.ts`

```typescript
import rcMembers from '@/data/rc-members.json';

export function isRCMember(email: string): boolean {
  return rcMembers.members.includes(email.toLowerCase());
}

export function getRoleForEmail(email: string, currentRole: string): string {
  // If already chairperson, keep it
  if (currentRole === 'chairperson') return 'chairperson';
  
  // Check if RC member
  if (isRCMember(email)) return 'rc_member';
  
  // Otherwise return current role
  return currentRole;
}
```

### 4. Update Registration/Login Logic
**Files**: 
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/auth/register/route.ts`

**Changes**:
- Auto-assign `rc_member` role if email matches RC members list
- Update existing users with matching emails

### 5. Update RC Dashboard Access Control

#### A. RC Publications Overview (Hide Member Names)
**File**: `app/rc-management/publications/page.tsx`

**Changes**:
- Add role check for tab visibility
- Create filtered version of overview data (remove member names/IDs)
- Show only "Overview" tab for `rc_member`

#### B. RC Postgraduate Overview (Hide Member Names)
**File**: `app/rc-management/postgraduate/page.tsx`

**Changes**:
- Add role check for tab visibility
- Create filtered version of overview data (remove supervisor names/IDs)
- Show only "Overview" tab for `rc_member`

### 6. Update Quick Access (RC) Visibility
**File**: `app/chat/page.tsx`

**Current**:
```tsx
{customLinks
  .filter((link) => link.section === 'rc' && link.roles.includes(session.user.role))
  .map(...)}
```

**Updated**:
```tsx
{(session.user.role === 'rc_member' || session.user.role === 'chairperson') && (
  <div className="space-y-2">
    {/* RC Quick Access links */}
  </div>
)}
```

### 7. Update RC Management Section Visibility
**File**: `app/chat/page.tsx`

**Current**:
```tsx
{session.user.role === 'chairperson' && (
  <div className="space-y-2">
    {/* RC Management links */}
  </div>
)}
```

**Updated**:
```tsx
{(session.user.role === 'rc_member' || session.user.role === 'chairperson') && (
  <div className="space-y-2">
    {/* RC Management links - filtered by role */}
  </div>
)}
```

### 8. Create API Endpoints for Filtered Data

#### A. RC Publications Overview (RC Member Version)
**File**: `app/api/rc-management/publications/overview-public/route.ts`

**Returns**: Aggregated stats without member identification
- Total publications by year
- Q1-Q4 breakdown
- Publication trends
- **Excludes**: Individual member names, IDs, rankings

#### B. RC Postgraduate Overview (RC Member Version)
**File**: `app/api/rc-management/postgraduate/overview-public/route.ts`

**Returns**: Aggregated stats without supervisor identification
- Total students by year
- Intake year distribution
- Supervision trends
- **Excludes**: Supervisor names, IDs, rankings

### 9. Update Database Seeding Scripts
**File**: `scripts/seed-rc-links.js`

**Update roles**:
```javascript
roles: ['rc_member', 'chairperson'], // Updated from ['member', 'chairperson']
```

### 10. Data Migration Script
**File**: `scripts/migrate-member-to-staff.ts`

```typescript
// Migrate existing 'member' role to 'staff'
// Then check emails against RC members list
// Update matching users to 'rc_member'
```

## Testing Checklist

- [ ] RC members can see "RC Management" section
- [ ] RC members can see "Quick Access (RC)" links
- [ ] RC members can access RC Publications (Overview tab only)
- [ ] RC members can access RC Postgraduate (Overview tab only)
- [ ] RC members CANNOT see "Individual" tabs
- [ ] RC members CANNOT see member names in overview
- [ ] Chairperson retains full access
- [ ] Staff (renamed from member) cannot access RC features
- [ ] Role assignment works correctly during registration
- [ ] Existing users are migrated correctly

## Security Considerations

1. **Email Verification**: Ensure emails are verified before granting RC member access
2. **Case Sensitivity**: Email comparison should be case-insensitive
3. **Data Filtering**: Server-side filtering to prevent data leaks
4. **API Protection**: All RC endpoints must check role permissions
5. **Frontend Guards**: Hide UI elements based on role (defense in depth)

## Rollback Plan

If issues occur:
1. Revert schema changes
2. Restore `member` role
3. Remove `rc_member` role checks
4. Restore original access control logic

## Files to Modify

1. `prisma/schema.prisma` - Add rc_member role
2. `data/rc-members.json` - Create from CSV
3. `lib/utils/rc-member-check.ts` - New utility
4. `app/api/auth/[...nextauth]/route.ts` - Auto-assign role
5. `app/api/auth/register/route.ts` - Auto-assign role
6. `app/rc-management/publications/page.tsx` - Tab visibility
7. `app/rc-management/postgraduate/page.tsx` - Tab visibility
8. `app/api/rc-management/publications/overview-public/route.ts` - New endpoint
9. `app/api/rc-management/postgraduate/overview-public/route.ts` - New endpoint
10. `app/chat/page.tsx` - Update visibility logic
11. `scripts/seed-rc-links.js` - Update roles
12. `scripts/migrate-member-to-staff.ts` - New migration script

## Estimated Effort

- Schema changes: 30 minutes
- Data migration: 1 hour
- API endpoints: 2 hours
- Frontend updates: 2 hours
- Testing: 1 hour
- **Total**: ~6-7 hours
