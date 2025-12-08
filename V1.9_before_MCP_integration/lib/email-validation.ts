/**
 * List of allowed general email providers for public signups
 */
const ALLOWED_GENERAL_PROVIDERS = [
    'gmail.com',
    'googlemail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'yahoo.com',
    'ymail.com',
    'icloud.com',
    'me.com',
    'protonmail.com',
    'pm.me',
    'aol.com',
    'zoho.com',
    'mail.com',
];

/**
 * Check if email domain is a general provider (Gmail, Outlook, etc.)
 */
export function isGeneralEmailProvider(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return ALLOWED_GENERAL_PROVIDERS.includes(domain);
}

/**
 * Check if email is a UTAR email
 */
export function isUTAREmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain === 'utar.edu.my' || domain === '1utar.my';
}

/**
 * Validate recovery email (must be general provider, not UTAR or company)
 */
export function isValidRecoveryEmail(email: string): boolean {
    return isGeneralEmailProvider(email);
}

/**
 * Generate a random invitation code
 */
export function generateInvitationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
    let code = 'INV-';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
