import { prisma } from '@/lib/db';
import { getAccessibleLevels } from '@/lib/utils';
import type { UserRole } from '@/types';

export interface DocumentInventory {
    totalDocuments: number;
    totalForms: number;
    totalPolicies: number;
    byDepartment: {
        department: string;
        count: number;
        forms: number;
        policies: number;
    }[];
}

/**
 * Get document inventory statistics based on user's access level
 * @param userRole - User's role to determine accessible documents
 * @returns Document inventory with counts by category and department
 */
export async function getDocumentInventory(userRole: UserRole): Promise<DocumentInventory> {
    try {
        // Get accessible document levels based on user role
        const accessLevels = getAccessibleLevels(userRole);

        console.log('[INVENTORY] User role:', userRole);
        console.log('[INVENTORY] Access levels:', accessLevels);

        // Query all accessible documents based on user role
        const documents = await prisma.document.findMany({
            where: {
                accessLevel: {
                    in: accessLevels,
                },
                status: 'processed', // Only count successfully processed documents
            },
            select: {
                id: true,
                category: true,
                department: true,
                filename: true,
                accessLevel: true,
                status: true,
            },
        });

        console.log('[INVENTORY] Documents found:', documents.length);
        console.log('[INVENTORY] Documents:', JSON.stringify(documents, null, 2));

        // Also check total documents without access filter
        const allDocs = await prisma.document.count({
            where: { status: 'processed' }
        });
        console.log('[INVENTORY] Total processed documents in DB (no filter):', allDocs);

        // Calculate totals
        const totalDocuments = documents.length;
        const totalForms = documents.filter(doc => doc.category === 'Form').length;
        const totalPolicies = documents.filter(doc => doc.category === 'Policy').length;

        console.log('[INVENTORY] Total:', totalDocuments, 'Forms:', totalForms, 'Policies:', totalPolicies);

        // Group by department
        const departmentMap = new Map<string, { count: number; forms: number; policies: number }>();

        documents.forEach(doc => {
            const dept = doc.department || 'Other';
            const existing = departmentMap.get(dept) || { count: 0, forms: 0, policies: 0 };

            existing.count++;
            if (doc.category === 'Form') existing.forms++;
            if (doc.category === 'Policy') existing.policies++;

            departmentMap.set(dept, existing);
        });

        // Convert to array and sort by count
        const byDepartment = Array.from(departmentMap.entries())
            .map(([department, stats]) => ({
                department,
                ...stats,
            }))
            .sort((a, b) => b.count - a.count);

        return {
            totalDocuments,
            totalForms,
            totalPolicies,
            byDepartment,
        };
    } catch (error) {
        console.error('Error fetching document inventory:', error);
        // Return empty inventory on error
        return {
            totalDocuments: 0,
            totalForms: 0,
            totalPolicies: 0,
            byDepartment: [],
        };
    }
}

/**
 * Format inventory data as a human-readable string for AI context
 * @param inventory - Document inventory data
 * @returns Formatted string
 */
export function formatInventoryForContext(inventory: DocumentInventory): string {
    if (inventory.totalDocuments === 0) {
        return 'SYSTEM INVENTORY: No documents have been uploaded yet.';
    }

    let summary = `SYSTEM INVENTORY: You have access to ${inventory.totalDocuments} document(s) in total:\n`;
    summary += `- ${inventory.totalForms} form(s)\n`;
    summary += `- ${inventory.totalPolicies} policy/policies\n`;

    if (inventory.byDepartment.length > 0) {
        summary += '\nBy Department:\n';
        inventory.byDepartment.forEach(dept => {
            summary += `- ${dept.department}: ${dept.count} total (${dept.forms} forms, ${dept.policies} policies)\n`;
        });
    }

    return summary.trim();
}

/**
 * Format inventory with detailed document list
 * @param documents - Array of documents with metadata
 * @returns Formatted string with document names
 */
export function formatInventoryWithDetails(documents: Array<{
    filename: string;
    category: string;
    department: string | null;
}>): string {
    if (documents.length === 0) {
        return 'SYSTEM INVENTORY: No documents have been uploaded yet.';
    }

    const forms = documents.filter(doc => doc.category === 'Form');
    const policies = documents.filter(doc => doc.category === 'Policy');

    let summary = `SYSTEM INVENTORY: You have access to ${documents.length} document(s) in total.\n\n`;

    if (forms.length > 0) {
        summary += `FORMS (${forms.length} total):\n`;
        forms.forEach((form, index) => {
            const dept = form.department ? `[${form.department}]` : '';
            summary += `${index + 1}. ${form.filename} ${dept}\n`;
        });
        summary += '\n';
    }

    if (policies.length > 0) {
        summary += `POLICIES (${policies.length} total):\n`;
        policies.forEach((policy, index) => {
            const dept = policy.department ? `[${policy.department}]` : '';
            summary += `${index + 1}. ${policy.filename} ${dept}\n`;
        });
    }

    return summary.trim();
}
