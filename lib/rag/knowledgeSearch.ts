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
            let titleMatches = 0;
            let contentMatches = 0;
            const matchedWords: string[] = [];

            // Higher weight for title matches
            queryWords.forEach(word => {
                if (titleLower.includes(word)) {
                    score += 3;
                    titleMatches++;
                    matchedWords.push(`T:${word}`);
                }
                if (contentLower.includes(word)) {
                    score += 1;
                    contentMatches++;
                    matchedWords.push(`C:${word}`);
                }
            });

            // Boost score based on priority
            if (note.priority === 'critical') {
                score *= 1.5;
            } else if (note.priority === 'high') {
                score *= 1.2;
            }

            // Debug logging
            console.log(`[KnowledgeSearch] "${note.title}": score=${score}, titleMatches=${titleMatches}, contentMatches=${contentMatches}, matched=[${matchedWords.join(', ')}]`);

            return { ...note, score, titleMatches, contentMatches };
        });

        // Filter notes with meaningful relevance:
        // - Require at least 1 title match OR
        // - Require score >= 3 (at least 3 content matches or 1 title match)
        const relevantNotes = scoredNotes
            .filter(note => {
                const isRelevant = note.titleMatches > 0 || note.score >= 3;
                console.log(`[KnowledgeSearch] "${note.title}": ${isRelevant ? 'INCLUDED' : 'FILTERED OUT'} (titleMatches=${note.titleMatches}, score=${note.score})`);
                return isRelevant;
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ score, titleMatches, contentMatches, ...note }) => note);

        return relevantNotes;
    } catch (error) {
        console.error('Error searching knowledge notes:', error);
        return [];
    }
}
