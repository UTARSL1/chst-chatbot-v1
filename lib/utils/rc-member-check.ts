/**
 * RC Member Verification Utility
 * Checks if a user email belongs to a CHST RC member and retrieves their Staff ID
 */

import rcMembersData from '@/data/rc-members.json';

interface RCMember {
    email: string;
    staffId: string;
    name: string;
    faculty: string;
}

const rcMembers: RCMember[] = rcMembersData.members as RCMember[];

/**
 * Normalize Staff ID to match uploaded data format
 * Member List: "7129" → Uploaded Data: "?07129"
 * Member List: "15106" → Uploaded Data: "?15106"
 * Member List: "E10011" → Uploaded Data: "?E10011"
 */
export function normalizeStaffId(staffId: string): string {
    if (!staffId) return '';

    // Remove any existing "?" prefix
    let normalized = staffId.replace(/^\?/, '').trim();

    // If it's a 4-digit number, pad with leading zero
    if (/^\d{4}$/.test(normalized)) {
        normalized = '0' + normalized;
    }

    // Add "?" prefix to match uploaded data format
    return '?' + normalized;
}

/**
 * Check if two Staff IDs match (handles different formats)
 */
export function staffIdsMatch(id1: string, id2: string): boolean {
    if (!id1 || !id2) return false;
    return normalizeStaffId(id1) === normalizeStaffId(id2);
}

/**
 * Check if an email belongs to an RC member
 */
export function isRCMember(email: string): boolean {
    if (!email) return false;
    const normalizedEmail = email.toLowerCase().trim();
    return rcMembers.some(member => member.email === normalizedEmail);
}

/**
 * Get RC member details by email
 */
export function getRCMemberByEmail(email: string): RCMember | null {
    if (!email) return null;
    const normalizedEmail = email.toLowerCase().trim();
    return rcMembers.find(member => member.email === normalizedEmail) || null;
}

/**
 * Get Staff ID for an RC member by email (in uploaded data format)
 * Returns format like "?07129" to match uploaded CSV files
 */
export function getStaffIdByEmail(email: string): string | null {
    const member = getRCMemberByEmail(email);
    if (!member) return null;

    // Return normalized Staff ID that matches uploaded data format
    return normalizeStaffId(member.staffId);
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
