# RC Member Individual Dashboard Access - Temporary Solution

## Overview
Allow RC members to view their own individual performance in RC Publications and RC Postgraduate dashboards, while chairperson can view all members.

## Implementation Strategy (Zero Risk)

### ✅ **What We've Done So Far:**
1. Created `data/rc-members.json` with 16 RC member emails
2. Created `lib/utils/rc-member-check.ts` utility
3. Updated `app/chat/page.tsx` to show RC sections only to verified RC members
4. **No database changes** - uses existing `member` role

### 🎯 **What We Need to Add:**

## 1. RC Publications Dashboard

**File**: `app/rc-management/publications/page.tsx`

### Current Behavior:
- Chairperson sees 2 tabs: "Overview" + "Individual"
- Others see nothing

### New Behavior:
- **Chairperson**: Sees both tabs, all members in Individual tab
- **RC Member**: Sees both tabs, but Individual tab shows ONLY their own data
- **Others**: No access (redirected)

### Implementation:

```typescript
// At the top of the file
import { hasRCAccess } from '@/lib/utils/rc-member-check';
import { useSession } from 'next-auth/react';

// In the component
const { data: session } = useSession();

// Access control
useEffect(() => {
    if (!session) return;
    
    if (!hasRCAccess(session.user.email, session.user.role)) {
        router.push('/chat'); // Redirect non-RC members
    }
}, [session]);

// Filter individual data based on user
const filteredIndividualData = useMemo(() => {
    if (session?.user.role === 'chairperson') {
        return individualData; // Show all
    }
    
    // For RC members, show only their own data
    return individualData.filter(member => 
        member.email?.toLowerCase() === session?.user.email?.toLowerCase()
    );
}, [individualData, session]);
```

## 2. RC Postgraduate Dashboard

**File**: `app/rc-management/postgraduate/page.tsx`

### Current Behavior:
- Chairperson sees 2 tabs: "Overview" + "Individual"
- Others see nothing

### New Behavior:
- **Chairperson**: Sees both tabs, all supervisors in Individual tab
- **RC Member**: Sees both tabs, but Individual tab shows ONLY their own supervision data
- **Others**: No access (redirected)

### Implementation:

```typescript
// Same pattern as Publications
import { hasRCAccess } from '@/lib/utils/rc-member-check';
import { useSession } from 'next-auth/react';

const { data: session } = useSession();

// Access control
useEffect(() => {
    if (!session) return;
    
    if (!hasRCAccess(session.user.email, session.user.role)) {
        router.push('/chat');
    }
}, [session]);

// Filter supervision data
const filteredSupervisionData = useMemo(() => {
    if (session?.user.role === 'chairperson') {
        return supervisionData; // Show all
    }
    
    // For RC members, show only their own supervision
    return supervisionData.filter(supervisor => 
        supervisor.email?.toLowerCase() === session?.user.email?.toLowerCase()
    );
}, [supervisionData, session]);
```

## 3. Update Overview Tab Display

### For Both Dashboards:

**Current**: Shows all member names in leaderboards/rankings
**New**: 
- **Chairperson**: Shows all names (no change)
- **RC Member**: Shows aggregated stats WITHOUT individual names
  - Example: "Top RC Contributors" → "RC Publication Statistics"
  - Remove leaderboard sections that show other members' names
  - Keep only aggregate charts (total pubs by year, Q1-Q4 breakdown, etc.)

### Implementation:

```typescript
// In Overview tab rendering
{session?.user.role === 'chairperson' ? (
    <>
        {/* Full overview with member names */}
        <TopContributorsSection data={topContributors} />
        <LeaderboardSection data={leaderboard} />
    </>
) : (
    <>
        {/* Aggregated stats only, no names */}
        <AggregateStatsSection data={aggregateStats} />
        <TrendsSection data={trends} />
    </>
)}
```

## 4. Email Matching Logic

### Important Considerations:

1. **Email Format**: RC members JSON uses lowercase emails
2. **Session Email**: User's email from session
3. **Database Email**: Staff email in publications/postgraduate data

### Matching Function:

```typescript
// In lib/utils/rc-member-check.ts
export function matchesRCMember(userEmail: string, memberEmail: string): boolean {
    if (!userEmail || !memberEmail) return false;
    return userEmail.toLowerCase().trim() === memberEmail.toLowerCase().trim();
}

export function isOwnData(userEmail: string, dataEmail: string): boolean {
    return matchesRCMember(userEmail, dataEmail);
}
```

## 5. UI Indicators

### Add visual indicators for RC members:

```typescript
// In Individual tab
{session?.user.role !== 'chairperson' && (
    <div className="mb-4 p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg">
        <p className="text-sm text-blue-400">
            📊 Viewing your individual performance data
        </p>
    </div>
)}
```

## Files to Modify

### 1. `app/rc-management/publications/page.tsx`
- Add access control redirect
- Filter individual data by email
- Conditionally render overview sections

### 2. `app/rc-management/postgraduate/page.tsx`
- Add access control redirect
- Filter supervision data by email
- Conditionally render overview sections

### 3. `lib/utils/rc-member-check.ts` (already created)
- Add email matching helpers

## Testing Checklist

- [ ] Chairperson can access both dashboards
- [ ] Chairperson sees all members in Individual tabs
- [ ] Chairperson sees full Overview with names
- [ ] RC Member (verified email) can access both dashboards
- [ ] RC Member sees only their own data in Individual tab
- [ ] RC Member sees aggregated Overview without other names
- [ ] Non-RC member is redirected from dashboards
- [ ] Email matching works correctly (case-insensitive)
- [ ] Empty state shown if RC member has no data

## Rollback Plan

If issues occur:
```bash
git revert HEAD  # Reverts the temp solution
```

No database changes means instant rollback!

## Security Notes

1. **Frontend filtering only**: Data is filtered in the component
2. **Backend protection needed**: API routes should also filter by email
3. **Session validation**: Always check session exists before filtering
4. **Email verification**: Ensure email is verified before granting access

## Next Steps After Presentation

After management presentation, consider:
1. Move filtering to API level (more secure)
2. Add proper `rc_member` role to database
3. Implement caching for RC member lookups
4. Add audit logging for dashboard access

## Estimated Time

- Publications dashboard: 30 minutes
- Postgraduate dashboard: 30 minutes
- Testing: 15 minutes
- **Total**: ~1.5 hours

---

**Status**: Ready to implement
**Risk Level**: ⭐ Very Low (no DB changes, easy rollback)
**Presentation Ready**: ✅ Yes
