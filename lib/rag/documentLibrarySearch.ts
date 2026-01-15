import prisma from '@/lib/prisma';

/**
 * Search Document Library entries using keyword matching
 * Similar to searchKnowledgeNotes but for Document Library
 */

interface DocumentLibraryResult {
    id: string;
    documentTitle: string | null;
    title: string;
    content: string;
    priority: string;
    department: string | null;
    documentType: string | null;
}

export async function searchDocumentLibrary(
    query: string,
    accessLevels: string[],
    limit: number = 3
): Promise<DocumentLibraryResult[]> {
    try {
        console.log(`[DocumentLibrarySearch] Searching with accessLevels: [${accessLevels.join(', ')}]`);

        // Get all active entries that the user can access
        const entries = await prisma.documentLibraryEntry.findMany({
            where: {
                isActive: true,
                status: 'active',
                accessLevel: {
                    hasSome: accessLevels
                }
            },
            select: {
                id: true,
                documentTitle: true,
                title: true,
                content: true,
                priority: true,
                department: true,
                documentType: true,
                tags: true
            }
        });

        if (entries.length === 0) {
            console.log('[DocumentLibrarySearch] No entries found');
            return [];
        }

        console.log(`[DocumentLibrarySearch] Found ${entries.length} entries to search`);

        // Simple keyword matching (similar to knowledge notes)
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        const scoredEntries = entries.map(entry => {
            let score = 0;

            // Search in document title
            if (entry.documentTitle) {
                const titleLower = entry.documentTitle.toLowerCase();
                queryWords.forEach(word => {
                    if (titleLower.includes(word)) {
                        score += 3; // High weight for document title match
                    }
                });
            }

            // Search in section title
            const sectionTitleLower = entry.title.toLowerCase();
            queryWords.forEach(word => {
                if (sectionTitleLower.includes(word)) {
                    score += 2; // Medium weight for section title match
                }
            });

            // Search in content
            const contentLower = entry.content.toLowerCase();
            queryWords.forEach(word => {
                if (contentLower.includes(word)) {
                    score += 1; // Lower weight for content match
                }
            });

            // Search in tags
            entry.tags.forEach(tag => {
                const tagLower = tag.toLowerCase();
                queryWords.forEach(word => {
                    if (tagLower.includes(word)) {
                        score += 2; // Medium weight for tag match
                    }
                });
            });

            // Priority boost
            if (entry.priority === 'critical') score *= 1.5;
            if (entry.priority === 'high') score *= 1.2;

            return { ...entry, score };
        });

        // Filter and sort
        const results = scoredEntries
            .filter(e => e.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ score, tags, ...entry }) => entry);

        console.log(`[DocumentLibrarySearch] Returning ${results.length} results`);

        return results;

    } catch (error) {
        console.error('[DocumentLibrarySearch] Error:', error);
        return [];
    }
}
