import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Detect user role based on email domain
 */
export function detectRoleFromEmail(email: string): 'student' | 'member' | 'public' {
    const domain = email.split('@')[1]?.toLowerCase();

    if (domain === 'utar.edu.my') {
        return 'member'; // Staff
    } else if (domain === '1utar.my') {
        return 'student';
    } else {
        return 'public';
    }
}

/**
 * Check if user should be auto-approved based on email domain
 */
export function shouldAutoApprove(email: string): boolean {
    const role = detectRoleFromEmail(email);
    return role === 'student' || role === 'member';
}

/**
 * Get accessible document levels based on user role
 * Hierarchy: public (accessible to all) < student < member < chairperson
 * Each role can access their own level + all levels below + public
 */
export function getAccessibleLevels(role: string): string[] {
    switch (role) {
        case 'student':
            return ['public', 'student'];
        case 'member':
            return ['public', 'student', 'member'];
        case 'chairperson':
            return ['public', 'student', 'member', 'chairperson'];
        default:
            return ['public']; // Default: only public access
    }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

/**
 * Format date relative to now
 */
export function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
}
