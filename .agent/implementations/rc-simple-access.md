# Temporary RC Member Access - Simple Implementation

## Summary
**Time to implement**: 5 minutes  
**Risk**: Zero (no database changes)  
**Rollback**: One git revert

## What We're Doing

Just add access control to both dashboard pages:
- Chairperson: Full access (no changes)
- RC Member (verified email): Full access with a note "You're viewing as RC Member"
- Others: Redirect to chat

## Files to Modify

### 1. `app/rc-management/publications/page.tsx`

Add at the top after imports:
```typescript
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { hasRCAccess } from '@/lib/utils/rc-member-check';
```

Add after state declarations (around line 97):
```typescript
const router = useRouter();
const { data: session } = useSession();

// Access control
useEffect(() => {
    if (session && !hasRCAccess(session.user.email, session.user.role)) {
        router.push('/chat');
    }
}, [session, router]);

if (!session) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-lg text-gray-300">Loading...</div>
    </div>;
}
```

### 2. `app/rc-management/postgraduate/page.tsx`

Same changes as above.

## That's It!

For your presentation:
- RC members can access the dashboards
- They see all data (for now)
- After presentation, we can add the filtering

**Want me to implement this 5-minute solution?**
