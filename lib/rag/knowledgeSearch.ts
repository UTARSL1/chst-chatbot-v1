import { prisma } from '@/lib/db';
import natural from 'natural';

const stemmer = natural.PorterStemmer;

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
                tags: true,
                updatedAt: true,
                linkedDocuments: {
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        accessLevel: true,
                    },
                },
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

        // Stem query words for better matching (e.g., "apply" matches "application")
        const stemmedQueryWords = queryWords.map(word => stemmer.stem(word));

        console.log(`[KnowledgeSearch] Query: "${query}"`);
        console.log(`[KnowledgeSearch] Query words: [${queryWords.join(', ')}]`);
        console.log(`[KnowledgeSearch] Stemmed query words: [${stemmedQueryWords.join(', ')}]`);

        // Score each note based on keyword matches
        const scoredNotes = notes.map(note => {
            const titleLower = note.title.toLowerCase();
            const contentLower = note.content.toLowerCase();
            const tagsLower = (note.tags || []).map((tag: string) => tag.toLowerCase());

            // Stem title and content words for matching
            const titleWords = titleLower.split(/\s+/).map(w => stemmer.stem(w));
            const contentWords = contentLower.split(/\s+/).map(w => stemmer.stem(w));

            let score = 0;
            let titleMatches = 0;
            let contentMatches = 0;
            let tagMatches = 0;
            const matchedWords: string[] = [];

            // Check each query word (both original and stemmed)
            queryWords.forEach((word, index) => {
                const stemmedWord = stemmedQueryWords[index];

                // Tag match (highest weight - exact match only, no stemming)
                if (tagsLower.includes(word)) {
                    score += 10;
                    tagMatches++;
                    matchedWords.push(`TAG:${word}`);
                }

                // Title match (high weight) - use stemmed words
                if (titleWords.includes(stemmedWord)) {
                    score += 3;
                    titleMatches++;
                    matchedWords.push(`T:${word}→${stemmedWord}`);
                }

                // Content match (base weight) - use stemmed words
                if (contentWords.includes(stemmedWord)) {
                    score += 1;
                    contentMatches++;
                    matchedWords.push(`C:${word}→${stemmedWord}`);
                }
            });

            // Boost score based on priority
            if (note.priority === 'critical') {
                score *= 1.5;
            } else if (note.priority === 'high') {
                score *= 1.2;
            }

            // Debug logging
            console.log(`[KnowledgeSearch] "${note.title}": score=${score.toFixed(1)}, tagMatches=${tagMatches}, titleMatches=${titleMatches}, contentMatches=${contentMatches}, matched=[${matchedWords.join(', ')}]`);

            return { ...note, score, titleMatches, contentMatches, tagMatches };
        });

        // Filter notes with meaningful relevance:
        // - Require at least 2 title matches (strong title relevance) OR
        // - Require score >= 6 (at least 2 title matches or 6 content matches)
        // This prevents weak matches like single word "conference" from being included
        const relevantNotes = scoredNotes
            .filter(note => {
                const isRelevant = note.titleMatches >= 2 || note.score >= 6;
                console.log(`[KnowledgeSearch] "${note.title}": ${isRelevant ? 'INCLUDED' : 'FILTERED OUT'} (tagMatches=${note.tagMatches}, titleMatches=${note.titleMatches}, score=${note.score})`);
                return isRelevant;
            })
            .sort((a, b) => {
                // Primary: Score (descending)
                if (b.score !== a.score) return b.score - a.score;

                // Tie-breaker 1: Tag matches (exact tag match = strongest signal)
                if (b.tagMatches !== a.tagMatches) return b.tagMatches - a.tagMatches;

                // Tie-breaker 2: Title matches (more title matches = more relevant)
                if (b.titleMatches !== a.titleMatches) return b.titleMatches - a.titleMatches;

                // Tie-breaker 3: Priority
                const priorityOrder: { [key: string]: number } = { critical: 3, high: 2, standard: 1 };
                const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                if (priorityDiff !== 0) return priorityDiff;

                // Tie-breaker 4: Most recently updated
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            })
            .slice(0, limit)
            .map(({ score, titleMatches, contentMatches, tagMatches, ...note }) => note);

        return relevantNotes;
    } catch (error) {
        console.error('Error searching knowledge notes:', error);
        return [];
    }
}
