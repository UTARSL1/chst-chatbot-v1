
# Security Fix: Admin Verification Loophole

## Issue
Users with roles other than 'public' (e.g., 'member', 'student') were able to login immediately after email verification, bypassing the admin approval step. This was because the approval check in `lib/auth.ts` was scoped only to users with the 'public' role.

## Fix
The authentication logic in `lib/auth.ts` has been updated to enforce the `isApproved` check for **all** user roles. This ensures that no user can login until they have been explicitly approved by an administrator, regardless of their role.

## Changes
1.  **`lib/auth.ts`**:
    - Removed `user.role === 'public'` condition.
    - Added a global check: `if (!user.isApproved)`.

2.  **`app/api/auth/signup/route.ts`**:
    - Updated the signup success message to inform users that their account requires admin approval after email verification.

## Verification
-   **New Signups**: All new users will see a message about pending approval.
-   **Existing Unapproved Users**: Any existing users with `isApproved: false` (like the one reported: `cheeps@utar.edu.my`) will now be blocked from logging in until an admin approves them in the dashboard.
