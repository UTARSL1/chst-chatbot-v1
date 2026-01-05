/**
 * RC Member Verification Utility
 * Checks if a user email belongs to a CHST RC member
 */

import rcMembers from '@/data/rc-members.json';

/**
 * Check if an email belongs to an RC member
 */
export function isRCMember(email: string): boolean {
    if (!email) return false;
    return rcMembers.members.includes(email.toLowerCase().trim());
}

/**
 * Check if a user (by email and role) has RC member access
 * Chairperson always has access
 * Members need to be in the RC members list
 */
export function hasRCAccess(email: string, role: string): boolean {
    // Chairperson always has full RC access
    if (role === 'chairperson') return true;

    // Members need to be verified RC members
    if (role === 'member') return isRCMember(email);

    // Other roles don't have RC access
    return false;
}

/**
 * Check if a user has partial RC access (overview only, no member names)
 */
export function hasRCOverviewAccess(email: string, role: string): boolean {
    // Same as hasRCAccess for now
    // In future, could differentiate between full and partial access
    return hasRCAccess(email, role);
}
