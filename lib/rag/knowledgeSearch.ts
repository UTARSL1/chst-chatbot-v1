import { prisma } from '@/lib/db';

interface KnowledgeNoteResult {
    id: string;
    title: string;
    content: string;
    priority: string;
    category: string | null;
    formatType?: string;
}

/**
 * Search for relevant knowledge notes based on user query
 * Uses simple keyword matching for now (can be enhanced with embeddings later)
 * @param query - User's query text
 * @param accessLevels - User's accessible levels
 * @param limit - Maximum number of notes to return
 * @returns Array of relevant knowledge notes
 */
export async function searchKnowledgeNotes(
    query: string,
    accessLevels: string[],
    limit: number = 3
): Promise<KnowledgeNoteResult[]> {
    try {
        // Get all active knowledge notes that the user can access
        const notes = await prisma.knowledgeNote.findMany({
            where: {
                isActive: true,
                status: 'active',
                accessLevel: {
                    hasSome: accessLevels,
                },
            },
            select: {
                id: true,
                title: true,
                content: true,
                priority: true,
                category: true,
                formatType: true,
            },
            orderBy: [
                // Order by priority first (critical > high > standard)
                { priority: 'desc' },
                { updatedAt: 'desc' },
            ],
        });

        if (notes.length === 0) {
            return [];
        }

        // Simple keyword matching - check if query keywords appear in title or content
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);

        // Score each note based on keyword matches
        const scoredNotes = notes.map(note => {
            const titleLower = note.title.toLowerCase();
            const contentLower = note.content.toLowerCase();

            let score = 0;

            // Higher weight for title matches
            queryWords.forEach(word => {
                if (titleLower.includes(word)) {
                    score += 3;
                }
                if (contentLower.includes(word)) {
                    score += 1;
                }
            });

            // Boost score based on priority
            if (note.priority === 'critical') {
                score *= 1.5;
            } else if (note.priority === 'high') {
                score *= 1.2;
            }

            return { ...note, score };
        });

        // Filter notes with score > 0 and sort by score
        const relevantNotes = scoredNotes
            .filter(note => note.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ score, ...note }) => note);

        return relevantNotes;
    } catch (error) {
        console.error('Error searching knowledge notes:', error);
        return [];
    }
}
